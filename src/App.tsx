import { useEffect, useState } from 'react'
import type { CapturePayload } from './types'
import { CaptureEditor } from './components/CaptureEditor'
import { Home } from './components/Home'

export default function App() {
  const [capture, setCapture] = useState<CapturePayload | null>(null)
  const captureRoute = new URLSearchParams(window.location.search).has('capture') || window.location.hash.includes('capture=1')

  useEffect(() => {
    const api = window.cyberxshot
    if (!api) return
    let active = true
    const unsubscribe = api.onCapture((payload) => {
      if (active) setCapture(payload)
    })
    void api.getPendingCapture().then((payload) => {
      if (active && payload) setCapture(payload)
    }).catch(() => undefined)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!captureRoute || capture) return
    const cancelLoadingCapture = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void window.cyberxshot?.cancelCapture()
    }
    window.addEventListener('keydown', cancelLoadingCapture)
    return () => window.removeEventListener('keydown', cancelLoadingCapture)
  }, [capture, captureRoute])

  if (captureRoute) {
    return capture ? <CaptureEditor capture={capture} /> : (
      <main className="capture-loading">
        <span className="spinner" />
        <p>Preparando a captura…</p>
        <button onClick={() => void window.cyberxshot?.cancelCapture()}>Cancelar</button>
        <small>ou pressione Esc</small>
      </main>
    )
  }

  return <Home />
}
