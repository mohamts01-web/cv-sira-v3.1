'use client'

import { useState, useEffect } from 'react'
import { Undo2, Redo2, Download, FileJson, Trash2, ZoomIn, ZoomOut, Maximize, MousePointer2, Hand, Save, Loader2 } from 'lucide-react'
import { useSaveProject } from '@/hooks/use-save-project'

interface ToolbarProps {
  canUndo: boolean
  canRedo: boolean
  zoom: number
  toolMode: 'select' | 'hand'
  onToolModeChange: (mode: 'select' | 'hand') => void
  onUndo: () => void
  onRedo: () => void
  onExportPNG: () => void
  onExportJSON: () => void
  onClearAll: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onSaveProject?: (data: Record<string, unknown>, thumbnail?: string) => void
  isSavingProject?: boolean
}

export default function Toolbar({
  canUndo,
  canRedo,
  zoom,
  toolMode,
  onToolModeChange,
  onUndo,
  onRedo,
  onExportPNG,
  onExportJSON,
  onClearAll,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onSaveProject,
  isSavingProject,
}: ToolbarProps) {
  const [zoomInput, setZoomInput] = useState(Math.round(zoom * 100))

  // Keep in sync when zoom changes externally (wheel, slider)
  useEffect(() => {
    setZoomInput(Math.round(zoom * 100))
  }, [zoom])

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    if (!isNaN(val)) setZoomInput(val)
  }

  const handleZoomInputBlur = () => {
    const val = Math.max(20, Math.min(200, zoomInput / 100))
    if (!isNaN(val)) {
      onZoomIn()
      onZoomOut()
    }
  }

  const buttonClasses = (disabled = false) => `
    h-7 px-3 flex items-center gap-1.5 rounded-[var(--radius-md)] 
    border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]
    text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]
    transition-all duration-120 cursor-pointer
    ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-100'}
  `

  return (
    <div className="h-11 bg-[var(--bg-panel)] border-b border-[var(--border)] px-4 flex items-center justify-between gap-4">
      {/* Left: Logo + Tool Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-semibold text-[var(--text-primary)]">
            AI Infographics
          </h1>
          <div className="text-[10px] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">
            Beta
          </div>
        </div>

        {/* Select / Hand tool toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-0.5">
          <button
            onClick={() => onToolModeChange('select')}
            title="Select tool (V)"
            className={`h-6 w-7 flex items-center justify-center rounded transition-all duration-120 ${
              toolMode === 'select'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToolModeChange('hand')}
            title="Hand tool (H)"
            className={`h-6 w-7 flex items-center justify-center rounded transition-all duration-120 ${
              toolMode === 'hand'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Actions */}
      <div className="flex items-center gap-1">
        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={buttonClasses(!canUndo)}
          title="Undo (Cmd+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={buttonClasses(!canRedo)}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border)] mx-1" />

        {/* Export */}
        <button onClick={onExportPNG} className={buttonClasses()} title="Export as PNG">
          <Download className="w-3.5 h-3.5" />
          <span>PNG</span>
        </button>

        <button onClick={onExportJSON} className={buttonClasses()} title="Export as JSON">
          <FileJson className="w-3.5 h-3.5" />
          <span>JSON</span>
        </button>

        {onSaveProject && (
          <button
            onClick={() => onSaveProject({})}
            disabled={isSavingProject}
            className={buttonClasses(isSavingProject)}
            title="Save project"
          >
            {isSavingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>حفظ</span>
          </button>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border)] mx-1" />

        {/* Clear */}
        <button
          onClick={onClearAll}
          className={`
            h-7 px-3 flex items-center gap-1.5 rounded-[var(--radius-md)] 
            border border-transparent hover:border-[var(--destructive)] hover:bg-[var(--destructive-subtle)]
            text-[11px] text-[var(--text-secondary)] hover:text-[var(--destructive)]
            transition-all duration-120 cursor-pointer
          `}
          title="Clear canvas"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Right: Zoom */}
      <div className="flex items-center gap-1 bg-[var(--bg-elevated)] rounded-full px-2 py-1 border border-[var(--border)]">
        <button onClick={onZoomOut} className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors" title="Zoom out">
          <ZoomOut className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </button>

        <input
          type="text"
          value={`${zoomInput}%`}
          onChange={handleZoomInputChange}
          onBlur={handleZoomInputBlur}
          className="w-10 h-6 text-center text-[10px] font-mono text-[var(--text-primary)] bg-transparent border-none outline-none"
        />

        <button onClick={onZoomIn} className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors" title="Zoom in">
          <ZoomIn className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </button>

        <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

        <button
          onClick={onFitToScreen}
          className="px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
          title="Fit to screen"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
