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
  screen,
  shell,
  systemPreferences,
  Tray,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
const appRoot = path.join(__dirname, '..')
let mainWindow: BrowserWindow | null = null
let captureWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const traySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M7 13V8a1 1 0 0 1 1-1h5M19 7h5a1 1 0 0 1 1 1v5M25 19v5a1 1 0 0 1-1 1h-5M13 25H8a1 1 0 0 1-1-1v-5" fill="none" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="4" fill="none" stroke="#38bdf8" stroke-width="2.6"/>
  <circle cx="16" cy="16" r="1.2" fill="#38bdf8"/>
</svg>`

function rendererUrl() {
  return isDev ? process.env.VITE_DEV_SERVER_URL! : `file://${path.join(appRoot, 'dist/index.html')}`
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
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  return mainWindow
}

async function startCapture() {
  if (captureWindow && !captureWindow.isDestroyed()) return

  if (process.platform === 'darwin' && ['denied', 'restricted'].includes(systemPreferences.getMediaAccessStatus('screen'))) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Permissão de captura necessária',
      message: 'Autorize o CyberXShot a gravar a tela.',
      detail: 'Abra Privacidade e Segurança → Gravação da Tela, ative o CyberXShot e reinicie o aplicativo.',
      buttons: ['Abrir Ajustes', 'Agora não'],
      defaultId: 0,
      cancelId: 1,
    })
    if (result.response === 0) {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
    }
    return
  }

  mainWindow?.hide()

  await new Promise((resolve) => setTimeout(resolve, 140))
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
        dataUrl: source.thumbnail.toDataURL(),
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
    createMainWindow().show()
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Permissão necessária',
      message: 'CyberXShot não conseguiu capturar a tela.',
      detail: error instanceof Error ? error.message : String(error),
      buttons: process.platform === 'darwin' ? ['Abrir Ajustes', 'Fechar'] : ['Fechar'],
      defaultId: 0,
      cancelId: process.platform === 'darwin' ? 1 : 0,
    })
    if (process.platform === 'darwin' && result.response === 0) {
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
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(traySvg).toString('base64')}`)
  if (process.platform === 'darwin') icon.setTemplateImage(true)
  tray = new Tray(icon.resize({ width: 18, height: 18 }))
  tray.setToolTip('CyberXShot')
  if (process.platform === 'darwin') tray.setTitle('CyberXShot')
  const trayMenu = Menu.buildFromTemplate([
    { label: 'Nova captura', accelerator: 'CommandOrControl+Shift+X', click: () => void startCapture() },
    { label: 'Abrir CyberXShot', click: () => createMainWindow().show() },
    { type: 'separator' },
    { label: 'Sair', click: () => { isQuitting = true; app.quit() } },
  ])
  tray.on('click', () => void startCapture())
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
    const options: Electron.SaveDialogOptions = {
      title: 'Salvar captura',
      defaultPath: `CyberXShot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
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
  app.whenReady().then(() => {
    registerIpc()
    createMainWindow()
    createTray()
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
