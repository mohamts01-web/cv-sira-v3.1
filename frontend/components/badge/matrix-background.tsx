"use client"

import { useState, useEffect, useMemo } from "react"

interface MatrixBackgroundConfig {
  chars: string
  speed: number
  depth: number
  hue: number
}

function MatrixLayer({
  config,
  depth,
  time,
}: {
  config: MatrixBackgroundConfig
  depth: number
  time: number
}) {
  const matrix = useMemo(() => {
    const cols = Math.max(6, 20 - depth * 2)
    const rows = 10
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        char: config.chars[Math.floor(Math.random() * config.chars.length)],
        offset: Math.random() * 100,
      })),
    )
  }, [config.chars, depth])

  if (depth >= config.depth) return null

  const scale = Math.pow(0.8, depth)
  const opacity = Math.max(0.2, 1 - depth * 0.2)

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="font-mono text-[8px] leading-tight"
        style={{
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        {matrix.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => {
              const phase = time * config.speed + cell.offset + r * 10 + c * 5
              const charIndex = Math.floor(phase / 10) % config.chars.length
              const alpha = 0.3 + 0.7 * Math.sin(phase * 0.1)

              return (
                <span
                  key={c}
                  style={{
                    color: `hsla(${(config.hue + depth * 30) % 360}, 70%, 60%, ${alpha})`,
                    textShadow: `0 0 ${4 * alpha}px currentColor`,
                  }}
                >
                  {config.chars[charIndex]}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <MatrixLayer config={config} depth={depth + 1} time={time} />
    </div>
  )
}

export function MatrixBackground({
  enabled,
  hue = 120,
  speed = 1,
  depth = 6,
  chars = "01",
  scale = 100,
  positionX = 50,
  positionY = 50,
}: {
  enabled: boolean
  hue?: number
  speed?: number
  depth?: number
  chars?: string
  scale?: number
  positionX?: number
  positionY?: number
}) {
  const [time, setTime] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let frame: number
    const animate = () => {
      setTime((t) => t + 1)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [enabled])

  if (!enabled) return null

  const safeChars = chars && chars.length > 0 ? chars : "01"
  const config: MatrixBackgroundConfig = {
    chars: safeChars,
    speed,
    depth,
    hue,
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{
        transform: `scale(${scale / 100}) translate(${positionX - 50}%, ${positionY - 50}%)`,
      }}
    >
      <MatrixLayer config={config} depth={0} time={time} />
    </div>
  )
}
