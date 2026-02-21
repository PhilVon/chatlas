export type Platform = 'twitch' | 'youtube' | 'discord' | 'destinygg'

export type EventType =
  | 'message'
  | 'sub'
  | 'donation'
  | 'follow'
  | 'raid'
  | 'membership'
  | 'system'
  | 'modNote'

export type LaneType = 'alerts' | 'questions' | 'general'

export interface ChatUser {
  platformUserId: string
  displayName: string
  roles: string[]
  badges: string[]
  color?: string
  avatarUrl?: string
  isBot?: boolean
}

export interface ChatMessage {
  text: string
  isReply: boolean
  replyToId?: string
  emotes?: Record<string, string[]>
}

export interface ChatEvent {
  id: string
  platform: Platform
  sourceId: string
  eventType: EventType
  timestamp: number
  user: ChatUser
  message?: ChatMessage
  lane: LaneType
  metadata?: Record<string, unknown>
}
