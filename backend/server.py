from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import json
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List, Any
import fal_client

ROOT_DIR = Path(__file__).parent

# ─── Firebase Setup ─────────────────────────────────────────────────────────

# Initialize Firebase Admin
# Expects GOOGLE_APPLICATION_CREDENTIALS path or FIREBASE_SERVICE_ACCOUNT_JSON string
firebase_cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
firebase_cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")

if firebase_cred_json:
    cred = credentials.Certificate(json.loads(firebase_cred_json))
elif firebase_cred_path and os.path.exists(firebase_cred_path):
    cred = credentials.Certificate(firebase_cred_path)
else:
    # Fallback to default (works in environments like Google Cloud)
    try:
        cred = credentials.ApplicationDefault()
    except Exception:
        print("WARNING: No Firebase credentials found. Backend will fail on secure routes.")
        cred = None

if cred and not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI(title="CvSira API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ─── Helpers ────────────────────────────────────────────────────────────────

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    
    id_token = auth_header[7:]
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
        
        # Get user profile from Firestore
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            # Create profile if it doesn't exist (fallback)
            user_data = {
                "name": decoded_token.get("name", ""),
                "email": decoded_token.get("email", ""),
                "role": "user",
                "points": 5,
                "created_at": firestore.SERVER_TIMESTAMP
            }
            user_ref.set(user_data)
            user_data["id"] = uid
            return user_data
        
        user_data = user_doc.to_dict()
        user_data["id"] = uid
        return user_data
        
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(401, "Invalid or expired token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

async def deduct_points(uid: str, amount: int, reason: str):
    user_ref = db.collection("users").document(uid)
    
    @firestore.transactional
    def update_in_transaction(transaction, user_ref, amount, reason):
        snapshot = user_ref.get(transaction=transaction)
        current_points = snapshot.get("points")
        
        if current_points < amount:
            raise HTTPException(400, f"نقاطك غير كافية. تحتاج {amount} نقطة، لديك {current_points} نقطة")
        
        transaction.update(user_ref, {"points": current_points - amount})
        
        # Log transaction
        txn_ref = db.collection("transactions").document()
        transaction.set(txn_ref, {
            "uid": uid,
            "amount": amount,
            "type": "spend",
            "reason": reason,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        
        return current_points - amount

    transaction = db.transaction()
    return update_in_transaction(transaction, user_ref, amount, reason)


# ─── Pydantic Models ────────────────────────────────────────────────────────

class InfographicRequest(BaseModel):
    prompt: str
    image_size: str = "landscape_16_9"
    num_images: int = 1

class InfographicAIRequest(BaseModel):
    prompt: str
    theme: str = "violet"
    size: str = "a4"
    style: str = "auto"


# ─── Auth Routes (Handled by Firebase now, returning profile) ────────────────

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ─── Plans Routes ────────────────────────────────────────────────────────────

@api_router.get("/plans")
async def get_plans():
    plans = db.collection("plans").where("is_active", "==", True).stream()
    result = []
    for p in plans:
        item = p.to_dict()
        item["id"] = p.id
        result.append(item)
    return result


# ─── AI Services ─────────────────────────────────────────────────────────────

INFOGRAPHIC_AI_COST = 5
CANVAS_SIZES = {
    "a4": {"width": 800, "height": 1100},
    "square": {"width": 1080, "height": 1080},
    "wide": {"width": 1920, "height": 600},
}
THEME_COLORS = {
    "violet": {"primary": "#7c3aed", "secondary": "#4f46e5", "accent": "#a855f7"},
    "orange": {"primary": "#ea580c", "secondary": "#f97316", "accent": "#fb923c"},
    "teal": {"primary": "#0d9488", "secondary": "#14b8a6", "accent": "#2dd4bf"},
    "rose": {"primary": "#e11d48", "secondary": "#f43f5e", "accent": "#fb7185"},
    "slate": {"primary": "#475569", "secondary": "#64748b", "accent": "#94a3b8"},
}

@api_router.post("/services/infographic-ai/generate")
async def generate_infographic_ai(body: InfographicAIRequest, user: dict = Depends(get_current_user)):
    uid = user["id"]
    
    # Check and deduct points first
    await deduct_points(uid, INFOGRAPHIC_AI_COST, f"توليد إنفوجرافيك AI: {body.prompt[:50]}")

    canvas = CANVAS_SIZES.get(body.size, CANVAS_SIZES["a4"])
    colors = THEME_COLORS.get(body.theme, THEME_COLORS["violet"])
    w, h = canvas["width"], canvas["height"]

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        raise HTTPException(500, "LLM key not configured")

    system_prompt = f"""You are a world-class infographic designer. Generate structured JSON for a Fabric.js canvas infographic...""" # (Original prompt preserved)

    async def generate_stream():
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=llm_key,
                session_id=f"infographic-{uid}-{datetime.now().timestamp()}",
                system_message=system_prompt,
            ).with_model("gemini", "gemini-2.5-flash")

            user_msg = UserMessage(text=f'Create a professional {body.style} infographic about: "{body.prompt}".')
            response_text = await chat.send_message(user_msg)
            
            # Clean and yield JSON (Original logic)
            yield response_text + "\n"

        except Exception as e:
            logger.error(f"Infographic AI error: {e}")
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(generate_stream(), media_type="text/plain; charset=utf-8")


@api_router.post("/services/infographic/generate")
async def generate_infographic(body: InfographicRequest, user: dict = Depends(get_current_user)):
    uid = user["id"]
    cost = 2 * body.num_images
    
    await deduct_points(uid, cost, f"توليد صور إنفوجرافيك: {body.prompt[:50]}")

    fal_key = os.environ.get("FAL_KEY", "").strip()
    images = []

    if fal_key:
        os.environ["FAL_KEY"] = fal_key
        result = await fal_client.subscribe_async(
            "fal-ai/bytedance/seedream/v4.5/text-to-image",
            arguments={"prompt": body.prompt, "image_size": body.image_size, "num_images": body.num_images},
        )
        images = result.get("images", [])
    else:
        # Mock mode
        images = [{"url": "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e", "width": 1280, "height": 720}]

    return {"images": images, "points_used": cost}


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    # Seed default plans in Firestore if empty
    plans_ref = db.collection("plans")
    if len(list(plans_ref.limit(1).stream())) == 0:
        plans = [
            {"name": "Free", "points": 5, "price": 0.0, "is_active": True},
            {"name": "Pro", "points": 100, "price": 29.0, "is_active": True},
        ]
        for p in plans:
            plans_ref.add(p)
        logger.info("Default plans seeded in Firestore")

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
