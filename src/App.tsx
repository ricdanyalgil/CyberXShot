import { useEffect, useState } from 'react'
import type { CapturePayload } from './types'
import { CaptureEditor } from './components/CaptureEditor'
import { Home } from './components/Home'

export default function App() {
  const [capture, setCapture] = useState<CapturePayload | null>(null)
  const captureRoute = new URLSearchParams(window.location.search).has('capture') || window.location.hash.includes('capture=1')

  useEffect(() => {
    if (!window.cyberxshot) return
    return window.cyberxshot.onCapture(setCapture)
  }, [])

  if (captureRoute) {
    return capture ? <CaptureEditor capture={capture} /> : (
      <main className="capture-loading">
        <span className="spinner" />
        <p>Preparando a captura…</p>
      </main>
    )
  }

  return <Home />
}
