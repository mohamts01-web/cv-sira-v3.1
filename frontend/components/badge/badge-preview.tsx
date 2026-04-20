"use client"

import type React from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useState, useEffect } from "react"
import { MatrixBackground } from "./matrix-background"

type BadgePreviewProps = {
  eventName: string
  eventDate: string
  badgeNumber: string
  pixelArtUrl: string | null
  logoUrl: string | null
  logoText: string
  isInvert: boolean
  isGenerating: boolean
  backgroundColor: string
  backgroundImage?: string | null
  imageFilter: string
  imageScale: number
  imagePositionX: number
  imagePositionY: number
  matrixEnabled?: boolean
  matrixHue?: number
  matrixSpeed?: number
  matrixDepth?: number
  matrixChars?: string
  matrixScale?: number
  matrixPositionX?: number
  matrixPositionY?: number
  showPlaceholder?: boolean
}

export function BadgePreview({
  eventName,
  eventDate,
  badgeNumber,
  pixelArtUrl,
  logoUrl,
  logoText,
  isInvert,
  isGenerating,
  backgroundColor,
  backgroundImage,
  imageFilter,
  imageScale,
  imagePositionX,
  imagePositionY,
  matrixEnabled = false,
  matrixHue = 120,
  matrixSpeed = 1,
  matrixDepth = 6,
  matrixChars = "01",
  matrixScale = 100,
  matrixPositionX = 50,
  matrixPositionY = 50,
  showPlaceholder = true,
}: BadgePreviewProps) {
  const [isClient, setIsClient] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (pixelArtUrl && pixelArtUrl !== loadedImageUrl) {
      setIsImageLoading(true)
    }
  }, [pixelArtUrl, loadedImageUrl])

  const getFilterStyle = () => {
    switch (imageFilter) {
      case "grayscale":
        return "grayscale(100%)"
      case "blue":
        return "url(#duotone-blue-badge)"
      case "sketch":
        return "grayscale(100%) contrast(150%) brightness(110%)"
      default:
        return "none"
    }
  }

  const getBackgroundPattern = () => {
    if (!isClient) return null

    if (backgroundColor === "#000000" || backgroundColor === "#000") {
      return (
        <div className="absolute inset-0 opacity-30 overflow-hidden rounded-sm">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute h-full bg-white"
              style={{
                left: `${i * 2.5}%`,
                width: Math.random() > 0.6 ? "1.5%" : "0.8%",
                opacity: Math.random() * 0.4 + 0.1,
              }}
            />
          ))}
        </div>
      )
    }
    return null
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateXValue = ((y - centerY) / centerY) * -10
    const rotateYValue = ((x - centerX) / centerX) * 10
    setRotateX(rotateXValue)
    setRotateY(rotateYValue)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div className="flex w-full items-center justify-center">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="duotone-blue-badge">
            <feColorMatrix type="saturate" values="0" result="grayscale" />
            <feComponentTransfer result="contrast">
              <feFuncR type="gamma" amplitude="1.0" exponent="0.4" offset="0" />
              <feFuncG type="gamma" amplitude="1.0" exponent="0.4" offset="0" />
              <feFuncB type="gamma" amplitude="1.0" exponent="0.4" offset="0" />
            </feComponentTransfer>
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.0 0.059 0.216 0.471 0.765 1.0" />
              <feFuncG type="table" tableValues="0.039 0.176 0.373 0.627 0.824 1.0" />
              <feFuncB type="table" tableValues="0.235 0.412 0.588 0.765 0.882 1.0" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div
        className="badge-container"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          animate={{
            rotateX,
            rotateY,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <div className="relative h-[420px] w-[280px] shrink-0 sm:h-[480px] sm:w-[320px] md:h-[576px] md:w-[384px]">
            <div
              className="absolute inset-0 rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)",
                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(255, 255, 255, 0.5), inset -2px -2px 4px rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                transform: "translateZ(-10px)",
              }}
            />

            <div className="absolute inset-[8px] flex flex-col overflow-hidden rounded-md shadow-2xl shadow-black/40">
              <div
                className="relative mx-3 mt-3 shrink-0 overflow-hidden rounded-xl px-4 py-3.5 space-y-1"
                style={{
                  backgroundColor:
                    backgroundColor === "#000000" || backgroundColor === "#000" ? "#000000" : backgroundColor,
                  boxShadow: "0 3px 12px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.08)",
                  transform: "translateZ(0px)",
                }}
              >
                <div className="flex items-center justify-between h-5">
                  <div className="flex items-center gap-2">
                    <h2 className="font-mono text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-gray-300">
                      {eventName || "CvSira"}
                    </h2>
                    <span className="text-gray-500">|</span>
                    <p className="font-mono text-[10px] font-medium uppercase leading-none tracking-[0.06em] text-gray-300">
                      {eventDate || "2025"}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-gray-300">
                    BADGE
                  </p>
                </div>

                <div className="flex items-center justify-between h-5 pt-1">
                  <div className="flex h-5 w-36 items-center justify-center">
                    <svg viewBox="0 0 180 20" className="h-full w-full">
                      {isClient &&
                        [...Array(18)].map((_, i) => (
                          <rect
                            key={i}
                            x={i * 10}
                            y="0"
                            width={Math.random() > 0.5 ? 5 : 2.5}
                            height="20"
                            fill="#d1d5db"
                            opacity={1}
                          />
                        ))}
                    </svg>
                  </div>
                  <p className="font-mono text-[10px] font-medium leading-none text-gray-300">
                    {badgeNumber || "0000"}
                  </p>
                </div>
              </div>

              <div className="h-5 shrink-0" style={{ background: "transparent" }} />

              <div
                className="relative mx-3 mb-3 flex flex-1 items-center justify-center overflow-hidden rounded-sm"
                style={{
                  backgroundColor,
                  transform: "translateZ(10px)",
                }}
              >
                {backgroundImage && (
                  <Image
                    src={backgroundImage || "/placeholder.svg"}
                    alt="Background pattern"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, 384px"
                  />
                )}
                {!backgroundImage && getBackgroundPattern()}

                <MatrixBackground
                  enabled={matrixEnabled}
                  hue={matrixHue}
                  speed={matrixSpeed}
                  depth={matrixDepth}
                  chars={matrixChars}
                  scale={matrixScale}
                  positionX={matrixPositionX}
                  positionY={matrixPositionY}
                />

                {isGenerating ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-10 flex flex-col items-center gap-3"
                  >
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                    <p className="font-mono text-xs text-white/50">جارٍ التوليد...</p>
                  </motion.div>
                ) : pixelArtUrl ? (
                  <div
                    className="relative z-10 h-full w-full overflow-hidden rounded-sm"
                    style={{ transform: "translateZ(15px)" }}
                  >
                    {isImageLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm"
                      >
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                        <p className="mt-3 font-mono text-xs text-white/50">تحميل الصورة...</p>
                      </motion.div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: isImageLoading ? 0 : 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="relative h-full w-full"
                    >
                      <Image
                        src={pixelArtUrl || "/placeholder.svg"}
                        alt="Pixel art portrait"
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, 384px"
                        style={{
                          filter: getFilterStyle(),
                          mixBlendMode: "normal",
                          transform: `scale(${imageScale / 100}) translate(${imagePositionX - 50}%, ${imagePositionY - 50}%)`,
                        }}
                        onLoad={() => {
                          setIsImageLoading(false)
                          setLoadedImageUrl(pixelArtUrl)
                        }}
                      />
                    </motion.div>
                  </div>
                ) : showPlaceholder ? (
                  <div className="relative z-10 flex h-full w-full items-center justify-center rounded-sm border border-dashed border-white/25 bg-white/5">
                    <p className="px-4 text-center font-mono text-[9px] leading-tight text-white/35">
                      ارفع أو التقط
                      <br />صورة لتوليد
                      <br />
                      البكسل آرت
                    </p>
                  </div>
                ) : null}

                <div className="absolute bottom-3 left-3 z-20" style={{ transform: "translateZ(25px)" }}>
                  {logoUrl ? (
                    <Image
                      src={logoUrl || "/placeholder.svg"}
                      alt="Event logo"
                      width={72}
                      height={24}
                      className={`h-[24px] w-auto object-contain drop-shadow-lg ${isInvert ? "invert" : ""}`}
                    />
                  ) : (
                    <div className={`flex h-[24px] items-center justify-center rounded border border-dashed border-white/25 bg-white/5 px-2 ${isInvert ? "invert" : ""}`}>
                      <span className="font-mono text-[7px] text-white/50 whitespace-nowrap">{logoText || "your logo or name"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
