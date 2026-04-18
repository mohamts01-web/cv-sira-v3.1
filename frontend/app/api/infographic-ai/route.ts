import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || ""

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Forward cookies for auth
  const cookies = req.headers.get("cookie") || ""

  const body = await req.json()

  const res = await fetch(`${BACKEND}/api/services/infographic-ai/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Generation failed" }))
    return NextResponse.json({ error: err.detail || "Failed" }, { status: res.status })
  }

  // Pass stream through
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  })
}
