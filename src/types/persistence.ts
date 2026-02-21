import type { AppSettings } from './settings'
import type { SourceConfig } from './session'

export interface PersistedState {
  settings: AppSettings
  sources: SourceConfig[]
}
