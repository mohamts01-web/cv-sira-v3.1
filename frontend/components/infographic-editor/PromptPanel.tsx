'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import {
  CANVAS_SIZES,
  THEME_COLORS,
  type ThemePalette,
  type CanvasSize,
  type StylePreset,
} from '@/types/infographic'

interface PromptPanelProps {
  onGenerate: (prompt: string, theme: ThemePalette, size: CanvasSize, style: StylePreset) => Promise<void>
  onAddElement: (type: 'heading' | 'text' | 'rect' | 'circle' | 'stat' | 'line') => void
  isGenerating: boolean
}

const LAYOUT_STYLES = [
  { id: 'auto', label: 'Auto' },
  { id: 'steps', label: 'Steps' },
  { id: 'stats', label: 'Stats' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'compare', label: 'Compare' },
  { id: 'list', label: 'List' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'cycle', label: 'Cycle' },
] as const

type LayoutStyle = typeof LAYOUT_STYLES[number]['id']

const ELEMENTS = [
  { id: 'heading', icon: '𝗛', label: 'Heading' },
  { id: 'text', icon: '𝗧', label: 'Text' },
  { id: 'rect', icon: '▭', label: 'Rect' },
  { id: 'circle', icon: '○', label: 'Circle' },
  { id: 'stat', icon: '⬛', label: 'Stat' },
  { id: 'line', icon: '—', label: 'Line' },
] as const

export default function PromptPanel({
  onGenerate,
  onAddElement,
  isGenerating,
}: PromptPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [theme, setTheme] = useState<ThemePalette>('violet')
  const [size, setSize] = useState<CanvasSize>('a4')
  const [style, setStyle] = useState<LayoutStyle>('auto')

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    await onGenerate(prompt, theme, size, style)
  }

  const themeNames: Record<ThemePalette, string> = {
    violet: 'Violet',
    ocean: 'Ocean',
    ember: 'Ember',
    forest: 'Forest',
    slate: 'Slate',
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* PROMPT */}
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What should your infographic be about?"
            className="w-full h-[72px] px-3 py-2 text-[12px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-8 flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-medium rounded transition-all duration-120 active:translate-y-0.5"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Generating…</span></>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /><span>Generate</span></>
            )}
          </button>
        </div>

        {/* STYLE */}
        <div className="space-y-2.5">
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Style</div>

          {/* Theme */}
          <div>
            <div className="text-[11px] text-[var(--text-secondary)] mb-1.5">Theme</div>
            <div className="flex gap-1.5">
              {(Object.keys(THEME_COLORS) as ThemePalette[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`w-6 h-6 rounded-full border-2 transition-all duration-120 ${
                    theme === t ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-panel)] border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: THEME_COLORS[t].primary }}
                  title={themeNames[t]}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="text-[11px] text-[var(--text-secondary)] mb-1.5">Size</div>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as CanvasSize)}
              className="w-full h-7 px-2 text-[11px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
            >
              {(Object.entries(CANVAS_SIZES) as [CanvasSize, { label: string }][]).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Layout */}
          <div>
            <div className="text-[11px] text-[var(--text-secondary)] mb-1.5">Layout</div>
            <div className="flex flex-wrap gap-1">
              {LAYOUT_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id as LayoutStyle)}
                  className={`px-2.5 h-6 text-[10px] font-medium rounded-full border transition-all duration-120 ${
                    style === s.id
                      ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ELEMENTS */}
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Elements</div>
          <div className="grid grid-cols-3 gap-1.5">
            {ELEMENTS.map((el) => (
              <button
                key={el.id}
                onClick={() => onAddElement(el.id as any)}
                className="h-7 flex items-center justify-center gap-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-focus)] transition-all duration-120 active:scale-95"
              >
                <span className="text-[12px]">{el.icon}</span>
                <span>{el.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
