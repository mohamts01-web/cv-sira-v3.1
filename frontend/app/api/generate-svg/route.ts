import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

export const maxDuration = 60

export async function POST(req: Request) {
  const { prompt, mode = "static", aspectRatio = "1:1" } = await req.json()

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    const mockSvg = generateMockSvg(prompt, aspectRatio)
    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          const chunks = mockSvg.match(/.{1,20}/g) || []
          let i = 0
          const interval = setInterval(() => {
            if (i < chunks.length) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunks[i])}\n\n`))
              i++
            } else {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              clearInterval(interval)
              controller.close()
            }
          }, 50)
        },
      }),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } },
    )
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  })

  const systemPrompt = `You are a world-class SVG designer. You create clean, modern, scalable SVG artwork.

Rules:
- Return ONLY the SVG code. No explanations, no markdown, no comments.
- The SVG must be valid and self-contained.
- Use a viewBox of "0 0 800 800" for 1:1, "0 0 800 450" for 16:9, "0 0 800 600" for 4:3, "0 0 450 800" for 9:16.
- Use modern design principles: gradients, clean shapes, good color harmony.
- Do NOT use external resources, images, or fonts.
- Use inline styles or <style> tags if needed.
${mode === "animated" ? "- Add CSS animations (within <style> tags) for smooth, tasteful animations. Use @keyframes. Make it visually appealing." : "- Do NOT add any animations. Static only."}
- Optimize paths and shapes for clean rendering.
- Ensure the SVG renders correctly in a browser.`

  const result = streamText({
    model: openai("openai/gpt-4o-mini"),
    system: systemPrompt,
    prompt: `Create an SVG illustration: ${prompt}`,
  })

  return result.toDataStreamResponse()
}

function generateMockSvg(prompt: string, aspectRatio: string): string {
  const colors = [
    ["#667eea", "#764ba2"],
    ["#f093fb", "#f5576c"],
    ["#4facfe", "#00f2fe"],
    ["#43e97b", "#38f9d7"],
    ["#fa709a", "#fee140"],
    ["#a18cd1", "#fbc2eb"],
    ["#fccb90", "#d57eeb"],
    ["#e0c3fc", "#8ec5fc"],
  ]
  const pair = colors[Math.floor(Math.random() * colors.length)]
  const viewboxes: Record<string, string> = { "1:1": "0 0 800 800", "16:9": "0 0 800 450", "4:3": "0 0 800 600", "9:16": "0 0 450 800" }
  const vb = viewboxes[aspectRatio] || viewboxes["1:1"]
  const cx = aspectRatio === "9:16" ? 225 : 400
  const cy = aspectRatio === "9:16" ? 400 : aspectRatio === "16:9" ? 225 : 400
  const r = aspectRatio === "16:9" ? 140 : aspectRatio === "9:16" ? 140 : 180

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${pair[0]}"/>
      <stop offset="100%" stop-color="${pair[1]}"/>
    </linearGradient>
    <linearGradient id="shape" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.3)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.1)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#shape)"/>
  <circle cx="${cx - r * 0.6}" cy="${cy - r * 0.5}" r="${r * 0.3}" fill="rgba(255,255,255,0.15)"/>
  <circle cx="${cx + r * 0.5}" cy="${cy + r * 0.4}" r="${r * 0.25}" fill="rgba(255,255,255,0.1)"/>
  <rect x="${cx - 80}" y="${cy + r + 30}" width="160" height="8" rx="4" fill="rgba(255,255,255,0.4)"/>
  <rect x="${cx - 50}" y="${cy + r + 48}" width="100" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="white" font-size="28" font-family="system-ui, sans-serif" font-weight="700">${prompt.length > 24 ? prompt.slice(0, 24) + "…" : prompt}</text>
</svg>`
}
