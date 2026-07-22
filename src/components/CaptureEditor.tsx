import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  Crop,
  Highlighter,
  Images,
  LoaderCircle,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Share2,
  Square,
  Type,
  Undo2,
  X,
  WandSparkles,
} from 'lucide-react'
import type { Annotation, CapturePayload, Point, Selection, Tool } from '../types'
import { drawAnnotation, exportSelection, normalizeSelection } from '../utils/exportImage'

const tools: { id: Tool; label: string; icon: typeof Crop }[] = [
  { id: 'select', label: 'Selecionar', icon: MousePointer2 },
  { id: 'pen', label: 'Caneta', icon: Pencil },
  { id: 'line', label: 'Linha', icon: Minus },
  { id: 'arrow', label: 'Seta', icon: ArrowUpRight },
  { id: 'rectangle', label: 'Retângulo', icon: Square },
  { id: 'highlight', label: 'Destaque', icon: Highlighter },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'blur', label: 'Desfocar', icon: WandSparkles },
]

const colors = ['#ff4967', '#ffd166', '#32e6a1', '#56a8ff', '#ffffff', '#151a24']

export function CaptureEditor({ capture }: { capture: CapturePayload }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const startRef = useRef<Point | null>(null)
  const draftRef = useRef<Annotation | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(colors[0])
  const [lineWidth, setLineWidth] = useState(3)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [redoStack, setRedoStack] = useState<Annotation[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<'upload' | 'search' | null>(null)
  const [error, setError] = useState('')

  const redraw = useCallback((draft?: Annotation | null) => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return
    const width = window.innerWidth
    const height = window.innerHeight
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.drawImage(image, 0, 0, width, height)
    annotations.forEach((item) => drawAnnotation(ctx, item))
    if (draft) drawAnnotation(ctx, draft)

    ctx.save()
    ctx.fillStyle = 'rgba(3, 7, 13, .62)'
    if (!selection) {
      ctx.fillRect(0, 0, width, height)
    } else {
      ctx.beginPath()
      ctx.rect(0, 0, width, height)
      ctx.rect(selection.x, selection.y, selection.width, selection.height)
      ctx.fill('evenodd')
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 4])
      ctx.strokeRect(selection.x + .5, selection.y + .5, selection.width - 1, selection.height - 1)
    }
    ctx.restore()
  }, [annotations, selection])

  useEffect(() => {
    const image = new Image()
    image.onload = () => { imageRef.current = image; redraw() }
    image.src = capture.dataUrl
  }, [capture.dataUrl, redraw])

  useEffect(() => {
    redraw(draftRef.current)
    const onResize = () => redraw(draftRef.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [redraw])

  const output = useCallback(() => {
    if (!selection || !imageRef.current) return null
    return exportSelection(imageRef.current, selection, annotations, { width: window.innerWidth, height: window.innerHeight })
  }, [annotations, selection])

  const copy = useCallback(async () => {
    const png = output()
    if (png) await window.cyberxshot?.copyImage(png)
  }, [output])

  const save = useCallback(async () => {
    const png = output()
    if (png) await window.cyberxshot?.saveImage(png)
  }, [output])

  const cancel = useCallback(() => { void window.cyberxshot?.cancelCapture() }, [])
  const undo = useCallback(() => {
    setAnnotations((items) => {
      const last = items.at(-1)
      if (last) setRedoStack((redo) => [...redo, last])
      return items.slice(0, -1)
    })
  }, [])
  const redo = useCallback(() => {
    setRedoStack((items) => {
      const last = items.at(-1)
      if (last) setAnnotations((current) => [...current, last])
      return items.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey
      if (event.key === 'Escape') cancel()
      if (command && event.key.toLowerCase() === 'c') { event.preventDefault(); void copy() }
      if (command && event.key.toLowerCase() === 's') { event.preventDefault(); void save() }
      if (command && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancel, copy, redo, save, undo])

  function point(event: React.PointerEvent): Point {
    return { x: event.clientX, y: event.clientY }
  }

  function withinSelection(value: Point) {
    return selection && value.x >= selection.x && value.x <= selection.x + selection.width && value.y >= selection.y && value.y <= selection.y + selection.height
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (busy) return
    const current = point(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    setError('')

    if (!selection || tool === 'select') {
      startRef.current = current
      setSelection({ x: current.x, y: current.y, width: 0, height: 0 })
      setDragging(true)
      if (tool === 'select') setAnnotations([])
      return
    }
    if (!withinSelection(current)) return

    if (tool === 'text') {
      const text = window.prompt('Digite o texto da anotação:')?.trim()
      if (text) {
        setAnnotations((items) => [...items, { id: crypto.randomUUID(), tool, start: current, end: current, color, lineWidth, text }])
        setRedoStack([])
      }
      return
    }

    startRef.current = current
    draftRef.current = {
      id: crypto.randomUUID(),
      tool,
      start: current,
      end: current,
      points: tool === 'pen' || tool === 'highlight' ? [current] : undefined,
      color,
      lineWidth,
    }
    setDragging(true)
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging || !startRef.current) return
    const current = point(event)
    if (!selection || tool === 'select') {
      setSelection(normalizeSelection(startRef.current, current))
      return
    }
    if (!draftRef.current) return
    const bounded = {
      x: Math.max(selection.x, Math.min(current.x, selection.x + selection.width)),
      y: Math.max(selection.y, Math.min(current.y, selection.y + selection.height)),
    }
    draftRef.current.end = bounded
    if (draftRef.current.points) draftRef.current.points.push(bounded)
    redraw(draftRef.current)
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    startRef.current = null
    if (draftRef.current) {
      setAnnotations((items) => [...items, draftRef.current!])
      draftRef.current = null
      setRedoStack([])
    }
  }

  async function share(mode: 'upload' | 'search') {
    const png = output()
    if (!png || !window.cyberxshot) return
    setBusy(mode)
    setError('')
    try {
      if (mode === 'upload') await window.cyberxshot.uploadImage(png)
      else await window.cyberxshot.searchImage(png)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a ação.')
      setBusy(null)
    }
  }

  const toolbarStyle = selection ? {
    left: Math.max(12, Math.min(selection.x, window.innerWidth - 710)),
    top: Math.min(window.innerHeight - 74, selection.y + selection.height + 10),
  } : undefined

  return (
    <main className="capture-editor">
      <canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} />
      {!selection || selection.width < 6 || selection.height < 6 ? (
        <div className="capture-hint"><Crop size={20} /><span>Arraste para selecionar uma área</span><kbd>Esc</kbd> para cancelar</div>
      ) : (
        <>
          <div className="selection-size" style={{ left: selection.x, top: Math.max(8, selection.y - 31) }}>
            {Math.round(selection.width * capture.scaleFactor)} × {Math.round(selection.height * capture.scaleFactor)}
          </div>
          <div className="editor-toolbar" style={toolbarStyle}>
            <div className="tool-group">
              {tools.map(({ id, label, icon: Icon }) => (
                <button key={id} className={tool === id ? 'active' : ''} title={label} aria-label={label} onClick={() => setTool(id)}><Icon size={18} /></button>
              ))}
            </div>
            <span className="divider" />
            <div className="color-control">
              <button className="color-current" style={{ background: color }} title="Cor" />
              <div className="color-popover">{colors.map((item) => <button key={item} style={{ background: item }} onClick={() => setColor(item)}>{color === item && <Check size={12} />}</button>)}</div>
            </div>
            <select aria-label="Espessura" value={lineWidth} onChange={(event) => setLineWidth(Number(event.target.value))}>
              <option value="2">Fina</option><option value="3">Média</option><option value="5">Grossa</option>
            </select>
            <button title="Desfazer" aria-label="Desfazer" disabled={!annotations.length} onClick={undo}><Undo2 size={18} /></button>
            <button title="Refazer" aria-label="Refazer" disabled={!redoStack.length} onClick={redo}><Redo2 size={18} /></button>
            <span className="divider" />
            <button title="Copiar" aria-label="Copiar" onClick={() => void copy()}><Copy size={18} /></button>
            <button title="Salvar" aria-label="Salvar" onClick={() => void save()}><Save size={18} /></button>
            <button title="Pesquisar imagem semelhante" aria-label="Pesquisar imagem semelhante" onClick={() => void share('search')} disabled={!!busy}>{busy === 'search' ? <LoaderCircle className="spin" size={18} /> : <Images size={18} />}</button>
            <button className="share" title="Criar link público por 1 hora" aria-label="Compartilhar" onClick={() => void share('upload')} disabled={!!busy}>{busy === 'upload' ? <LoaderCircle className="spin" size={18} /> : <Share2 size={18} />}</button>
            <button className="close" title="Cancelar" aria-label="Cancelar" onClick={cancel}><X size={18} /></button>
          </div>
          {error && <div className="capture-error"><X size={15} /> {error}</div>}
          <div className="privacy-pill"><ArrowDownToLine size={14} /> Local por padrão · links expiram em 1h</div>
        </>
      )}
    </main>
  )
}
