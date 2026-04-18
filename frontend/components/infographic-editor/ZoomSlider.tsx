'use client'

import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'

interface ZoomSliderProps {
  zoom: number
  min?: number
  max?: number
  onZoomChange: (zoom: number) => void
  onFitToScreen: () => void
}

const MIN = 0.1
const MAX = 2.0
const STEP = 0.05

// Convert zoom value to slider position (0-100)
function zoomToSlider(zoom: number) {
  return ((zoom - MIN) / (MAX - MIN)) * 100
}

// Convert slider position (0-100) to zoom value
function sliderToZoom(pos: number) {
  return Math.round((MIN + (pos / 100) * (MAX - MIN)) * 100) / 100
}

export default function ZoomSlider({ zoom, onZoomChange, onFitToScreen }: ZoomSliderProps) {
  const sliderValue = zoomToSlider(zoom)
  const pct = Math.round(zoom * 100)

  return (
    <div className="w-9 flex-shrink-0 flex flex-col items-center py-3 gap-3 border-l border-[var(--border)] bg-[var(--bg-panel)]">
      {/* Zoom In */}
      <button
        onClick={() => onZoomChange(Math.min(MAX, Math.round((zoom + STEP) * 100) / 100))}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90"
        title="Zoom in"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      {/* Vertical slider track */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderValue}
          onChange={(e) => onZoomChange(sliderToZoom(Number(e.target.value)))}
          className="zoom-slider"
          style={{
            writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
            direction: 'rtl' as React.CSSProperties['direction'],
            width: '4px',
            height: '120px',
            cursor: 'pointer',
            appearance: 'slider-vertical' as React.CSSProperties['appearance'],
            WebkitAppearance: 'slider-vertical' as React.CSSProperties['WebkitAppearance'],
            accentColor: 'var(--accent)',
          } as React.CSSProperties}
          title={`Zoom: ${pct}%`}
        />
      </div>

      {/* Zoom percentage */}
      <div className="text-[9px] font-mono text-[var(--text-muted)] leading-none">
        {pct}%
      </div>

      {/* Zoom Out */}
      <button
        onClick={() => onZoomChange(Math.max(MIN, Math.round((zoom - STEP) * 100) / 100))}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90"
        title="Zoom out"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      {/* Fit */}
      <button
        onClick={onFitToScreen}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all active:scale-90"
        title="Fit to screen"
      >
        <Maximize className="w-3 h-3" />
      </button>
    </div>
  )
}
