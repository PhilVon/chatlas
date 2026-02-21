import type { ChatEvent, LaneType } from '../../types/chat-event'
import type { BurstSummary } from '../../types/brain'
import type { FilterSettings } from '../../types/settings'
import { DEFAULT_SETTINGS } from '../../types/settings'
import { classifyEvent } from './classifier'
import { BurstDetector } from './burst-detector'
import { extractTopKeywords } from './summarizer'

export class Brain {
  private burstDetector: BurstDetector
  private recentMessages = new Map<LaneType, string[]>()
  private streamerName?: string
  private burstHandler: ((summary: BurstSummary) => void) | null = null
  private lastBurstEmit = new Map<LaneType, number>()
  private readonly BURST_EMIT_THROTTLE_MS = 2000
  private filterConfig: FilterSettings = DEFAULT_SETTINGS.filters

  constructor(threshold = 30, streamerName?: string) {
    this.burstDetector = new BurstDetector(threshold)
    this.streamerName = streamerName
  }

  setThreshold(threshold: number): void {
    this.burstDetector.setThreshold(threshold)
  }

  setFilterConfig(filters: FilterSettings): void {
    this.filterConfig = filters
  }

  onBurst(handler: (summary: BurstSummary) => void): void {
    this.burstHandler = handler
  }

  process(event: ChatEvent): ChatEvent {
    // Username-based bot detection (Twitch / YouTube — Discord sets isBot at the adapter level)
    if (!event.user.isBot && this.filterConfig.botUsernames.length) {
      const nameLower = event.user.displayName.toLowerCase()
      if (this.filterConfig.botUsernames.some(b => b.toLowerCase() === nameLower)) {
        event = { ...event, user: { ...event.user, isBot: true } }
      }
    }

    const result = classifyEvent(event, this.streamerName, this.filterConfig)
    const classified = { ...event, lane: result.lane }

    const burstState = this.burstDetector.record(classified.lane)

    const text = event.message?.text
    if (text) {
      const msgs = this.recentMessages.get(classified.lane) ?? []
      msgs.push(text)
      if (msgs.length > 50) msgs.shift()
      this.recentMessages.set(classified.lane, msgs)
    }

    const now = Date.now()
    const lastEmit = this.lastBurstEmit.get(classified.lane) ?? 0
    if (now - lastEmit > this.BURST_EMIT_THROTTLE_MS) {
      this.lastBurstEmit.set(classified.lane, now)
      const msgs = this.recentMessages.get(classified.lane) ?? []
      const summary: BurstSummary = {
        lane: classified.lane,
        isActive: burstState.isActive,
        messageCount: burstState.messageCount,
        topKeywords: extractTopKeywords(msgs),
        windowMs: 60_000
      }
      this.burstHandler?.(summary)
    }

    return classified
  }
}
