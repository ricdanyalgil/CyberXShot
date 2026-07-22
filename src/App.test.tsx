import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  delete window.cyberxshot
  window.history.replaceState({}, '', '/')
})

describe('App capture route', () => {
  it('recupera uma captura pendente mesmo quando o evento inicial foi perdido', async () => {
    window.history.replaceState({}, '', '/?capture=1')
    window.cyberxshot = {
      onCapture: vi.fn(() => () => undefined),
      getPendingCapture: vi.fn().mockResolvedValue({
        dataUrl: 'data:image/png;base64,AA==',
        displayId: '1',
        scaleFactor: 1,
      }),
    } as unknown as Window['cyberxshot']

    const { container } = render(<App />)

    await waitFor(() => expect(container.querySelector('.capture-editor')).toBeInTheDocument())
    expect(screen.queryByText('Preparando a captura…')).not.toBeInTheDocument()
  })

  it('permite fechar pelo botão e pelo Esc enquanto a captura carrega', async () => {
    window.history.replaceState({}, '', '/?capture=1')
    const cancelCapture = vi.fn().mockResolvedValue(undefined)
    window.cyberxshot = {
      onCapture: vi.fn(() => () => undefined),
      getPendingCapture: vi.fn().mockResolvedValue(null),
      cancelCapture,
    } as unknown as Window['cyberxshot']

    render(<App />)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(cancelCapture).toHaveBeenCalledTimes(2))
  })
})
