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
export type CapturePreferences = { destination: 'clipboard' | 'folder'; saveDirectory: string }
export type CompleteResult = { destination: 'clipboard' | 'folder'; filePath?: string }
export type UpdateState = {
  status: 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'ready' | 'error'
  currentVersion: string
  version?: string
  percent?: number
  message?: string
  manualInstall: boolean
  releaseUrl?: string
}

export type CyberXShotApi = {
  onCapture: (callback: (payload: CapturePayload) => void) => () => void
  startCapture: () => Promise<void>
  getPendingCapture: () => Promise<CapturePayload | null>
  cancelCapture: () => Promise<void>
  copyImage: (dataUrl: string) => Promise<void>
  saveImage: (dataUrl: string) => Promise<SaveResult>
  completeCapture: (dataUrl: string) => Promise<CompleteResult>
  uploadImage: (dataUrl: string) => Promise<UploadResult>
  searchImage: (dataUrl: string) => Promise<UploadResult>
  setLaunchAtLogin: (enabled: boolean) => Promise<boolean>
  getLaunchAtLogin: () => Promise<boolean>
  getCapturePreferences: () => Promise<CapturePreferences>
  setCaptureDestination: (destination: CapturePreferences['destination']) => Promise<CapturePreferences>
  chooseSaveDirectory: () => Promise<CapturePreferences>
  onUpdateState: (callback: (state: UpdateState) => void) => () => void
  getUpdateState: () => Promise<UpdateState>
  checkForUpdates: () => Promise<UpdateState>
  downloadUpdate: () => Promise<UpdateState>
  installUpdate: () => Promise<boolean>
  getPlatform: () => Promise<string>
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    cyberxshot?: CyberXShotApi
  }
}
