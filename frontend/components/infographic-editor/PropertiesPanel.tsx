'use client'

import { ArrowUpToLine, ArrowDownToLine, Copy, Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { FONT_FAMILIES } from '@/types/infographic'
import type { SelectionProperties } from '@/hooks/use-canvas-selection'

interface PropertiesPanelProps {
  properties: SelectionProperties | null
  objectType: string | null
  onUpdateProperty: (key: keyof SelectionProperties, value: number | string) => void
  onBringToFront: () => void
  onSendToBack: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export default function PropertiesPanel({
  properties,
  objectType,
  onUpdateProperty,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
}: PropertiesPanelProps) {
  const isText = objectType === 'i-text' || objectType === 'text'
  const isShape = objectType === 'rect' || objectType === 'circle'

  if (!properties) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center px-4 gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
            <path d="M9 9h6M9 12h6M9 15h4" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Select an element<br/>to edit properties
        </p>
      </div>
    )
  }

  const inputClasses = 'w-full h-6 px-2 text-[11px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors'
  const labelClasses = 'text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide'
  const sectionClasses = 'px-3 py-2.5 border-b border-[var(--border)] space-y-2'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* TRANSFORM */}
      <div className={sectionClasses}>
        <div className={labelClasses}>Transform</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'X', key: 'left' as const, val: Math.round(properties.left) },
            { label: 'Y', key: 'top' as const, val: Math.round(properties.top) },
            { label: 'W', key: 'width' as const, val: Math.round(properties.width) },
            { label: 'H', key: 'height' as const, val: Math.round(properties.height) },
          ].map(({ label, key, val }) => (
            <div key={key}>
              <div className={`${labelClasses} mb-1`}>{label}</div>
              <input type="number" value={val} onChange={(e) => onUpdateProperty(key, Number(e.target.value))} className={inputClasses} />
            </div>
          ))}
        </div>

        {/* Rotation + Opacity inline */}
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <div>
            <div className={`${labelClasses} mb-1`}>Rotation</div>
            <input type="number" value={Math.round(properties.angle)} onChange={(e) => onUpdateProperty('angle', Number(e.target.value))} className={inputClasses} />
          </div>
          <div>
            <div className={`${labelClasses} mb-1`}>Opacity</div>
            <input type="number" min="0" max="100" value={Math.round(properties.opacity)} onChange={(e) => onUpdateProperty('opacity', Number(e.target.value))} className={inputClasses} />
          </div>
        </div>
      </div>

      {/* APPEARANCE — shapes only */}
      {isShape && properties.fill && (
        <div className={sectionClasses}>
          <div className={labelClasses}>Appearance</div>
          <div className="space-y-1.5">
            {[
              { label: 'Fill', key: 'fill' as const, val: properties.fill || '#7c3aed' },
              { label: 'Stroke', key: 'stroke' as const, val: properties.stroke || '#000000' },
            ].map(({ label, key, val }) => (
              <div key={key}>
                <div className={`${labelClasses} mb-1`}>{label}</div>
                <div className="flex gap-1.5">
                  <input type="color" value={val} onChange={(e) => onUpdateProperty(key, e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-[var(--border)] bg-transparent p-0.5 flex-shrink-0" />
                  <input type="text" value={val} onChange={(e) => onUpdateProperty(key, e.target.value)} className={`${inputClasses} font-mono`} />
                </div>
              </div>
            ))}
            {objectType === 'rect' && (
              <div>
                <div className={`${labelClasses} mb-1`}>Radius</div>
                <input type="number" value={properties.rx || 0} onChange={(e) => onUpdateProperty('rx', Number(e.target.value))} className={inputClasses} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TYPOGRAPHY — text only */}
      {isText && (
        <div className={sectionClasses}>
          <div className={labelClasses}>Typography</div>
          <div className="space-y-1.5">
            <div>
              <div className={`${labelClasses} mb-1`}>Font</div>
              <select value={properties.fontFamily || 'Arial'} onChange={(e) => onUpdateProperty('fontFamily', e.target.value)} className={`${inputClasses} cursor-pointer`}>
                {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <div className={`${labelClasses} mb-1`}>Size</div>
                <input type="number" value={properties.fontSize || 13} onChange={(e) => onUpdateProperty('fontSize', Number(e.target.value))} className={inputClasses} />
              </div>
              <div>
                <div className={`${labelClasses} mb-1`}>Weight</div>
                <select value={properties.fontWeight || 'normal'} onChange={(e) => onUpdateProperty('fontWeight', e.target.value)} className={`${inputClasses} cursor-pointer`}>
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="900">Black</option>
                </select>
              </div>
            </div>
            <div className="flex gap-1">
              {[
                { val: 'left', icon: AlignLeft },
                { val: 'center', icon: AlignCenter },
                { val: 'right', icon: AlignRight },
              ].map(({ val, icon: Icon }) => (
                <button key={val} onClick={() => onUpdateProperty('textAlign', val)} className={`flex-1 h-6 flex items-center justify-center rounded border transition-all ${properties.textAlign === val ? 'bg-[var(--bg-active)] border-[var(--border-focus)]' : 'border-[var(--border)] hover:border-[var(--border-focus)]'}`}>
                  <Icon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>
              ))}
            </div>
            <div>
              <div className={`${labelClasses} mb-1`}>Color</div>
              <div className="flex gap-1.5">
                <input type="color" value={properties.fill || '#ffffff'} onChange={(e) => onUpdateProperty('fill', e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-[var(--border)] bg-transparent p-0.5 flex-shrink-0" />
                <input type="text" value={properties.fill || '#ffffff'} onChange={(e) => onUpdateProperty('fill', e.target.value)} className={`${inputClasses} font-mono`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIONS — pinned at bottom */}
      <div className="mt-auto px-3 py-2.5 space-y-1.5">
        <div className={labelClasses}>Actions</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={onBringToFront} className="h-6 flex items-center justify-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all active:scale-95">
            <ArrowUpToLine className="w-3 h-3" /> Front
          </button>
          <button onClick={onSendToBack} className="h-6 flex items-center justify-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all active:scale-95">
            <ArrowDownToLine className="w-3 h-3" /> Back
          </button>
          <button onClick={onDuplicate} className="h-6 flex items-center justify-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all active:scale-95">
            <Copy className="w-3 h-3" /> Duplicate
          </button>
          <button onClick={onDelete} className="h-6 flex items-center justify-center gap-1 bg-[var(--destructive-subtle)] border border-transparent hover:border-[var(--destructive)] rounded text-[10px] text-[var(--destructive)] hover:bg-[var(--destructive)] hover:text-white transition-all active:scale-95">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}
