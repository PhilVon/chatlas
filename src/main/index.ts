import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { AdapterManager } from './adapters/adapter-manager'
import { Brain } from './brain/index'
import { PersistenceManager } from './persistence/persistence-manager'
import { registerIpcHandlers } from './ipc/ipc-handlers'
import type { HotkeyMap } from '../types/settings'
import type { SourceConfig } from '../types/session'

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
const adapterManager = new AdapterManager()
const brain = new Brain()
const persistence = new PersistenceManager()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function createOverlayWindow(): Promise<void> {
  if (overlayWindow) return

  const settings = await persistence.getSettings()
  const { bounds, opacity } = settings.overlay

  overlayWindow = new BrowserWindow({
    width:  bounds?.width  ?? 400,
    height: bounds?.height ?? 600,
    x: bounds?.x,
    y: bounds?.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  overlayWindow.setOpacity(opacity)

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?mode=overlay`)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mode: 'overlay' }
    })
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

function closeOverlayWindow(): void {
  if (overlayWindow) {
    void persistence.saveOverlayBounds(overlayWindow.getBounds())
  }
  overlayWindow?.close()
  overlayWindow = null
}

function registerGlobalShortcuts(hotkeys: HotkeyMap): void {
  for (const [action, accelerator] of Object.entries(hotkeys)) {
    if (!accelerator) continue
    try {
      globalShortcut.register(accelerator, () => {
        mainWindow?.webContents.send('hotkey:fire', action)
      })
    } catch {
      console.warn(`[ChAtlas] Failed to register shortcut "${accelerator}" for action "${action}"`)
    }
  }
}

function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}

function setupBrain() {
  adapterManager.onEvent((rawEvent) => {
    const classified = brain.process(rawEvent)
    mainWindow?.webContents.send('chat:event', classified)
    overlayWindow?.webContents.send('chat:event', classified)
  })

  adapterManager.onStatus((payload) => {
    mainWindow?.webContents.send('platform:status', payload)
  })

  brain.onBurst((summary) => {
    mainWindow?.webContents.send('burst:update', summary)
    overlayWindow?.webContents.send('burst:update', summary)
  })
}

async function autoRestoreSources() {
  try {
    const [sources, settings] = await Promise.all([
      persistence.getSources(),
      persistence.getSettings()
    ])

    brain.setThreshold(settings.lanes.burstThreshold)
    brain.setFilterConfig(settings.filters)
    registerGlobalShortcuts(settings.hotkeys)

    for (const config of sources) {
      const withCreds: SourceConfig = {
        ...config,
        apiKey:       settings.credentials.youtubeApiKey   ?? config.apiKey,
        botToken:     settings.credentials.discordBotToken ?? config.botToken,
        dggAuthToken: settings.credentials.dggAuthToken    ?? config.dggAuthToken
      }
      await adapterManager.addSource(withCreds)
    }
  } catch (err) {
    console.error('[ChAtlas] Failed to restore sources:', err)
  }
}

app.whenReady().then(async () => {
  setupBrain()
  registerIpcHandlers(adapterManager, persistence, brain, {
    open: createOverlayWindow,
    close: closeOverlayWindow,
    reregisterShortcuts: (hotkeys) => {
      unregisterGlobalShortcuts()
      registerGlobalShortcuts(hotkeys)
    },
    sendToOverlay: (channel, ...args) => {
      overlayWindow?.webContents.send(channel, ...args)
    }
  })
  createWindow()
  await autoRestoreSources()
})

app.on('window-all-closed', async () => {
  await adapterManager.disconnectAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})
