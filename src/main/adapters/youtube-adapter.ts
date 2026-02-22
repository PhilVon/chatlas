import { randomUUID } from 'crypto'
import { net } from 'electron'
import type { ChatEvent, ChatUser } from '../../types/chat-event'
import type { SourceConfig } from '../../types/session'
import { BaseAdapter } from './base-adapter'
import { errorMessage } from '../utils/errors'

// --- InnerTube response shape interfaces ---

interface ITRun {
  text?: string
  emoji?: {
    emojiId: string
    shortcuts?: string[]
    image?: {
      thumbnails: Array<{ url: string; width?: number; height?: number }>
      accessibility?: { accessibilityData?: { label?: string } }
    }
  }
}

interface ITAuthorBadge {
  liveChatAuthorBadgeRenderer?: {
    tooltip?: string
  }
}

interface ITThumbnail {
  thumbnails: Array<{ url: string }>
}

interface ITTextMessageRenderer {
  id: string
  timestampUsec: string
  authorName: { simpleText: string }
  authorExternalChannelId: string
  authorBadges?: ITAuthorBadge[]
  authorPhoto: ITThumbnail
  message: { runs: ITRun[] }
}

interface ITSuperChatRenderer {
  id: string
  timestampUsec: string
  authorName: { simpleText: string }
  authorExternalChannelId: string
  authorBadges?: ITAuthorBadge[]
  authorPhoto: ITThumbnail
  message?: { runs: ITRun[] }
  purchaseAmountText: { simpleText: string }
}

interface ITMembershipRenderer {
  id: string
  timestampUsec: string
  authorName: { simpleText: string }
  authorExternalChannelId: string
  authorPhoto: ITThumbnail
  headerSubtext: { runs: ITRun[] }
}

interface ITGiftRedemptionRenderer {
  id: string
  timestampUsec: string
  authorName: { simpleText: string }
  authorExternalChannelId: string
  authorPhoto: ITThumbnail
}

interface ITChatItem {
  liveChatTextMessageRenderer?: ITTextMessageRenderer
  liveChatPaidMessageRenderer?: ITSuperChatRenderer
  liveChatMembershipItemRenderer?: ITMembershipRenderer
  liveChatSponsorshipsGiftRedemptionAnnouncementRenderer?: ITGiftRedemptionRenderer
}

interface ITAction {
  addChatItemAction?: { item: ITChatItem }
}

interface ITLiveChatResponse {
  continuationContents?: {
    liveChatContinuation?: {
      actions?: ITAction[]
      continuations?: ITContinuationEntry[]
    }
  }
}

interface ITContinuationEntry {
  timedContinuationData?: { continuation: string }
  invalidationContinuationData?: { continuation: string }
  reloadContinuationData?: { continuation: string }
}

interface ITLiveChatRef {
  continuations?: ITContinuationEntry[]
}

// Response shape for /youtubei/v1/next (used to get the initial chat continuation)
interface YTNextResponse {
  contents?: {
    twoColumnWatchNextResults?: {
      conversationBar?: { liveChatRenderer?: ITLiveChatRef }
    }
  }
  engagementPanels?: Array<{
    engagementPanelSectionListRenderer?: {
      content?: { liveChatRenderer?: ITLiveChatRef }
    }
  }>
}

// YouTube's own public web client key embedded in every YouTube page
const YT_WEB_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

const YT_CLIENT_CONTEXT = {
  client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'en' }
}

export class YouTubeAdapter extends BaseAdapter {
  readonly sourceId: string
  readonly config: SourceConfig

  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private isRunning = false
  private continuation: string | null = null
  private retryCount = 0
  private readonly MAX_RETRIES = 5

  constructor(config: SourceConfig) {
    super()
    this.config = config
    this.sourceId = `youtube:${config.videoId}`
  }

  async connect(): Promise<void> {
    if (!this.config.videoId) {
      this.setStatus('error', 'No video ID specified')
      return
    }

    this.setStatus('connecting')
    this.isRunning = true
    this.retryCount = 0

    try {
      await this.fetchInitialContinuation()
      this.schedulePoll(0)
    } catch (err) {
      this.setStatus('error', errorMessage(err))
    }
  }

  async disconnect(): Promise<void> {
    this.isRunning = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    this.setStatus('disconnected')
  }

  private async fetchInitialContinuation(): Promise<void> {
    // Use the InnerTube /next endpoint — same API family as polling, no HTML scraping needed.
    // This avoids consent-wall redirects that occur when fetching the live_chat HTML page.
    const response = await net.fetch(
      `https://www.youtube.com/youtubei/v1/next?key=${YT_WEB_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: YT_CLIENT_CONTEXT, videoId: this.config.videoId })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch video info: HTTP ${response.status}`)
    }

    const data = await response.json() as YTNextResponse
    this.continuation = this.pickInitialContinuation(data)
    if (!this.continuation) {
      throw new Error('No active live chat found for this video')
    }
  }

  private pickInitialContinuation(data: YTNextResponse): string | null {
    // Check engagement panels (primary location on live videos)
    for (const panel of data.engagementPanels ?? []) {
      const renderer = panel.engagementPanelSectionListRenderer?.content?.liveChatRenderer
      if (renderer) {
        const token = this.pickContinuationToken(renderer.continuations)
        if (token) return token
      }
    }
    // Fallback: twoColumnWatchNextResults conversationBar
    const renderer = data.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer
    if (renderer) {
      const token = this.pickContinuationToken(renderer.continuations)
      if (token) return token
    }
    return null
  }

  private pickContinuationToken(continuations: ITContinuationEntry[] | undefined): string | null {
    for (const c of continuations ?? []) {
      const token = c.reloadContinuationData?.continuation
                    ?? c.timedContinuationData?.continuation
                    ?? c.invalidationContinuationData?.continuation
      if (token) return token
    }
    return null
  }

  private schedulePoll(ms: number): void {
    if (!this.isRunning) return
    this.pollTimer = setTimeout(() => { void this.poll() }, ms)
  }

  private async poll(): Promise<void> {
    if (!this.isRunning || !this.continuation) return

    try {
      const response = await net.fetch(
        `https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=${YT_WEB_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: YT_CLIENT_CONTEXT, continuation: this.continuation })
        }
      )

      if (!response.ok) {
        throw new Error(`InnerTube error: HTTP ${response.status}`)
      }

      const data = await response.json() as ITLiveChatResponse
      const continuation = data.continuationContents?.liveChatContinuation

      if (!continuation) {
        throw new Error('Live chat ended or unavailable')
      }

      // Update continuation token and polling interval
      const nextCont = continuation.continuations?.[0]
      const token = this.pickContinuationToken(continuation.continuations)
      if (token) this.continuation = token
      const delayMs = nextCont?.timedContinuationData?.timeoutMs
                      ?? nextCont?.invalidationContinuationData?.timeoutMs
                      ?? 5000

      if (this.health.status !== 'connected') {
        this.setStatus('connected')
      }
      this.retryCount = 0

      for (const action of continuation.actions ?? []) {
        const item = action.addChatItemAction?.item
        if (!item) continue
        const event = this.toEvent(item)
        if (event) this.emitEvent(event)
      }

      this.schedulePoll(delayMs)
    } catch (err) {
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++
        const backoff = Math.min(1000 * Math.pow(2, this.retryCount), 60000)
        this.schedulePoll(backoff)
      } else {
        this.setStatus('error', errorMessage(err))
      }
    }
  }

  private extractUser(
    renderer: {
      authorName: { simpleText: string }
      authorExternalChannelId: string
      authorBadges?: ITAuthorBadge[]
      authorPhoto: ITThumbnail
    }
  ): ChatUser {
    const roles: string[] = []
    for (const badge of renderer.authorBadges ?? []) {
      const tooltip = badge.liveChatAuthorBadgeRenderer?.tooltip?.toLowerCase() ?? ''
      if (tooltip.includes('owner')) roles.push('owner')
      else if (tooltip.includes('moderator')) roles.push('mod')
      else if (tooltip.includes('member')) roles.push('member')
    }

    const thumbnails = renderer.authorPhoto.thumbnails
    const avatarUrl = thumbnails[thumbnails.length - 1]?.url

    return {
      platformUserId: renderer.authorExternalChannelId,
      displayName: renderer.authorName.simpleText,
      roles,
      badges: [],
      avatarUrl
    }
  }

  private parseRuns(runs: ITRun[]): { text: string; emotes?: Record<string, string[]> } {
    let assembled = ''
    const emotes: Record<string, string[]> = {}

    for (const run of runs) {
      if (run.text !== undefined) {
        assembled += run.text
      } else if (run.emoji) {
        const thumbnails = run.emoji.image?.thumbnails ?? []
        const imageUrl = thumbnails[thumbnails.length - 1]?.url

        if (imageUrl) {
          // Custom emoji with image — use shortcode as placeholder
          const label = run.emoji.image?.accessibility?.accessibilityData?.label ?? run.emoji.emojiId
          const key = run.emoji.shortcuts?.[0] ?? `:${label.replace(/\s+/g, '-')}:`
          assembled += key
          emotes[key] = [imageUrl]
        } else {
          // Check if emojiId is a Unicode character (non-ASCII)
          const isUnicodeChar = [...run.emoji.emojiId].some(c => (c.codePointAt(0) ?? 0) > 0x7F)
          if (isUnicodeChar) {
            assembled += run.emoji.emojiId
          } else {
            // Named emoji with no image — fall back to shortcode text
            const label = run.emoji.image?.accessibility?.accessibilityData?.label ?? run.emoji.emojiId
            const key = run.emoji.shortcuts?.[0] ?? `:${label.replace(/\s+/g, '-')}:`
            assembled += key
          }
        }
      }
    }

    return {
      text: assembled,
      emotes: Object.keys(emotes).length > 0 ? emotes : undefined
    }
  }

  private toEvent(item: ITChatItem): ChatEvent | null {
    if (item.liveChatTextMessageRenderer) return this.textRendererToEvent(item.liveChatTextMessageRenderer)
    if (item.liveChatPaidMessageRenderer) return this.superChatToEvent(item.liveChatPaidMessageRenderer)
    if (item.liveChatMembershipItemRenderer) return this.membershipToEvent(item.liveChatMembershipItemRenderer)
    if (item.liveChatSponsorshipsGiftRedemptionAnnouncementRenderer) return this.giftRedemptionToEvent(item.liveChatSponsorshipsGiftRedemptionAnnouncementRenderer)
    return null
  }

  private textRendererToEvent(r: ITTextMessageRenderer): ChatEvent {
    const { text, emotes } = this.parseRuns(r.message.runs)
    return {
      id: `youtube-${r.id ?? randomUUID()}`,
      platform: 'youtube',
      sourceId: this.sourceId,
      eventType: 'message',
      timestamp: Math.floor(Number(r.timestampUsec) / 1000),
      user: this.extractUser(r),
      message: { text, isReply: false, emotes },
      lane: 'general'
    }
  }

  private superChatToEvent(r: ITSuperChatRenderer): ChatEvent {
    const runs = r.message?.runs ?? []
    const { text, emotes } = this.parseRuns(runs)
    return {
      id: `youtube-${r.id ?? randomUUID()}`,
      platform: 'youtube',
      sourceId: this.sourceId,
      eventType: 'donation',
      timestamp: Math.floor(Number(r.timestampUsec) / 1000),
      user: this.extractUser(r),
      message: { text, isReply: false, emotes },
      lane: 'alerts',
      metadata: { amount: r.purchaseAmountText.simpleText }
    }
  }

  private membershipToEvent(r: ITMembershipRenderer): ChatEvent {
    const { text, emotes } = this.parseRuns(r.headerSubtext.runs)
    return {
      id: `youtube-${r.id ?? randomUUID()}`,
      platform: 'youtube',
      sourceId: this.sourceId,
      eventType: 'membership',
      timestamp: Math.floor(Number(r.timestampUsec) / 1000),
      user: this.extractUser(r),
      message: { text, isReply: false, emotes },
      lane: 'alerts'
    }
  }

  private giftRedemptionToEvent(r: ITGiftRedemptionRenderer): ChatEvent {
    return {
      id: `youtube-${r.id ?? randomUUID()}`,
      platform: 'youtube',
      sourceId: this.sourceId,
      eventType: 'membership',
      timestamp: Math.floor(Number(r.timestampUsec) / 1000),
      user: this.extractUser(r),
      message: { text: '', isReply: false },
      lane: 'alerts',
      metadata: { gifted: true }
    }
  }
}
