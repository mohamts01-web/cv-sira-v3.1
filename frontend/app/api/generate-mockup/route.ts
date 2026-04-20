import { fal } from "@fal-ai/client"

export const maxDuration = 60

interface ReferenceImageInput {
  base64: string
  mimeType: string
}

interface FalImage {
  url: string
  content_type?: string
  width?: number
  height?: number
}

interface FalResult {
  images: FalImage[]
}

fal.config({ credentials: process.env.FAL_KEY })

export async function POST(req: Request) {
  const { prompt, referenceImages = [] } = (await req.json()) as {
    prompt: string
    referenceImages: ReferenceImageInput[]
  }

  if (!prompt) {
    return Response.json({ error: "الوصف مطلوب" }, { status: 400 })
  }

  if (!process.env.FAL_KEY) {
    const mockImages = [
      "https://images.unsplash.com/photo-1735471828697-b8d8abd8f84f?w=1280&h=720&fit=crop",
      "https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1280&h=720&fit=crop",
      "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1280&h=720&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1280&h=720&fit=crop",
    ]
    const imageUrl = mockImages[Math.floor(Math.random() * mockImages.length)]
    return Response.json({ imageUrl, prompt })
  }

  const hasRefs = referenceImages.length > 0

  const textPrompt = `Create a high-quality UI screenshot of the following interface.
Interface description: ${prompt}.${hasRefs ? `\nUse the provided reference image${referenceImages.length > 1 ? "s" : ""} for visual inspiration — adapt the layout, color palette, and component style to match the described interface.` : ""}
Requirements:
- Photorealistic polished product screenshot
- Realistic UI elements: navigation, buttons, cards, typography, content
- High fidelity, professional design quality
- Proper spacing and layout hierarchy
- No device frames or borders — just the raw interface`

  let result: { data: FalResult }

  if (hasRefs) {
    const imageUrls = referenceImages.map(
      (img) => `data:${img.mimeType};base64,${img.base64}`
    )
    result = (await fal.subscribe("fal-ai/bytedance/seedream/v4.5/edit", {
      input: {
        prompt: textPrompt,
        image_urls: imageUrls,
        image_size: "landscape_16_9",
        num_images: 1,
      },
    })) as { data: FalResult }
  } else {
    result = (await fal.subscribe("fal-ai/bytedance/seedream/v4.5/text-to-image", {
      input: {
        prompt: textPrompt,
        image_size: "landscape_16_9",
        num_images: 1,
      },
    })) as { data: FalResult }
  }

  const imageUrl = result.data?.images?.[0]?.url

  if (!imageUrl) {
    return Response.json({ error: "لم يتم توليد صورة. جرب وصفاً مختلفاً." }, { status: 500 })
  }

  return Response.json({ imageUrl, prompt })
}
