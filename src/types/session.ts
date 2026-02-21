import type { Platform } from './chat-event'

export interface SourceConfig {
  type: Platform
  channel?: string
  videoId?: string
  apiKey?: string
  discordChannelId?: string
  botToken?: string
  guildId?: string
  dggAuthToken?: string
}

export type SourceStatusType =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'missing-credentials'

export interface SourceStatus {
  sourceId: string
  config: SourceConfig
  status: SourceStatusType
  error?: string
}

export interface PlatformStatusPayload {
  sourceId: string
  platform: Platform
  status: SourceStatusType
  error?: string
}
