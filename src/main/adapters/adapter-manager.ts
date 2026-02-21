import type { ChatEvent } from '../../types/chat-event'
import type { SourceConfig, SourceStatusType, PlatformStatusPayload } from '../../types/session'
import type { IPlatformAdapter } from './adapter-interface'
import { TwitchAdapter } from './twitch-adapter'
import { YouTubeAdapter } from './youtube-adapter'
import { DiscordAdapter } from './discord-adapter'
import { DestinyggAdapter } from './destinygg-adapter'
import { KickAdapter } from './kick-adapter'
import { errorMessage } from '../utils/errors'

export class AdapterManager {
  private adapters = new Map<string, IPlatformAdapter>()
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private reconnectAttempts = new Map<string, number>()

  private eventHandler: ((event: ChatEvent) => void) | null = null
  private statusHandler: ((payload: PlatformStatusPayload) => void) | null = null

  onEvent(handler: (event: ChatEvent) => void): void {
    this.eventHandler = handler
  }

  onStatus(handler: (payload: PlatformStatusPayload) => void): void {
    this.statusHandler = handler
  }

  async addSource(config: SourceConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const adapter = this.createAdapter(config)
      const sourceId = adapter.sourceId

      if (this.adapters.has(sourceId)) {
        return { ok: false, error: 'Source already exists' }
      }

      adapter.onEvent((event) => {
        this.eventHandler?.(event)
      })

      adapter.onStatusChange((status: SourceStatusType, error?: string) => {
        this.statusHandler?.({ sourceId, platform: config.type, status, error })

        if (status === 'error' && (config.type === 'twitch' || config.type === 'discord' || config.type === 'destinygg' || config.type === 'kick')) {
          this.scheduleReconnect(sourceId)
        }
      })

      this.adapters.set(sourceId, adapter)
      await adapter.connect()

      return { ok: true }
    } catch (err) {
      return { ok: false, error: errorMessage(err) }
    }
  }

  async removeSource(sourceId: string): Promise<void> {
    const adapter = this.adapters.get(sourceId)
    if (adapter) {
      this.cancelReconnect(sourceId)
      await adapter.disconnect()
      this.adapters.delete(sourceId)
      this.reconnectAttempts.delete(sourceId)
    }
  }

  getSources(): Array<{ sourceId: string; config: SourceConfig; status: SourceStatusType }> {
    return Array.from(this.adapters.entries()).map(([sourceId, adapter]) => ({
      sourceId,
      config: adapter.config,
      status: adapter.getHealth().status
    }))
  }

  async disconnectAll(): Promise<void> {
    for (const [sourceId, adapter] of this.adapters) {
      this.cancelReconnect(sourceId)
      await adapter.disconnect()
    }
    this.adapters.clear()
    this.reconnectAttempts.clear()
  }

  private createAdapter(config: SourceConfig): IPlatformAdapter {
    if (config.type === 'twitch') return new TwitchAdapter(config)
    if (config.type === 'youtube') return new YouTubeAdapter(config)
    if (config.type === 'discord') return new DiscordAdapter(config)
    if (config.type === 'destinygg') return new DestinyggAdapter(config)
    if (config.type === 'kick') return new KickAdapter(config)
    throw new Error(`Unknown platform: ${config.type}`)
  }

  private scheduleReconnect(sourceId: string): void {
    this.cancelReconnect(sourceId)
    const attempts = (this.reconnectAttempts.get(sourceId) ?? 0) + 1
    this.reconnectAttempts.set(sourceId, attempts)
    const delay = Math.min(1000 * Math.pow(2, attempts - 1), 60000)

    this.reconnectTimers.set(sourceId, setTimeout(() => {
      const adapter = this.adapters.get(sourceId)
      if (adapter) {
        void adapter.connect()
      }
    }, delay))
  }

  private cancelReconnect(sourceId: string): void {
    const timer = this.reconnectTimers.get(sourceId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(sourceId)
    }
  }
}
