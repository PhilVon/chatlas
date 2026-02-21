import type { ChatEvent } from '../../types/chat-event'
import type { SourceConfig, SourceStatusType } from '../../types/session'

export interface AdapterHealth {
  status: SourceStatusType
  error?: string
  lastEventAt?: number
}

export interface IPlatformAdapter {
  readonly sourceId: string
  readonly config: SourceConfig
  connect(): Promise<void>
  disconnect(): Promise<void>
  getHealth(): AdapterHealth
  onEvent(handler: (event: ChatEvent) => void): void
  onStatusChange(handler: (status: SourceStatusType, error?: string) => void): void
}
