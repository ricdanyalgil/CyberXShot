export type Tool = 'select' | 'pen' | 'line' | 'arrow' | 'rectangle' | 'highlight' | 'text' | 'blur'

export type Point = { x: number; y: number }
export type Selection = { x: number; y: number; width: number; height: number }

export type Annotation = {
  id: string
  tool: Exclude<Tool, 'select'>
  start: Point
  end: Point
  points?: Point[]
  color: string
  lineWidth: number
  text?: string
}

export type CapturePayload = {
  dataUrl: string
  displayId: string
  scaleFactor: number
}

export type SaveResult = { canceled: boolean; filePath?: string }
export type UploadResult = { url: string }

export type CyberXShotApi = {
  onCapture: (callback: (payload: CapturePayload) => void) => () => void
  startCapture: () => Promise<void>
  cancelCapture: () => Promise<void>
  copyImage: (dataUrl: string) => Promise<void>
  saveImage: (dataUrl: string) => Promise<SaveResult>
  uploadImage: (dataUrl: string) => Promise<UploadResult>
  searchImage: (dataUrl: string) => Promise<UploadResult>
  setLaunchAtLogin: (enabled: boolean) => Promise<boolean>
  getLaunchAtLogin: () => Promise<boolean>
  getPlatform: () => Promise<string>
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    cyberxshot?: CyberXShotApi
  }
}
