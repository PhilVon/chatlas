import { ipcMain } from 'electron'
import type { AdapterManager } from '../adapters/adapter-manager'
import type { PersistenceManager } from '../persistence/persistence-manager'
import type { Brain } from '../brain/index'
import type { SourceConfig, SourceStatus } from '../../types/session'
import type { AppSettings, HotkeyMap } from '../../types/settings'

interface AppControls {
  open: () => Promise<void>
  close: () => void
  reregisterShortcuts: (hotkeys: HotkeyMap) => void
  sendToOverlay: (channel: string, ...args: unknown[]) => void
}

export function registerIpcHandlers(
  adapterManager: AdapterManager,
  persistence: PersistenceManager,
  brain: Brain,
  appControls: AppControls
): void {
  // --- Sources ---
  ipcMain.handle('source:add', async (_e, config: SourceConfig) => {
    const settings = await persistence.getSettings()
    const withCreds: SourceConfig = {
      ...config,
      apiKey:       settings.credentials.youtubeApiKey   ?? config.apiKey,
      botToken:     settings.credentials.discordBotToken ?? config.botToken,
      dggAuthToken: settings.credentials.dggAuthToken    ?? config.dggAuthToken
    }
    const result = await adapterManager.addSource(withCreds)
    if (result.ok) {
      const sources = adapterManager.getSources().map(({ config: c }) => {
        const { apiKey: _a, botToken: _b, dggAuthToken: _d, ...clean } = c
        return clean as SourceConfig
      })
      await persistence.saveSources(sources)
    }
    return result
  })

  ipcMain.handle('source:remove', async (_e, sourceId: string) => {
    await adapterManager.removeSource(sourceId)
    const sources = adapterManager.getSources().map(({ config: c }) => {
      const { apiKey: _a, botToken: _b, dggAuthToken: _d, ...clean } = c
      return clean as SourceConfig
    })
    await persistence.saveSources(sources)
  })

  ipcMain.handle('source:list', (): SourceStatus[] => adapterManager.getSources())

  // --- Settings ---
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return persistence.getSettings()
  })

  ipcMain.handle('settings:save', async (_e, settings: AppSettings) => {
    await persistence.saveSettings(settings)
    appControls.reregisterShortcuts(settings.hotkeys)
    brain.setFilterConfig(settings.filters)
  })

  // --- Overlay ---
  ipcMain.handle('overlay:open', async () => {
    await appControls.open()
  })

  ipcMain.handle('overlay:close', () => {
    appControls.close()
  })

  // --- Fire-and-forget ---
  ipcMain.on('message:answered', (_e, eventId: string) => {
    appControls.sendToOverlay('message:answered', eventId)
  })

  ipcMain.on('lane:clear', (_e, _lane: string) => {
    // Renderer handles local state; main acknowledges
  })
}
