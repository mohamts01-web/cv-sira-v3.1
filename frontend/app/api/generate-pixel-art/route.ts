import { NextRequest, NextResponse } from "next/server"

const FAL_KEY = process.env.FAL_KEY

function base64ToBuffer(base64String: string): { buffer: Buffer; mimeType: string } {
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string")
  }
  return {
    buffer: Buffer.from(matches[2], "base64"),
    mimeType: matches[1],
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64 } = body

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 })
    }

    if (!FAL_KEY) {
      const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="#1a1a2e"/>
        <rect x="40" y="60" width="16" height="16" fill="#e2e8f0" opacity="0.8"/>
        <rect x="72" y="44" width="16" height="16" fill="#e2e8f0" opacity="0.9"/>
        <rect x="104" y="36" width="16" height="16" fill="#e2e8f0" opacity="0.85"/>
        <rect x="136" y="36" width="16" height="16" fill="#e2e8f0" opacity="0.9"/>
        <rect x="168" y="44" width="16" height="16" fill="#e2e8f0" opacity="0.85"/>
        <rect x="200" y="60" width="16" height="16" fill="#e2e8f0" opacity="0.8"/>
        <rect x="56" y="76" width="16" height="16" fill="#cbd5e1" opacity="0.9"/>
        <rect x="88" y="60" width="16" height="16" fill="#f1f5f9" opacity="0.95"/>
        <rect x="120" y="52" width="16" height="16" fill="#f1f5f9"/>
        <rect x="152" y="52" width="16" height="16" fill="#f1f5f9"/>
        <rect x="184" y="60" width="16" height="16" fill="#cbd5e1" opacity="0.9"/>
        <rect x="72" y="92" width="16" height="16" fill="#e2e8f0"/>
        <rect x="104" y="76" width="16" height="16" fill="#f1f5f9"/>
        <rect x="136" y="76" width="16" height="16" fill="#f1f5f9"/>
        <rect x="168" y="92" width="16" height="16" fill="#e2e8f0"/>
        <rect x="88" y="108" width="16" height="16" fill="#cbd5e1"/>
        <rect x="120" y="92" width="16" height="16" fill="#f8fafc"/>
        <rect x="152" y="92" width="16" height="16" fill="#f8fafc"/>
        <rect x="184" y="108" width="16" height="16" fill="#cbd5e1"/>
        <rect x="104" y="124" width="16" height="16" fill="#94a3b8"/>
        <rect x="136" y="124" width="16" height="16" fill="#94a3b8"/>
        <rect x="88" y="140" width="16" height="16" fill="#cbd5e1"/>
        <rect x="120" y="140" width="16" height="16" fill="#e2e8f0"/>
        <rect x="152" y="140" width="16" height="16" fill="#e2e8f0"/>
        <rect x="184" y="140" width="16" height="16" fill="#cbd5e1"/>
        <rect x="72" y="156" width="16" height="16" fill="#94a3b8"/>
        <rect x="104" y="156" width="16" height="16" fill="#64748b"/>
        <rect x="136" y="156" width="16" height="16" fill="#64748b"/>
        <rect x="168" y="156" width="16" height="16" fill="#94a3b8"/>
        <rect x="56" y="172" width="16" height="16" fill="#94a3b8" opacity="0.8"/>
        <rect x="88" y="172" width="16" height="16" fill="#475569"/>
        <rect x="120" y="172" width="16" height="16" fill="#475569"/>
        <rect x="152" y="172" width="16" height="16" fill="#475569"/>
        <rect x="184" y="172" width="16" height="16" fill="#475569"/>
        <rect x="200" y="172" width="16" height="16" fill="#94a3b8" opacity="0.8"/>
        <text x="128" y="220" text-anchor="middle" fill="#64748b" font-size="12" font-family="monospace">MOCK PIXEL ART</text>
      </svg>`
      const mockBase64 = `data:image/svg+xml;base64,${Buffer.from(mockSvg).toString("base64")}`
      return NextResponse.json({
        imageUrl: mockBase64,
        requestId: `mock-${Date.now()}`,
      })
    }

    const { buffer } = base64ToBuffer(imageBase64)
    const formData = new FormData()
    formData.append("file", new Blob([buffer], { type: "image/jpeg" }), "user-photo.jpg")

    const uploadRes = await fetch("https://fal.run/fal-ai/any/upload", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}` },
      body: formData,
    })

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text()
      console.error("Upload failed:", uploadErr)
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
    }

    const uploadData = await uploadRes.json()
    const uploadedUrl = uploadData.url

    const prompt =
      "8-bit pixel art portrait, chest-up view. Simple solid background for easy cutout. Flat grayscale shading with four tones. Printed, cartoonish, and cute. Preserve facial structure. The character should fit entirely within the frame, without labels or text."

    const resultRes = await fetch("https://queue.fal.run/fal-ai/qwen-image-edit", {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_url: uploadedUrl,
      }),
    })

    if (!resultRes.ok) {
      const errText = await resultRes.text()
      console.error("Generation failed:", errText)
      return NextResponse.json({ error: "Failed to generate pixel art" }, { status: 500 })
    }

    const submitData = await resultRes.json()
    const requestId = submitData.request_id

    let imageUrl: string | null = null
    let attempts = 0
    const maxAttempts = 60

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000))

      const statusRes = await fetch(`https://queue.fal.run/fal-ai/qwen-image-edit/requests/${requestId}/status`, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      })
      const statusData = await statusRes.json()

      if (statusData.status === "COMPLETED") {
        const resultRes2 = await fetch(`https://queue.fal.run/fal-ai/qwen-image-edit/requests/${requestId}`, {
          headers: { Authorization: `Key ${FAL_KEY}` },
        })
        const resultData = await resultRes2.json()

        if (resultData.images && resultData.images.length > 0) {
          imageUrl = resultData.images[0].url
        } else if (resultData.image?.url) {
          imageUrl = resultData.image.url
        }
        break
      } else if (statusData.status === "FAILED") {
        return NextResponse.json({ error: "Generation failed on server" }, { status: 500 })
      }

      attempts++
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Generation timed out" }, { status: 504 })
    }

    let finalImageUrl = imageUrl

    try {
      const bgRes = await fetch("https://queue.fal.run/fal-ai/birefnet/v2", {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: imageUrl }),
      })

      if (bgRes.ok) {
        const bgSubmit = await bgRes.json()
        const bgRequestId = bgSubmit.request_id

        let bgAttempts = 0
        while (bgAttempts < 30) {
          await new Promise((r) => setTimeout(r, 2000))
          const bgStatusRes = await fetch(
            `https://queue.fal.run/fal-ai/birefnet/v2/requests/${bgRequestId}/status`,
            { headers: { Authorization: `Key ${FAL_KEY}` } },
          )
          const bgStatusData = await bgStatusRes.json()

          if (bgStatusData.status === "COMPLETED") {
            const bgResultRes = await fetch(
              `https://queue.fal.run/fal-ai/birefnet/v2/requests/${bgRequestId}`,
              { headers: { Authorization: `Key ${FAL_KEY}` } },
            )
            const bgResultData = await bgResultRes.json()
            if (bgResultData.image?.url) {
              finalImageUrl = bgResultData.image.url
            }
            break
          } else if (bgStatusData.status === "FAILED") {
            break
          }
          bgAttempts++
        }
      }
    } catch (bgError) {
      console.error("Background removal failed, using original:", bgError)
    }

    return NextResponse.json({
      imageUrl: finalImageUrl,
      requestId: requestId || `gen-${Date.now()}`,
    })
  } catch (error) {
    console.error("Pixel art generation error:", error)
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 },
    )
  }
}
