import type { ChatEvent, Platform } from './chat-event'

export interface UserSubGroup {
  userId: string
  platform: Platform
  displayName: string
  color?: string
  events: ChatEvent[]
}

export interface TopicCluster {
  clusterId: string
  topKeyword: string
  keywords: Set<string>
  messages: ChatEvent[]
  userSubGroups: UserSubGroup[]
  firstTimestamp: number
  lastTimestamp: number
  isExpanded: boolean
}
