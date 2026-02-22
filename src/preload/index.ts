import { contextBridge, ipcRenderer } from 'electron'
import type { ChatEvent } from '../types/chat-event'
import type { AppSettings } from '../types/settings'
import type { SourceConfig, PlatformStatusPayload } from '../types/session'
import type { BurstSummary } from '../types/brain'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Sources
  sourceAdd: (config: SourceConfig) => ipcRenderer.invoke('source:add', config),
  sourceRemove: (sourceId: string) => ipcRenderer.invoke('source:remove', sourceId),
  sourceList: () => ipcRenderer.invoke('source:list'),

  // Settings
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSave: (settings: AppSettings) => ipcRenderer.invoke('settings:save', settings),

  // Fire-and-forget
  messageAnswered: (eventId: string) => ipcRenderer.send('message:answered', eventId),
  laneClear: (lane: string) => ipcRenderer.send('lane:clear', lane),

  // Overlay
  overlayOpen: () => ipcRenderer.invoke('overlay:open'),
  overlayClose: () => ipcRenderer.invoke('overlay:close'),

  // Hotkeys
  onHotkey: (handler: (action: string) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, action: string) => handler(action)
    ipcRenderer.on('hotkey:fire', listener)
    return () => ipcRenderer.removeListener('hotkey:fire', listener)
  },

  // Listeners — each returns a cleanup/unsubscribe function
  onMessageAnswered: (handler: (eventId: string) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, eventId: string) => handler(eventId)
    ipcRenderer.on('message:answered', listener)
    return () => ipcRenderer.removeListener('message:answered', listener)
  },

  onChatEvents: (handler: (events: ChatEvent[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, events: ChatEvent[]) => handler(events)
    ipcRenderer.on('chat:events', listener)
    return () => ipcRenderer.removeListener('chat:events', listener)
  },

  onPlatformStatus: (handler: (payload: PlatformStatusPayload) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: PlatformStatusPayload) => handler(payload)
    ipcRenderer.on('platform:status', listener)
    return () => ipcRenderer.removeListener('platform:status', listener)
  },

  onBurstUpdate: (handler: (summary: BurstSummary) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, summary: BurstSummary) => handler(summary)
    ipcRenderer.on('burst:update', listener)
    return () => ipcRenderer.removeListener('burst:update', listener)
  }
})
