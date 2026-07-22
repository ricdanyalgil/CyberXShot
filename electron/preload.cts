import { contextBridge, ipcRenderer } from 'electron'
type CapturePayload = { dataUrl: string; displayId: string; scaleFactor: number }

contextBridge.exposeInMainWorld('cyberxshot', {
  onCapture: (callback: (payload: CapturePayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CapturePayload) => callback(payload)
    ipcRenderer.on('capture-ready', listener)
    return () => ipcRenderer.removeListener('capture-ready', listener)
  },
  startCapture: () => ipcRenderer.invoke('capture:start'),
  cancelCapture: () => ipcRenderer.invoke('capture:cancel'),
  copyImage: (dataUrl: string) => ipcRenderer.invoke('image:copy', dataUrl),
  saveImage: (dataUrl: string) => ipcRenderer.invoke('image:save', dataUrl),
  completeCapture: (dataUrl: string) => ipcRenderer.invoke('image:complete', dataUrl),
  uploadImage: (dataUrl: string) => ipcRenderer.invoke('image:upload', dataUrl),
  searchImage: (dataUrl: string) => ipcRenderer.invoke('image:search', dataUrl),
  setLaunchAtLogin: (enabled: boolean) => ipcRenderer.invoke('settings:launch-at-login', enabled),
  getLaunchAtLogin: () => ipcRenderer.invoke('settings:get-launch-at-login'),
  getCapturePreferences: () => ipcRenderer.invoke('settings:get-capture-preferences'),
  setCaptureDestination: (destination: 'clipboard' | 'folder') => ipcRenderer.invoke('settings:set-capture-destination', destination),
  chooseSaveDirectory: () => ipcRenderer.invoke('settings:choose-save-directory'),
  onUpdateState: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state)
    ipcRenderer.on('update:state', listener)
    return () => ipcRenderer.removeListener('update:state', listener)
  },
  getUpdateState: () => ipcRenderer.invoke('update:get-state'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
})
