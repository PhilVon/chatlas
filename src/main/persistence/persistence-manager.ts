import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import type { AppSettings } from '../../types/settings'
import type { SourceConfig } from '../../types/session'
import { DEFAULT_SETTINGS } from '../../types/settings'

export class PersistenceManager {
  private dataDir: string

  constructor() {
    this.dataDir = app.getPath('userData')
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true })
  }

  private filePath(name: string): string {
    return join(this.dataDir, name)
  }

  private async readJson<T>(filename: string, fallback: T): Promise<T> {
    try {
      const content = await readFile(this.filePath(filename), 'utf-8')
      return JSON.parse(content) as T
    } catch {
      return fallback
    }
  }

  private async writeJson<T>(filename: string, data: T): Promise<void> {
    await this.ensureDir()
    await writeFile(this.filePath(filename), JSON.stringify(data, null, 2), 'utf-8')
  }

  async getSettings(): Promise<AppSettings> {
    const saved = await this.readJson<Partial<AppSettings>>('settings.json', {})
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      hotkeys:     { ...DEFAULT_SETTINGS.hotkeys,     ...(saved.hotkeys     ?? {}) },
      dock:        { ...DEFAULT_SETTINGS.dock,        ...(saved.dock        ?? {}) },
      lanes:       { ...DEFAULT_SETTINGS.lanes,       ...(saved.lanes       ?? {}) },
      display:     { ...DEFAULT_SETTINGS.display,     ...(saved.display     ?? {}) },
      credentials: { ...DEFAULT_SETTINGS.credentials, ...(saved.credentials ?? {}) },
      filters:     { ...DEFAULT_SETTINGS.filters,     ...(saved.filters     ?? {}) },
      overlay:     { ...DEFAULT_SETTINGS.overlay,     ...(saved.overlay     ?? {}) },
    }
  }

  async saveOverlayBounds(
    bounds: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    const settings = await this.getSettings()
    settings.overlay.bounds = bounds
    await this.saveSettings(settings)
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.writeJson('settings.json', settings)
  }

  async getSources(): Promise<SourceConfig[]> {
    return this.readJson<SourceConfig[]>('sources.json', [])
  }

  async saveSources(sources: SourceConfig[]): Promise<void> {
    await this.writeJson('sources.json', sources)
  }
}
