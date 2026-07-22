import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureEditor } from './CaptureEditor'

const context = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  rect: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setLineDash: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
} as unknown as CanvasRenderingContext2D

class TestImage {
  onload: (() => void) | null = null
  naturalWidth = 1200
  naturalHeight = 800

  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}

beforeEach(() => {
  vi.stubGlobal('Image', TestImage)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  Object.defineProperties(HTMLCanvasElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    releasePointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('CaptureEditor', () => {
  it('mantém o editor ativo ao desenhar um retângulo seguido de uma seta', async () => {
    const { container } = render(<CaptureEditor capture={{ dataUrl: 'data:image/png;base64,AA==', displayId: '1', scaleFactor: 1 }} />)
    const canvas = container.querySelector('canvas')!

    await waitFor(() => expect(context.drawImage).toHaveBeenCalled())
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 420, clientY: 320, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 420, clientY: 320, pointerId: 1 })

    fireEvent.click(await screen.findByRole('button', { name: 'Retângulo' }))
    fireEvent.pointerDown(canvas, { clientX: 60, clientY: 60, pointerId: 2 })
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 150, pointerId: 2 })
    fireEvent.pointerUp(canvas, { clientX: 180, clientY: 150, pointerId: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Seta' }))
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 3 })
    fireEvent.pointerMove(canvas, { clientX: 260, clientY: 210, pointerId: 3 })
    fireEvent.pointerUp(canvas, { clientX: 260, clientY: 210, pointerId: 3 })

    await waitFor(() => {
      expect(context.strokeRect).toHaveBeenCalled()
      expect(context.stroke).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Desfazer' })).toBeEnabled()
    })
  })

  it('insere texto no ponto escolhido sem depender de um diálogo do sistema', async () => {
    const { container } = render(<CaptureEditor capture={{ dataUrl: 'data:image/png;base64,AA==', displayId: '1', scaleFactor: 1 }} />)
    const canvas = container.querySelector('canvas')!

    await waitFor(() => expect(context.drawImage).toHaveBeenCalled())
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 420, clientY: 320, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 420, clientY: 320, pointerId: 1 })

    fireEvent.click(await screen.findByRole('button', { name: 'Texto' }))
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 2 })

    const input = screen.getByRole('textbox', { name: 'Texto da anotação' })
    fireEvent.change(input, { target: { value: 'Texto funcionando' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Texto da anotação' })).not.toBeInTheDocument()
      expect(context.fillText).toHaveBeenCalledWith('Texto funcionando', 100, 100)
      expect(screen.getByRole('button', { name: 'Desfazer' })).toBeEnabled()
    })
  })
})
