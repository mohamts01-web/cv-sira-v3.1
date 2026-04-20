import { fal } from "@fal-ai/client"

export const maxDuration = 60

fal.config({ credentials: process.env.FAL_KEY })

interface GenerateRequest {
  prompt: string
  style: string
  background: string
  lighting: string
  pose: string
  aspectRatio: string
  referenceImage?: string
}

export async function POST(req: Request) {
  const body = (await req.json()) as GenerateRequest
  const { prompt, style, background, lighting, pose, aspectRatio, referenceImage } = body

  if (!prompt) {
    return Response.json({ error: "الوصف مطلوب" }, { status: 400 })
  }

  const sizeMap: Record<string, string> = {
    "1:1": "square",
    "4:5": "portrait_4_5",
    "16:9": "landscape_16_9",
    "9:16": "portrait_9_16",
  }

  if (!process.env.FAL_KEY) {
    const mockImages = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&h=800&fit=crop",
    ]
    const imageUrl = mockImages[Math.floor(Math.random() * mockImages.length)]
    return Response.json({ imageUrl, prompt })
  }

  const fullPrompt = `Professional portrait photo: ${prompt}. Style: ${style}. Background: ${background}. Lighting: ${lighting}. Pose: ${pose}. High quality, professional photography, detailed face, sharp focus.`

  const imageSize = sizeMap[aspectRatio] || "square"

  let uploadedImageUrl: string | undefined
  if (referenceImage) {
    const uploadRes = await fal.storage.upload(new Blob([Buffer.from(referenceImage.split(",")[1], "base64")], { type: "image/png" }))
    uploadedImageUrl = uploadRes as string
  }

  const input: Record<string, unknown> = {
    prompt: fullPrompt,
    image_size: imageSize,
    num_images: 1,
  }

  if (uploadedImageUrl) {
    input.image_url = uploadedImageUrl
  }

  const result = (await fal.subscribe("fal-ai/flux/dev", { input })) as { images: { url: string }[] }

  const imageUrl = result.images?.[0]?.url

  if (!imageUrl) {
    return Response.json({ error: "لم يتم توليد صورة. جرب وصفاً مختلفاً." }, { status: 500 })
  }

  return Response.json({ imageUrl, prompt })
}
