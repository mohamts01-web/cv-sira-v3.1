import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3"
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function verifyJWT(req: Request): Promise<{ sub: string } | null> {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.replace("Bearer ", "")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!

  try {
    const [headerB64] = token.split(".")
    const headerJson = JSON.parse(atob(headerB64))

    const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`
    const jwksResponse = await fetch(jwksUrl)
    if (!jwksResponse.ok) {
      console.error("Failed to fetch JWKS:", jwksResponse.status, await jwksResponse.text())
      return null
    }
    const jwks = await jwksResponse.json()

    const signingKey = jwks.keys.find(
      (k: { kid: string; alg: string; use: string }) =>
        k.alg === headerJson.alg && k.use === "sig"
    )
    if (!signingKey) {
      console.error("No matching key found for alg:", headerJson.alg, "keys:", JSON.stringify(jwks.keys.map((k: { kid: string; alg: string }) => ({ kid: k.kid, alg: k.alg }))))
      return null
    }

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      signingKey,
      { name: "ECDSA", namedCurve: signingKey.crv || "P-256" },
      false,
      ["verify"]
    )

    const signatureInput = token.split(".").slice(0, 2).join(".")
    const signatureB64 = token.split(".")[2]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
    const signatureBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0))

    const encoder = new TextEncoder()
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      signatureBytes,
      encoder.encode(signatureInput)
    )

    if (!isValid) {
      console.error("JWT signature verification failed")
      return null
    }

    const payloadB64 = token.split(".")[1]
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")))

    if (payload.iss !== supabaseUrl) {
      console.error("Invalid issuer:", payload.iss, "expected:", supabaseUrl)
      return null
    }

    if (payload.role !== "authenticated") {
      console.error("Invalid role:", payload.role)
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.error("Token expired at:", payload.exp, "now:", now)
      return null
    }

    return { sub: payload.sub as string }
  } catch (e) {
    console.error("JWT verification failed:", e?.message || e)
    return null
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const user = await verifyJWT(req)
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const body = await req.json()
    const { fileName, contentType, userId, tenantId } = body

    if (!fileName || !contentType || !userId || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: fileName, contentType, userId, tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (userId !== user.sub) {
      return new Response(
        JSON.stringify({ error: "userId does not match authenticated user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")
    const accessKey = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY")
    const secretKey = Deno.env.get("CLOUDFLARE_R2_SECRET_KEY")
    const bucket = Deno.env.get("CLOUDFLARE_R2_BUCKET")

    if (!accountId || !accessKey || !secretKey || !bucket) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing R2 credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const timestamp = Date.now()
    const key = `${tenantId}/${userId}/${timestamp}-${sanitizedFileName}`

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    })

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 })

    return new Response(
      JSON.stringify({ uploadUrl, key }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error generating upload URL:", error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
