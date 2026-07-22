import {
  app,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  screen,
  shell,
  Tray,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { autoUpdater } from 'electron-updater'

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
const appRoot = path.join(__dirname, '..')
let mainWindow: BrowserWindow | null = null
let captureWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

type CaptureDestination = 'clipboard' | 'folder'
type CapturePreferences = { destination: CaptureDestination; saveDirectory: string }
type UpdateStatus = 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'ready' | 'error'
type UpdateState = {
  status: UpdateStatus
  currentVersion: string
  version?: string
  percent?: number
  message?: string
  manualInstall: boolean
  releaseUrl?: string
}

let capturePreferences: CapturePreferences = { destination: 'clipboard', saveDirectory: '' }
let updateState: UpdateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
  manualInstall: process.platform === 'darwin',
}

const traySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M11 8.5 13 5h6l2 3.5h3A4 4 0 0 1 28 12v11a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-3.5h3Z" fill="none" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="16" cy="17.5" r="5" fill="none" stroke="#000" stroke-width="2.5"/>
  <circle cx="24" cy="12.5" r="1.25" fill="#000"/>
</svg>`

function rendererUrl() {
  return isDev ? process.env.VITE_DEV_SERVER_URL! : `file://${path.join(appRoot, 'dist/index.html')}`
}

function releaseUrl(version?: string) {
  return version
    ? `https://github.com/ricdanyalgil/CyberXShot/releases/tag/v${version}`
    : 'https://github.com/ricdanyalgil/CyberXShot/releases/latest'
}

function setUpdateState(next: Partial<UpdateState>) {
  updateState = { ...updateState, ...next, currentVersion: app.getVersion() }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:state', updateState)
}

function showUpdateNotification(title: string, body: string) {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body, silent: true })
  notification.on('click', () => createMainWindow().show())
  notification.show()
}

async function checkForUpdates() {
  if (isDev) {
    setUpdateState({ status: 'current', message: 'Atualizações são verificadas no aplicativo instalado.' })
    return updateState
  }
  setUpdateState({ status: 'checking', message: undefined, percent: undefined })
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    setUpdateState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
  }
  return updateState
}

async function downloadUpdate() {
  if (process.platform === 'darwin') {
    await shell.openExternal(updateState.releaseUrl ?? releaseUrl(updateState.version))
    return updateState
  }
  if (updateState.status !== 'available') return updateState
  setUpdateState({ status: 'downloading', percent: 0 })
  await autoUpdater.downloadUpdate()
  return updateState
}

function setupAutoUpdater() {
  if (isDev) return
  autoUpdater.setFeedURL({ provider: 'github', owner: 'ricdanyalgil', repo: 'CyberXShot' })
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false
  autoUpdater.on('update-available', (info) => {
    setUpdateState({
      status: 'available',
      version: info.version,
      percent: undefined,
      message: process.platform === 'darwin'
        ? 'Uma nova versão está disponível para baixar.'
        : 'Uma nova versão está pronta para baixar e instalar.',
      releaseUrl: releaseUrl(info.version),
    })
    showUpdateNotification('Atualização disponível', `CyberXShot ${info.version} está disponível.`)
  })
  autoUpdater.on('update-not-available', () => {
    setUpdateState({ status: 'current', version: undefined, percent: undefined, message: 'Você está usando a versão mais recente.' })
  })
  autoUpdater.on('download-progress', (progress) => {
    setUpdateState({ status: 'downloading', percent: Math.round(progress.percent), message: 'Baixando atualização…' })
  })
  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({ status: 'ready', version: info.version, percent: 100, message: 'Atualização pronta para instalar.' })
    showUpdateNotification('Atualização pronta', 'Abra o CyberXShot para reiniciar e instalar.')
  })
  autoUpdater.on('error', (error) => {
    setUpdateState({ status: 'error', message: error.message })
  })
  setTimeout(() => void checkForUpdates(), 4000)
  const updateTimer = setInterval(() => void checkForUpdates(), 6 * 60 * 60 * 1000)
  updateTimer.unref()
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    title: 'CyberXShot',
    backgroundColor: '#070b14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  void mainWindow.loadURL(rendererUrl())
  mainWindow.webContents.on('did-finish-load', () => mainWindow?.webContents.send('update:state', updateState))
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  return mainWindow
}

async function loadCapturePreferences() {
  try {
    const stored = JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'settings.json'), 'utf8')) as Partial<CapturePreferences>
    capturePreferences = {
      destination: stored.destination === 'folder' ? 'folder' : 'clipboard',
      saveDirectory: typeof stored.saveDirectory === 'string' ? stored.saveDirectory : '',
    }
  } catch {
    capturePreferences = { destination: 'clipboard', saveDirectory: '' }
  }
}

async function saveCapturePreferences() {
  const settingsDirectory = app.getPath('userData')
  await fs.mkdir(settingsDirectory, { recursive: true })
  await fs.writeFile(path.join(settingsDirectory, 'settings.json'), JSON.stringify(capturePreferences, null, 2), 'utf8')
}

function captureFileName() {
  return `CyberXShot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
}

async function saveToDirectory(dataUrl: string, directory: string) {
  await fs.mkdir(directory, { recursive: true })
  const filePath = path.join(directory, captureFileName())
  await fs.writeFile(filePath, dataUrlBuffer(dataUrl))
  return filePath
}

async function hideMainWindowForCapture() {
  const window = mainWindow
  if (!window || window.isDestroyed() || !window.isVisible()) return
  await new Promise<void>((resolve) => {
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      resolve()
    }
    window.once('hide', done)
    window.hide()
    setTimeout(done, 120)
  })
  await new Promise((resolve) => setTimeout(resolve, 50))
}

async function startCapture() {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.destroy()
    captureWindow = null
    await new Promise((resolve) => setTimeout(resolve, 60))
  }
  await hideMainWindowForCapture()
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const thumbnailSize = {
    width: Math.round(display.size.width * display.scaleFactor),
    height: Math.round(display.size.height * display.scaleFactor),
  }

  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize,
      fetchWindowIcons: false,
    })
    const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0]
    if (!source || source.thumbnail.isEmpty()) throw new Error('Não foi possível acessar a tela. Verifique a permissão de gravação de tela.')
    const captureDataUrl = `data:image/png;base64,${source.thumbnail.toPNG().toString('base64')}`

    captureWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: false,
      resizable: false,
      movable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: '#000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
    captureWindow.setAlwaysOnTop(true, 'screen-saver')
    captureWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    captureWindow.on('closed', () => { captureWindow = null })
    captureWindow.webContents.once('did-finish-load', () => {
      captureWindow?.webContents.send('capture-ready', {
        dataUrl: captureDataUrl,
        displayId: String(display.id),
        scaleFactor: display.scaleFactor,
      })
      captureWindow?.show()
      captureWindow?.focus()
    })
    await captureWindow.loadURL(`${rendererUrl()}${isDev ? '?' : '#'}capture=1`)
  } catch (error) {
    captureWindow?.destroy()
    captureWindow = null
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (process.platform === 'darwin' && /Failed to get sources/i.test(errorMessage)) return
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Não foi possível capturar',
      message: 'CyberXShot não conseguiu capturar a tela.',
      detail: process.platform === 'darwin'
        ? 'Conclua a autorização exibida pelo macOS e tente novamente.\n\nDetalhes: ' + errorMessage
        : errorMessage,
      buttons: process.platform === 'darwin' ? ['Tentar novamente', 'Abrir Ajustes', 'Fechar'] : ['Tentar novamente', 'Fechar'],
      defaultId: 0,
      cancelId: process.platform === 'darwin' ? 2 : 1,
    })
    if (result.response === 0) {
      void startCapture()
    } else if (process.platform === 'darwin' && result.response === 1) {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
    }
  }
}

function closeCapture() {
  captureWindow?.destroy()
  captureWindow = null
}

function dataUrlBuffer(dataUrl: string) {
  const match = /^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl)
  if (!match) throw new Error('Formato de imagem inválido.')
  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.byteLength > 35 * 1024 * 1024) throw new Error('A captura excede o limite de 35 MB.')
  return buffer
}

async function upload(dataUrl: string) {
  const buffer = dataUrlBuffer(dataUrl)
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('time', '1h')
  form.append('fileToUpload', new Blob([buffer], { type: 'image/png' }), `cyberxshot-${Date.now()}.png`)
  const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    body: form,
  })
  const url = (await response.text()).trim()
  if (!response.ok || !/^https:\/\//.test(url)) throw new Error('Falha ao compartilhar a captura.')
  return url
}

function createTray() {
  const fallbackIcon = nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(traySvg).toString('base64')}`)
    .resize({ width: 18, height: 18 })
  const macIcon = process.platform === 'darwin'
    ? nativeImage.createFromNamedImage('camera.viewfinder').resize({ width: 18, height: 18 })
    : nativeImage.createEmpty()
  const trayIcon = macIcon.isEmpty() ? fallbackIcon : macIcon
  if (process.platform === 'darwin') trayIcon.setTemplateImage(true)
  tray = new Tray(trayIcon)
  tray.setToolTip('CyberXShot')
  const trayMenu = Menu.buildFromTemplate([
    { label: 'Capturar área', accelerator: 'CommandOrControl+Shift+X', click: () => void startCapture() },
    { label: 'Abrir CyberXShot', click: () => createMainWindow().show() },
    { label: 'Verificar atualizações', click: () => { createMainWindow().show(); void checkForUpdates() } },
    { type: 'separator' },
    { label: 'Sair', click: () => { isQuitting = true; app.quit() } },
  ])
  tray.on('click', () => tray?.popUpContextMenu(trayMenu))
  tray.on('right-click', () => tray?.popUpContextMenu(trayMenu))
}

function registerIpc() {
  ipcMain.handle('capture:start', () => startCapture())
  ipcMain.handle('capture:cancel', () => closeCapture())
  ipcMain.handle('image:copy', (_event, dataUrl: string) => {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
    closeCapture()
  })
  ipcMain.handle('image:save', async (_event, dataUrl: string) => {
    if (capturePreferences.destination === 'folder' && capturePreferences.saveDirectory) {
      const filePath = await saveToDirectory(dataUrl, capturePreferences.saveDirectory)
      closeCapture()
      return { canceled: false, filePath }
    }
    const options: Electron.SaveDialogOptions = {
      title: 'Salvar captura',
      defaultPath: captureFileName(),
      filters: [{ name: 'Imagem PNG', extensions: ['png'] }],
    }
    const parent = captureWindow ?? mainWindow
    const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
    if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, dataUrlBuffer(dataUrl))
      closeCapture()
    }
    return result
  })
  ipcMain.handle('image:complete', async (_event, dataUrl: string) => {
    if (capturePreferences.destination === 'folder' && capturePreferences.saveDirectory) {
      const filePath = await saveToDirectory(dataUrl, capturePreferences.saveDirectory)
      closeCapture()
      return { destination: 'folder', filePath }
    }
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
    closeCapture()
    return { destination: 'clipboard' }
  })
  ipcMain.handle('image:upload', async (_event, dataUrl: string) => {
    const url = await upload(dataUrl)
    clipboard.writeText(url)
    closeCapture()
    return { url }
  })
  ipcMain.handle('image:search', async (_event, dataUrl: string) => {
    const url = await upload(dataUrl)
    await shell.openExternal(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`)
    closeCapture()
    return { url }
  })
  ipcMain.handle('settings:launch-at-login', (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return app.getLoginItemSettings().openAtLogin
  })
  ipcMain.handle('settings:get-launch-at-login', () => app.getLoginItemSettings().openAtLogin)
  ipcMain.handle('settings:get-capture-preferences', () => capturePreferences)
  ipcMain.handle('settings:set-capture-destination', async (_event, destination: CaptureDestination) => {
    if (!['clipboard', 'folder'].includes(destination)) throw new Error('Destino inválido.')
    capturePreferences.destination = destination
    await saveCapturePreferences()
    return capturePreferences
  })
  ipcMain.handle('settings:choose-save-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Escolha onde salvar as capturas',
      defaultPath: capturePreferences.saveDirectory || app.getPath('pictures'),
      properties: ['openDirectory', 'createDirectory'],
    })
    if (!result.canceled && result.filePaths[0]) {
      capturePreferences = { destination: 'folder', saveDirectory: result.filePaths[0] }
      await saveCapturePreferences()
    }
    return capturePreferences
  })
  ipcMain.handle('update:get-state', () => updateState)
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', () => downloadUpdate())
  ipcMain.handle('update:install', () => {
    if (updateState.status !== 'ready' || process.platform === 'darwin') return false
    isQuitting = true
    autoUpdater.quitAndInstall(false, true)
    return true
  })
  ipcMain.handle('app:platform', () => process.platform)
  ipcMain.handle('app:open-external', (_event, url: string) => {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('URL não permitida.')
    return shell.openExternal(parsed.toString())
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => void startCapture())
  app.whenReady().then(async () => {
    await loadCapturePreferences()
    registerIpc()
    createMainWindow()
    createTray()
    setupAutoUpdater()
    globalShortcut.register('CommandOrControl+Shift+X', () => void startCapture())
    if (process.platform === 'win32') globalShortcut.register('PrintScreen', () => void startCapture())
  })
  app.on('activate', () => createMainWindow())
  app.on('before-quit', () => { isQuitting = true })
  app.on('will-quit', () => globalShortcut.unregisterAll())
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && isQuitting) app.quit()
  })
}
