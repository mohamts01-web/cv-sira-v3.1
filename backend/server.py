from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import fal_client
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any

ROOT_DIR = Path(__file__).parent

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="CvSira API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ─── Helpers ────────────────────────────────────────────────────────────────

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(hours=24),
               "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id,
               "exp": datetime.now(timezone.utc) + timedelta(days=7),
               "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    is_secure = os.environ.get("FRONTEND_URL", "").startswith("https")
    response.set_cookie("access_token", access_token, httponly=True, secure=is_secure, samesite="none" if is_secure else "lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=is_secure, samesite="none" if is_secure else "lax", max_age=604800, path="/")

def user_to_dict(user: dict) -> dict:
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user_to_dict(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


# ─── Pydantic Models ────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class InfographicRequest(BaseModel):
    prompt: str
    image_size: str = "landscape_16_9"
    num_images: int = 1

class PlanCreate(BaseModel):
    name: str
    points: int
    price: float
    features: list[str] = []
    is_active: bool = True

class UpdateUserPlan(BaseModel):
    plan_id: str
    points: int


# ─── Auth Routes ─────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    # Default free plan
    free_plan = await db.plans.find_one({"name": "Free"}) or {}
    user_doc = {
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "user",
        "plan_id": str(free_plan.get("_id", "")),
        "plan_name": free_plan.get("name", "Free"),
        "points": free_plan.get("points", 5),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    access_token = create_access_token(str(result.inserted_id), email)
    refresh_token = create_refresh_token(str(result.inserted_id))
    set_auth_cookies(response, access_token, refresh_token)

    return user_to_dict(user_doc)


@api_router.post("/auth/login")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force check
    attempts_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempts_doc and attempts_doc.get("count", 0) >= 5:
        lockout_until = attempts_doc.get("lockout_until")
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"lockout_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True
        )
        raise HTTPException(401, "Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    access_token = create_access_token(str(user["_id"]), email)
    refresh_token = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access_token, refresh_token)
    return user_to_dict(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    is_secure = os.environ.get("FRONTEND_URL", "").startswith("https")
    same = "none" if is_secure else "lax"
    response.delete_cookie("access_token", path="/", samesite=same, secure=is_secure)
    response.delete_cookie("refresh_token", path="/", samesite=same, secure=is_secure)
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(request: Request):
    return await get_current_user(request)


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        new_access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", new_access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")


# ─── User Routes ─────────────────────────────────────────────────────────────

@api_router.get("/user/profile")
async def get_profile(request: Request):
    return await get_current_user(request)


# ─── Plans Routes ────────────────────────────────────────────────────────────

@api_router.get("/plans")
async def get_plans():
    plans = await db.plans.find({"is_active": True}).to_list(100)
    for p in plans:
        p["id"] = str(p.pop("_id"))
    return plans


class InfographicAIRequest(BaseModel):
    prompt: str
    theme: str = "violet"
    size: str = "a4"
    style: str = "auto"


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

INFOGRAPHIC_AI_COST = 5  # points per generation


@api_router.post("/services/infographic-ai/generate")
async def generate_infographic_ai(body: InfographicAIRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["id"]

    db_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not db_user:
        raise HTTPException(404, "User not found")

    current_points = db_user.get("points", 0)
    if current_points < INFOGRAPHIC_AI_COST:
        raise HTTPException(400, f"نقاطك غير كافية. تحتاج {INFOGRAPHIC_AI_COST} نقطة، لديك {current_points} نقطة")

    canvas = CANVAS_SIZES.get(body.size, CANVAS_SIZES["a4"])
    colors = THEME_COLORS.get(body.theme, THEME_COLORS["violet"])
    w, h = canvas["width"], canvas["height"]

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        raise HTTPException(500, "LLM key not configured")

    system_prompt = f"""You are a world-class infographic designer. Generate structured JSON for a Fabric.js canvas infographic.

CANVAS: {w}×{h}px
COLORS: Primary {colors['primary']}, Secondary {colors['secondary']}, Accent {colors['accent']}
THEME: {body.theme}, STYLE: {body.style}, SIZE: {body.size}

RULES:
1. Return ONLY valid JSON matching the schema below - no markdown, no explanations
2. elements array sorted by zIndex ascending
3. Start with full-canvas background rect at zIndex 0
4. 30-55 elements total
5. Include real facts and statistics
6. Use null for unused stroke/strokeWidth
7. All coordinates within canvas bounds (0 to {w} x, 0 to {h} y)

SCHEMA:
{{
  "canvasWidth": number,
  "canvasHeight": number,
  "background": "#hexcolor",
  "elements": [
    {{"type":"rect","id":"unique","x":0,"y":0,"width":{w},"height":{h},"fill":"#color","rx":0,"opacity":1,"stroke":null,"strokeWidth":null,"zIndex":0}},
    {{"type":"circle","id":"unique","x":100,"y":100,"radius":50,"fill":"#color","opacity":1,"stroke":null,"strokeWidth":null,"zIndex":1}},
    {{"type":"text","id":"unique","x":50,"y":50,"text":"Title","fontSize":32,"fontWeight":"bold","fontFamily":"Arial","fill":"#color","textAlign":"center","width":700,"opacity":1,"zIndex":2}},
    {{"type":"stat","id":"unique","x":50,"y":200,"width":180,"height":80,"value":"95%","label":"Success Rate","valueFill":"#color","labelFill":"#color","bgFill":"#color","rx":12,"zIndex":3}},
    {{"type":"icon","id":"unique","x":100,"y":300,"emoji":"🚀","emojiSize":32,"bgFill":"#color","bgRadius":30,"zIndex":4}},
    {{"type":"line","id":"unique","x1":50,"y1":400,"x2":750,"y2":400,"stroke":"#color","strokeWidth":2,"dashed":false,"zIndex":5}}
  ]
}}"""

    async def generate_stream():
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=llm_key,
                session_id=f"infographic-{user_id}-{datetime.now().timestamp()}",
                system_message=system_prompt,
            ).with_model("gemini", "gemini-2.5-flash")

            user_msg = UserMessage(
                text=f'Create a professional {body.style} style infographic about: "{body.prompt}". Canvas: {w}x{h}px. Return ONLY the JSON object.'
            )

            response_text = await chat.send_message(user_msg)

            # Clean response - remove markdown if present
            text = response_text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            # Parse and validate basic structure
            data = json.loads(text)
            if "elements" not in data:
                raise ValueError("Invalid response structure")

            # Deduct points
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"points": -INFOGRAPHIC_AI_COST}}
            )

            # Log usage
            await db.service_usage.insert_one({
                "user_id": user_id,
                "service": "infographic-ai",
                "prompt": body.prompt,
                "points_used": INFOGRAPHIC_AI_COST,
                "created_at": datetime.now(timezone.utc),
            })

            # Stream as NDJSON (send full object as one chunk, then done)
            yield json.dumps(data) + "\n"

        except json.JSONDecodeError as e:
            yield json.dumps({"error": f"Failed to parse AI response: {str(e)}"}) + "\n"
        except Exception as e:
            logger.error(f"Infographic AI error: {e}")
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain; charset=utf-8",
        headers={"Transfer-Encoding": "chunked"}
    )



    prompt: str
    image_size: str = "landscape_16_9"
    num_images: int = 1


# ─── Services Routes ─────────────────────────────────────────────────────────

POINTS_PER_IMAGE = 2

# Mock placeholder images for demo (when no FAL_KEY is set)
MOCK_IMAGES = [
    {"url": "https://images.unsplash.com/photo-1735471828697-b8d8abd8f84f?w=1280&h=720&fit=crop", "width": 1280, "height": 720},
    {"url": "https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1280&h=720&fit=crop", "width": 1280, "height": 720},
    {"url": "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1280&h=720&fit=crop", "width": 1280, "height": 720},
    {"url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1280&h=720&fit=crop", "width": 1280, "height": 720},
]


@api_router.post("/services/infographic/generate")
async def generate_infographic(body: InfographicRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["id"]

    cost = POINTS_PER_IMAGE * body.num_images

    # Check points
    db_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not db_user:
        raise HTTPException(404, "User not found")
    current_points = db_user.get("points", 0)
    if current_points < cost:
        raise HTTPException(400, f"نقاطك غير كافية. تحتاج {cost} نقطة، لديك {current_points} نقطة")

    fal_key = os.environ.get("FAL_KEY", "").strip()

    if fal_key:
        # Real fal.ai generation
        try:
            os.environ["FAL_KEY"] = fal_key
            result = await fal_client.subscribe_async(
                "fal-ai/bytedance/seedream/v4.5/text-to-image",
                arguments={
                    "prompt": body.prompt,
                    "image_size": body.image_size,
                    "num_images": body.num_images,
                },
            )
            images = result.get("images", [])
        except Exception as e:
            raise HTTPException(500, f"خطأ في توليد الصورة: {str(e)}")
    else:
        # Mock mode - return placeholder images
        import random
        images = random.sample(MOCK_IMAGES, min(body.num_images, len(MOCK_IMAGES)))

    # Deduct points
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"points": -cost}}
    )

    # Log usage
    await db.service_usage.insert_one({
        "user_id": user_id,
        "service": "infographic",
        "prompt": body.prompt,
        "num_images": body.num_images,
        "points_used": cost,
        "mock_mode": not bool(fal_key),
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "images": images,
        "points_used": cost,
        "remaining_points": current_points - cost,
        "mock_mode": not bool(fal_key),
    }


@api_router.get("/services/infographic/history")
async def get_infographic_history(request: Request):
    user = await get_current_user(request)
    history = await db.service_usage.find(
        {"user_id": user["id"], "service": "infographic"},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return history


# ─── Admin Routes ────────────────────────────────────────────────────────────

@api_router.get("/admin/users")
async def admin_get_users(request: Request):
    await require_admin(request)
    users = await db.users.find({}, {"password_hash": 0}).to_list(500)
    for u in users:
        u["id"] = str(u.pop("_id"))
    return users


@api_router.put("/admin/users/{user_id}/plan")
async def admin_update_user_plan(user_id: str, body: UpdateUserPlan, request: Request):
    await require_admin(request)
    plan = await db.plans.find_one({"_id": ObjectId(body.plan_id)})
    if not plan:
        raise HTTPException(404, "Plan not found")
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"plan_id": body.plan_id, "plan_name": plan["name"], "points": body.points}}
    )
    return {"message": "User plan updated"}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    await require_admin(request)
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"message": "User deleted"}


@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    total_users = await db.users.count_documents({"role": "user"})
    total_plans = await db.plans.count_documents({"is_active": True})
    return {"total_users": total_users, "total_plans": total_plans}


@api_router.post("/admin/plans")
async def admin_create_plan(body: PlanCreate, request: Request):
    await require_admin(request)
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.plans.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(plan_id: str, request: Request):
    await require_admin(request)
    result = await db.plans.delete_one({"_id": ObjectId(plan_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Plan not found")
    return {"message": "Plan deleted"}


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")

    # Seed default plans
    if await db.plans.count_documents({}) == 0:
        plans = [
            {"name": "Free", "points": 5, "price": 0.0, "features": ["5 نقاط مجانية", "وصول أساسي"], "is_active": True},
            {"name": "Pro", "points": 100, "price": 29.0, "features": ["100 نقطة شهرياً", "جميع الخدمات", "دعم متميز"], "is_active": True},
            {"name": "Enterprise", "points": 500, "price": 99.0, "features": ["500 نقطة شهرياً", "جميع الخدمات", "API مخصص", "دعم 24/7"], "is_active": True},
        ]
        await db.plans.insert_many(plans)
        logger.info("Default plans seeded")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@cvsira.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@2025")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "name": "Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "plan_name": "Admin",
            "points": 9999,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(f"""# CvSira Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User (create manually via /signup)
- Email: test@cvsira.com
- Password: Test@2025
- Role: user

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/refresh

## Admin Endpoints
- GET  /api/admin/users
- GET  /api/admin/stats
- POST /api/admin/plans
- PUT  /api/admin/users/:id/plan
- DELETE /api/admin/users/:id
""")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
