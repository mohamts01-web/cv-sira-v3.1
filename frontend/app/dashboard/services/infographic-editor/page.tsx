"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import * as fabric from "fabric"
import dynamic from "next/dynamic"
import { useCanvasHistory } from "@/hooks/use-canvas-history"
import { useCanvasSelection } from "@/hooks/use-canvas-selection"
import {
  addTextElement, addHeadingElement, addRectElement,
  addCircleElement, addStatBlockElement, addDividerLineElement,
} from "@/lib/infographic/renderElements"
import { CANVAS_SIZES, type ThemePalette, type CanvasSize, type StylePreset } from "@/types/infographic"
import { DEFAULT_INFOGRAPHIC } from "@/lib/infographic/defaultInfographic"
import type { CanvasRef } from "@/components/infographic-editor/InfographicCanvas"
import PromptPanel from "@/components/infographic-editor/PromptPanel"
import LayersPanel from "@/components/infographic-editor/LayersPanel"
import PropertiesPanel from "@/components/infographic-editor/PropertiesPanel"
import Toolbar from "@/components/infographic-editor/Toolbar"
import ZoomSlider from "@/components/infographic-editor/ZoomSlider"

const InfographicCanvas = dynamic(
  () => import("@/components/infographic-editor/InfographicCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#0e0e0e]">
        <div className="animate-pulse text-gray-400 text-sm">Loading canvas...</div>
      </div>
    ),
  }
)

export default function InfographicEditorPage() {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [zoomOverride, setZoomOverride] = useState<number | null>(null)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>("a4")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [toolMode, setToolMode] = useState<"select" | "hand">("select")
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const panOffsetRef = useRef({ x: 0, y: 0 })
  const activePanRef = useRef(false)
  const spacePressedRef = useRef(false)
  const centerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<CanvasRef>(null)

  const { pushState, undo, redo, canUndo, canRedo } = useCanvasHistory(canvas)
  const { selectedObject, properties, updateObject, bringToFront, sendToBack, duplicateObject, deleteObject } =
    useCanvasSelection(canvas)

  const { width, height } = CANVAS_SIZES[canvasSize]

  const fitZoom = useCallback(() => {
    if (!centerRef.current) return 0.6
    const cw = centerRef.current.clientWidth - 64
    const ch = centerRef.current.clientHeight - 64
    return Math.min(cw / width, ch / height, 1)
  }, [width, height])

  const zoom = zoomOverride ?? fitZoom()

  useEffect(() => {
    const handler = () => {
      if (zoomOverride === null) setRefreshTrigger((t) => t + 1)
    }
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [zoomOverride])

  const handleCanvasReady = useCallback(async (c: fabric.Canvas) => {
    setCanvas(c)
    if (canvasRef.current) {
      await canvasRef.current.renderData(DEFAULT_INFOGRAPHIC)
      setRefreshTrigger((t) => t + 1)
    }
  }, [])

  const handleObjectModified = useCallback(() => {
    pushState()
    setRefreshTrigger((t) => t + 1)
  }, [pushState])

  const handleGenerate = async (prompt: string, theme: ThemePalette, size: CanvasSize, style: StylePreset) => {
    setIsGenerating(true)
    setCanvasSize(size)
    const { width: cw, height: ch } = CANVAS_SIZES[size]

    try {
      if (canvasRef.current) {
        canvasRef.current.prepareForStream({ canvasWidth: cw, canvasHeight: ch, background: "#ffffff" })
      }

      const response = await fetch("/api/infographic-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, theme, size, style }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Generation failed")
      }
      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      const renderedIds = new Set<string>()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const partial = JSON.parse(line)
            if (partial.error) throw new Error(partial.error)
            if (partial.background && canvasRef.current?.canvas) {
              canvasRef.current.canvas.set("backgroundColor", partial.background)
              canvasRef.current.canvas.requestRenderAll()
            }
            if (partial.elements && Array.isArray(partial.elements) && canvasRef.current) {
              for (const element of partial.elements) {
                if (element.id && element.type && !renderedIds.has(element.id)) {
                  renderedIds.add(element.id)
                  canvasRef.current.renderElement(element)
                }
              }
            }
          } catch (e: any) {
            console.error("Parse error:", e.message)
          }
        }
      }

      if (canvasRef.current) canvasRef.current.finishStream()
      pushState()
      setRefreshTrigger((t) => t + 1)
    } catch (error) {
      console.error("Error:", error)
      if (canvasRef.current) canvasRef.current.finishStream()
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddElement = (type: "heading" | "text" | "rect" | "circle" | "stat" | "line") => {
    if (!canvas) return
    const actions = { heading: addHeadingElement, text: addTextElement, rect: addRectElement, circle: addCircleElement, stat: addStatBlockElement, line: addDividerLineElement }
    actions[type]?.(canvas)
    pushState()
    setRefreshTrigger((t) => t + 1)
  }

  const handleZoomIn = () => setZoomOverride((z) => Math.min((z ?? fitZoom()) + 0.1, 2))
  const handleZoomOut = () => setZoomOverride((z) => Math.max((z ?? fitZoom()) - 0.1, 0.1))
  const handleFitToScreen = () => { setZoomOverride(null); panOffsetRef.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 }) }
  const handleZoomChange = (val: number) => setZoomOverride(Math.min(2, Math.max(0.1, val)))

  // Mouse wheel zoom
  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left - rect.width / 2
      const cursorY = e.clientY - rect.top - rect.height / 2
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      setZoomOverride((prevZ) => {
        const oldZoom = prevZ ?? fitZoom()
        const newZoom = Math.min(2, Math.max(0.1, Math.round((oldZoom + delta) * 100) / 100))
        const scale = newZoom / oldZoom
        setPanOffset((prevPan) => ({ x: cursorX - (cursorX - prevPan.x) * scale, y: cursorY - (cursorY - prevPan.y) * scale }))
        return newZoom
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [fitZoom])

  // Pan
  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spacePressedRef.current && !e.repeat) { spacePressedRef.current = true; el.style.cursor = "grab" }
      if (e.code === "KeyV") setToolMode("select")
      if (e.code === "KeyH") setToolMode("hand")
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") { spacePressedRef.current = false; if (!activePanRef.current) el.style.cursor = toolMode === "hand" ? "grab" : "" }
    }
    const onMouseDown = (e: MouseEvent) => {
      const isMiddle = e.button === 1
      const isSpaceDrag = e.button === 0 && spacePressedRef.current
      const isHandDrag = e.button === 0 && toolMode === "hand"
      if (isMiddle || isSpaceDrag || isHandDrag) {
        e.preventDefault(); e.stopPropagation()
        activePanRef.current = true; setIsPanning(true)
        panStartRef.current = { x: e.clientX, y: e.clientY, offsetX: panOffsetRef.current.x, offsetY: panOffsetRef.current.y }
        el.style.cursor = "grabbing"
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!activePanRef.current) return
      const newOffset = { x: panStartRef.current.offsetX + e.clientX - panStartRef.current.x, y: panStartRef.current.offsetY + e.clientY - panStartRef.current.y }
      panOffsetRef.current = newOffset; setPanOffset(newOffset)
    }
    const onMouseUp = () => {
      if (activePanRef.current) { activePanRef.current = false; setIsPanning(false); el.style.cursor = (spacePressedRef.current || toolMode === "hand") ? "grab" : "" }
    }
    el.style.cursor = toolMode === "hand" ? "grab" : ""
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp)
    el.addEventListener("mousedown", onMouseDown); window.addEventListener("mousemove", onMouseMove); window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp)
      el.removeEventListener("mousedown", onMouseDown); window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp)
    }
  }, [toolMode])

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: "var(--bg-app, #0a0a0a)" }}>
      <Toolbar
        canUndo={canUndo} canRedo={canRedo} zoom={zoom} toolMode={toolMode}
        onToolModeChange={setToolMode} onUndo={undo} onRedo={redo}
        onExportPNG={() => canvasRef.current?.exportPNG()}
        onExportJSON={() => canvasRef.current?.exportJSON()}
        onClearAll={() => { canvasRef.current?.clearAll(); pushState(); setRefreshTrigger((t) => t + 1) }}
        onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFitToScreen={handleFitToScreen}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[260px] flex-shrink-0 flex flex-col border-r border-zinc-800 overflow-hidden" style={{ background: "var(--bg-panel, #141414)" }}>
          <PromptPanel onGenerate={handleGenerate} onAddElement={handleAddElement} isGenerating={isGenerating} />
          <div className="h-[120px] flex-shrink-0 overflow-hidden border-t border-zinc-800">
            <LayersPanel canvas={canvas} onSelectObject={() => setRefreshTrigger((t) => t + 1)} refreshTrigger={refreshTrigger} />
          </div>
        </div>

        <div ref={centerRef} className="flex-1 min-w-0 overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: "#0e0e0e", backgroundImage: "radial-gradient(circle, #2a2a2a 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)`, transition: isPanning ? "none" : "transform 0.1s ease-out" }}>
            <InfographicCanvas
              ref={canvasRef} width={width} height={height} zoom={zoom} toolMode={toolMode}
              onReady={handleCanvasReady} onObjectModified={handleObjectModified}
            />
          </div>
        </div>

        <ZoomSlider zoom={zoom} onZoomChange={handleZoomChange} onFitToScreen={handleFitToScreen} />

        <div className="w-[220px] flex-shrink-0 border-l border-zinc-800 overflow-hidden" style={{ background: "var(--bg-panel, #141414)" }}>
          <PropertiesPanel
            properties={properties} objectType={selectedObject?.type || null}
            onUpdateProperty={updateObject} onBringToFront={bringToFront}
            onSendToBack={sendToBack} onDuplicate={duplicateObject} onDelete={deleteObject}
          />
        </div>
      </div>
    </div>
  )
}
