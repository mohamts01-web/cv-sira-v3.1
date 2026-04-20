export type PixelArtOptions = {
  gridSize: number
  brightness: number
  contrast: number
  removeBg: boolean
  bgThreshold: number
  alphaThreshold: number
  edgeSoftness: number
  palette: string
  outputSize: number
}

export const DEFAULT_PIXEL_OPTIONS: PixelArtOptions = {
  gridSize: 16,
  brightness: 0,
  contrast: 0,
  removeBg: true,
  bgThreshold: 40,
  alphaThreshold: 30,
  edgeSoftness: 50,
  palette: "sketch",
  outputSize: 512,
}

export const PALETTE_PRESETS: Record<string, { label: string; colors: string[] }> = {
  sketch: {
    label: "رسم",
    colors: ["#000000", "#1c1c1c", "#383838", "#555555", "#717171", "#8d8d8d", "#aaaaaa", "#c6c6c6", "#e2e2e2", "#ffffff"],
  },
  grayscale: {
    label: "رمادي",
    colors: ["#000000", "#1a1a2e", "#333355", "#4a4a6a", "#6b6b8a", "#8a8aaa", "#a8a8c0", "#c8c8d8", "#e8e8f0", "#ffffff"],
  },
  blue: {
    label: "أزرق",
    colors: ["#0a1628", "#0f2847", "#153a66", "#1a4d85", "#2060a4", "#2673c3", "#3388d6", "#55a0e0", "#88bbee", "#bbddff"],
  },
  color: {
    label: "ملون",
    colors: [
      "#1a0a0a", "#3d1a1a", "#5c2a2a", "#1a3d1a", "#2a5c2a", "#3d7a3d",
      "#0a1a3d", "#1a2a5c", "#2a3d7a", "#5c3d1a", "#7a5c2a", "#a07830",
      "#8a8a8a", "#a0a0a0", "#c0c0c0", "#e0e0e0", "#f0f0f0", "#ffffff",
    ],
  },
  neon: {
    label: "نيون",
    colors: ["#000000", "#0d0d0d", "#1a0a2e", "#2a0845", "#00ff88", "#00ccff", "#ff00ff", "#ff3366", "#ffff00", "#ffffff"],
  },
  sepia: {
    label: "سيبيا",
    colors: ["#2a1a0a", "#3d2a1a", "#563d25", "#6f5030", "#88633b", "#a17646", "#ba8951", "#d39c5c", "#ecc06e", "#f5deb3"],
  },
  matrix: {
    label: "ماتريكس",
    colors: ["#000000", "#001100", "#002200", "#003300", "#004400", "#006600", "#008800", "#00aa00", "#00cc00", "#00ff00"],
  },
}

function getPixelBrightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function applyBrightnessContrast(data: Uint8ClampedArray, brightness: number, contrast: number) {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128 + brightness))
    data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128 + brightness))
    data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128 + brightness))
  }
}

function removeBackground(
  imageData: ImageData,
  width: number,
  height: number,
  threshold: number,
  edgeSoftness: number,
): ImageData {
  const data = imageData.data
  const edgeBrightnesses: number[] = []

  const edgeStep = Math.max(1, Math.floor(Math.min(width, height) / 32))

  for (let x = 0; x < width; x += edgeStep) {
    for (const y of [0, 1, height - 2, height - 1]) {
      if (y >= 0 && y < height) {
        const i = (y * width + x) * 4
        edgeBrightnesses.push(getPixelBrightness(data[i], data[i + 1], data[i + 2]))
      }
    }
  }
  for (let y = 0; y < height; y += edgeStep) {
    for (const x of [0, 1, width - 2, width - 1]) {
      if (x >= 0 && x < width) {
        const i = (y * width + x) * 4
        edgeBrightnesses.push(getPixelBrightness(data[i], data[i + 1], data[i + 2]))
      }
    }
  }

  if (edgeBrightnesses.length === 0) return imageData

  edgeBrightnesses.sort((a, b) => a - b)
  const medianBrightness = edgeBrightnesses[Math.floor(edgeBrightnesses.length / 2)]

  const softnessFactor = edgeSoftness / 50
  const effectiveThreshold = threshold * softnessFactor

  const result = new ImageData(new Uint8ClampedArray(data), width, height)
  const rData = result.data

  for (let i = 0; i < rData.length; i += 4) {
    const brightness = getPixelBrightness(rData[i], rData[i + 1], rData[i + 2])
    const diff = Math.abs(brightness - medianBrightness)

    if (diff < effectiveThreshold) {
      const alpha = Math.min(255, (diff / effectiveThreshold) * 255 * 2.5)
      rData[i + 3] = Math.round(alpha)
    }
  }

  return result
}

function findClosestColor(r: number, g: number, b: number, palette: string[]): [number, number, number] {
  let minDist = Infinity
  let closest: [number, number, number] = [0, 0, 0]

  for (const hex of palette) {
    const pr = parseInt(hex.slice(1, 3), 16)
    const pg = parseInt(hex.slice(3, 5), 16)
    const pb = parseInt(hex.slice(5, 7), 16)
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
    if (dist < minDist) {
      minDist = dist
      closest = [pr, pg, pb]
    }
  }

  return closest
}

export async function convertImageToPixelArt(
  imageSource: string,
  options: Partial<PixelArtOptions> = {},
): Promise<string> {
  const opts = { ...DEFAULT_PIXEL_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const maxDim = opts.outputSize
        let processW = img.width
        let processH = img.height
        if (processW > maxDim || processH > maxDim) {
          const ratio = Math.min(maxDim / processW, maxDim / processH)
          processW = Math.round(processW * ratio)
          processH = Math.round(processH * ratio)
        }

        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = processW
        tempCanvas.height = processH
        const tempCtx = tempCanvas.getContext("2d")!
        tempCtx.drawImage(img, 0, 0, processW, processH)

        let imageData = tempCtx.getImageData(0, 0, processW, processH)

        applyBrightnessContrast(imageData.data, opts.brightness, opts.contrast)

        if (opts.removeBg) {
          imageData = removeBackground(imageData, processW, processH, opts.bgThreshold, opts.edgeSoftness)
        }

        const gridSize = opts.gridSize
        const cols = Math.round(processW / gridSize)
        const rows = Math.round(processH / gridSize)
        const outW = cols * gridSize
        const outH = rows * gridSize

        const outCanvas = document.createElement("canvas")
        outCanvas.width = outW
        outCanvas.height = outH
        const outCtx = outCanvas.getContext("2d")!

        const palette = PALETTE_PRESETS[opts.palette]?.colors || PALETTE_PRESETS.sketch.colors

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            let totalR = 0, totalG = 0, totalB = 0, totalA = 0, count = 0

            for (let dy = 0; dy < gridSize; dy++) {
              for (let dx = 0; dx < gridSize; dx++) {
                const px = col * gridSize + dx
                const py = row * gridSize + dy
                if (px < processW && py < processH) {
                  const i = (py * processW + px) * 4
                  totalR += imageData.data[i]
                  totalG += imageData.data[i + 1]
                  totalB += imageData.data[i + 2]
                  totalA += imageData.data[i + 3]
                  count++
                }
              }
            }

            if (count === 0) continue

            const avgR = totalR / count
            const avgG = totalG / count
            const avgB = totalB / count
            const avgA = totalA / count

            if (avgA < opts.alphaThreshold) continue

            const [cR, cG, cB] = findClosestColor(avgR, avgG, avgB, palette)

            outCtx.fillStyle = `rgb(${cR},${cG},${cB})`
            outCtx.fillRect(col * gridSize, row * gridSize, gridSize, gridSize)
          }
        }

        const resultCanvas = document.createElement("canvas")
        resultCanvas.width = opts.outputSize
        resultCanvas.height = opts.outputSize
        const resultCtx = resultCanvas.getContext("2d")!
        resultCtx.imageSmoothingEnabled = false

        const scale = Math.min(opts.outputSize / outW, opts.outputSize / outH)
        const drawW = outW * scale
        const drawH = outH * scale
        const offsetX = (opts.outputSize - drawW) / 2
        const offsetY = (opts.outputSize - drawH) / 2

        resultCtx.drawImage(outCanvas, offsetX, offsetY, drawW, drawH)

        const dataUrl = resultCanvas.toDataURL("image/png")
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error("فشل تحميل الصورة"))
    img.src = imageSource
  })
}
