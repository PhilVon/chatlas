import type { ChatEvent } from './chat-event'
import type { AppSettings } from './settings'
import type { SourceConfig, SourceStatus, PlatformStatusPayload } from './session'
import type { BurstSummary } from './brain'

export interface ElectronAPI {
  // Window controls
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  windowIsMaximized: () => Promise<boolean>

  // Sources
  sourceAdd: (config: SourceConfig) => Promise<{ ok: boolean; error?: string }>
  sourceRemove: (sourceId: string) => Promise<void>
  sourceList: () => Promise<SourceStatus[]>

  // Settings
  settingsGet: () => Promise<AppSettings>
  settingsSave: (settings: AppSettings) => Promise<void>

  // Fire-and-forget
  messageAnswered: (eventId: string) => void
  laneClear: (lane: string) => void

  // Overlay
  overlayOpen: () => Promise<void>
  overlayClose: () => Promise<void>

  // Hotkeys (fired from main via globalShortcut)
  onHotkey: (handler: (action: string) => void) => () => void

  // Listeners (return cleanup function)
  onMessageAnswered: (handler: (eventId: string) => void) => () => void
  onChatEvent: (handler: (event: ChatEvent) => void) => () => void
  onPlatformStatus: (handler: (payload: PlatformStatusPayload) => void) => () => void
  onBurstUpdate: (handler: (summary: BurstSummary) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
