import type { LaneType, Platform } from './chat-event'

export interface BurstState {
  lane: LaneType
  isActive: boolean
  messageCount: number
  windowStartMs: number
}

export interface BurstSummary {
  lane: LaneType
  isActive: boolean
  messageCount: number
  topKeywords: string[]
  windowMs: number
}

export interface ClassificationResult {
  lane: LaneType
}

export interface QuestionGroup {
  groupId: string
  representativeText: string
  eventIds: string[]
  askers: Array<{
    userId: string
    displayName: string
    color?: string
    platform: Platform
  }>
  keywords: string[]
  firstTimestamp: number
  lastTimestamp: number
  isAnswered: boolean
}
