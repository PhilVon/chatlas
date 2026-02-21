import { create } from 'zustand'
import type { AppSettings } from '../../types/settings'
import { DEFAULT_SETTINGS } from '../../types/settings'

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  save: (settings: AppSettings) => Promise<void>
  update: (settings: AppSettings) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    try {
      const settings = await window.electronAPI.settingsGet()
      set({ settings, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  save: async (settings: AppSettings) => {
    set({ settings })
    await window.electronAPI.settingsSave(settings)
  },

  update: (settings: AppSettings) => set({ settings })
}))
