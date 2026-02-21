import type { ChatEvent } from '../../types/chat-event'
import type { SourceConfig, SourceStatusType } from '../../types/session'
import type { IPlatformAdapter, AdapterHealth } from './adapter-interface'

export abstract class BaseAdapter implements IPlatformAdapter {
  abstract readonly sourceId: string
  abstract readonly config: SourceConfig
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>

  protected health: AdapterHealth = { status: 'disconnected' }
  private eventHandler: ((event: ChatEvent) => void) | null = null
  private statusHandler: ((status: SourceStatusType, error?: string) => void) | null = null

  onEvent(handler: (event: ChatEvent) => void): void {
    this.eventHandler = handler
  }

  onStatusChange(handler: (status: SourceStatusType, error?: string) => void): void {
    this.statusHandler = handler
  }

  getHealth(): AdapterHealth {
    return { ...this.health }
  }

  protected setStatus(status: SourceStatusType, error?: string): void {
    this.health = { status, error, lastEventAt: this.health.lastEventAt }
    this.statusHandler?.(status, error)
  }

  protected emitEvent(event: ChatEvent): void {
    this.health.lastEventAt = Date.now()
    this.eventHandler?.(event)
  }
}
