import type { Annotation, Selection } from '../types'

export function normalizeSelection(start: { x: number; y: number }, end: { x: number; y: number }): Selection {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

export function drawArrow(ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }, size = 14) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6))
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6))
  ctx.stroke()
}

export function drawAnnotation(ctx: CanvasRenderingContext2D, item: Annotation) {
  ctx.save()
  ctx.strokeStyle = item.color
  ctx.fillStyle = item.color
  ctx.lineWidth = item.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (item.tool === 'pen' || item.tool === 'highlight') {
    ctx.globalAlpha = item.tool === 'highlight' ? 0.38 : 1
    ctx.lineWidth = item.tool === 'highlight' ? item.lineWidth * 5 : item.lineWidth
    ctx.beginPath()
    const points = item.points ?? [item.start, item.end]
    points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y))
    ctx.stroke()
  } else if (item.tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(item.start.x, item.start.y)
    ctx.lineTo(item.end.x, item.end.y)
    ctx.stroke()
  } else if (item.tool === 'arrow') {
    drawArrow(ctx, item.start, item.end, Math.max(10, item.lineWidth * 4))
  } else if (item.tool === 'rectangle') {
    ctx.strokeRect(item.start.x, item.start.y, item.end.x - item.start.x, item.end.y - item.start.y)
  } else if (item.tool === 'text' && item.text) {
    ctx.font = `600 ${Math.max(16, item.lineWidth * 6)}px Inter, sans-serif`
    ctx.fillText(item.text, item.start.x, item.start.y)
  } else if (item.tool === 'blur') {
    const x = Math.min(item.start.x, item.end.x)
    const y = Math.min(item.start.y, item.end.y)
    const width = Math.abs(item.end.x - item.start.x)
    const height = Math.abs(item.end.y - item.start.y)
    if (width > 2 && height > 2) {
      const pixelSize = 12
      const buffer = document.createElement('canvas')
      buffer.width = Math.max(1, Math.ceil(width / pixelSize))
      buffer.height = Math.max(1, Math.ceil(height / pixelSize))
      const bufferCtx = buffer.getContext('2d')!
      bufferCtx.drawImage(ctx.canvas, x, y, width, height, 0, 0, buffer.width, buffer.height)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(buffer, 0, 0, buffer.width, buffer.height, x, y, width, height)
    }
  }
  ctx.restore()
}

export function exportSelection(
  image: HTMLImageElement,
  selection: Selection,
  annotations: Annotation[],
  viewport: { width: number; height: number },
) {
  const scaleX = image.naturalWidth / viewport.width
  const scaleY = image.naturalHeight / viewport.height
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(selection.width * scaleX))
  canvas.height = Math.max(1, Math.round(selection.height * scaleY))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    selection.x * scaleX,
    selection.y * scaleY,
    selection.width * scaleX,
    selection.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  ctx.scale(scaleX, scaleY)
  ctx.translate(-selection.x, -selection.y)
  annotations.forEach((item) => drawAnnotation(ctx, item))
  return canvas.toDataURL('image/png')
}
