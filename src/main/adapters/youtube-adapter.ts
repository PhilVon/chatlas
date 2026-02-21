import { randomUUID } from 'crypto'
import type { ChatEvent, ChatUser } from '../../types/chat-event'
import type { SourceConfig } from '../../types/session'
import { BaseAdapter } from './base-adapter'
import { errorMessage } from '../utils/errors'

interface MessageRun {
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

interface YTLiveChatMessage {
  id: string
  snippet: {
    type: string
    publishedAt: string
    displayMessage: string
    textMessageDetails?: {
      messageText?: {
        runs?: MessageRun[]
      }
    }
    superChatDetails?: {
      amountDisplayString: string
    }
  }
  authorDetails: {
    channelId: string
    displayName: string
    isChatModerator: boolean
    isChatOwner: boolean
    isChatSponsor: boolean
    profileImageUrl?: string
  }
}

interface YTLiveChatResponse {
  nextPageToken?: string
  pollingIntervalMillis: number
  items: YTLiveChatMessage[]
}

interface InnerTubeEmoji {
  emojiId: string
  image?: {
    thumbnails: Array<{ url: string }>
  }
  shortcuts?: string[]
}

interface InnerTubeEmojiPickerResponse {
  emojiPicker?: {
    categories?: Array<{
      emojiPickerCategory?: {
        emoji?: InnerTubeEmoji[]
      }
    }>
  }
}

export class YouTubeAdapter extends BaseAdapter {
  readonly sourceId: string
  readonly config: SourceConfig

  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private nextPageToken: string | undefined
  private liveChatId: string | null = null
  private isRunning = false
  private emojiCatalogue: Record<string, string> = {}

  constructor(config: SourceConfig) {
    super()
    this.config = config
    this.sourceId = `youtube:${config.videoId}`
  }

  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      this.setStatus('missing-credentials', 'YouTube API key is required')
      return
    }

    if (!this.config.videoId) {
      this.setStatus('error', 'No video ID specified')
      return
    }

    this.setStatus('connecting')
    this.isRunning = true
    this.fetchEmojiCatalogue()

    try {
      await this.fetchLiveChatId()
      this.schedulePoll(5000)
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

  private fetchEmojiCatalogue(): void {
    fetch('https://www.youtube.com/youtubei/v1/emoji/emoji_picker?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'en' } }
      })
    })
      .then(r => r.ok ? r.json() as Promise<InnerTubeEmojiPickerResponse> : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        for (const cat of data.emojiPicker?.categories ?? []) {
          for (const emoji of cat.emojiPickerCategory?.emoji ?? []) {
            const thumbnails = emoji.image?.thumbnails ?? []
            const url = thumbnails[thumbnails.length - 1]?.url
            if (url) this.emojiCatalogue[emoji.emojiId] = url
          }
        }
      })
      .catch(() => { /* catalogue unavailable; emoji fall back to shortcode text */ })
  }

  private async fetchLiveChatId(): Promise<void> {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${this.config.videoId}&key=${this.config.apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json() as {
      items?: Array<{ liveStreamingDetails?: { activeLiveChatId?: string } }>
    }
    this.liveChatId = data.items?.[0]?.liveStreamingDetails?.activeLiveChatId ?? null

    if (!this.liveChatId) {
      throw new Error('No active live chat found for this video')
    }
  }

  private schedulePoll(ms: number): void {
    if (!this.isRunning) return
    this.pollTimer = setTimeout(() => { void this.poll() }, ms)
  }

  private async poll(): Promise<void> {
    if (!this.isRunning || !this.liveChatId) return

    try {
      const params = new URLSearchParams({
        part: 'snippet,authorDetails',
        liveChatId: this.liveChatId,
        key: this.config.apiKey!,
        ...(this.nextPageToken ? { pageToken: this.nextPageToken } : {})
      })

      const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`)
      }

      const data = await response.json() as YTLiveChatResponse

      if (this.health.status !== 'connected') {
        this.setStatus('connected')
      }

      this.nextPageToken = data.nextPageToken

      for (const item of data.items) {
        const event = this.toEvent(item)
        if (event) this.emitEvent(event)
      }

      this.schedulePoll(data.pollingIntervalMillis ?? 5000)
    } catch (err) {
      this.setStatus('error', errorMessage(err))
      this.schedulePoll(30000)
    }
  }

  private toEvent(item: YTLiveChatMessage): ChatEvent | null {
    const type = item.snippet.type
    let eventType: ChatEvent['eventType'] = 'message'

    if (type === 'superChatEvent') eventType = 'donation'
    else if (type === 'memberMilestoneChatEvent' || type === 'newSponsorEvent') eventType = 'membership'
    else if (type !== 'textMessageEvent') return null

    const user: ChatUser = {
      platformUserId: item.authorDetails.channelId,
      displayName: item.authorDetails.displayName,
      roles: [
        ...(item.authorDetails.isChatOwner ? ['owner'] : []),
        ...(item.authorDetails.isChatModerator ? ['mod'] : []),
        ...(item.authorDetails.isChatSponsor ? ['member'] : [])
      ],
      badges: [],
      avatarUrl: item.authorDetails.profileImageUrl ?? undefined
    }

    // Parse structured message runs to extract text and emoji image URLs.
    // Fallback to displayMessage when runs are absent (e.g. superChat/membership events).
    const runs = item.snippet.textMessageDetails?.messageText?.runs
    let text = item.snippet.displayMessage
    const emotes: Record<string, string[]> = {}

    if (runs && runs.length > 0) {
      let assembled = ''
      for (const run of runs) {
        if (run.text !== undefined) {
          assembled += run.text
        } else if (run.emoji) {
          const shortcut = run.emoji.shortcuts?.[0]
          const thumbnails = run.emoji.image?.thumbnails ?? []
          const imageUrl = thumbnails[thumbnails.length - 1]?.url

          if (imageUrl) {
            const label = run.emoji.image?.accessibility?.accessibilityData?.label ?? run.emoji.emojiId
            const key = shortcut ?? `:${label.replace(/\s+/g, '-')}:`
            assembled += key
            emotes[key] = [imageUrl]
          } else {
            // No image URL — if emojiId is a Unicode emoji character, embed it directly
            const isUnicodeChar = [...run.emoji.emojiId].some(c => (c.codePointAt(0) ?? 0) > 0x7F)
            if (isUnicodeChar) {
              assembled += run.emoji.emojiId
            } else {
              // YouTube-specific named emoji: look up image in the pre-fetched catalogue
              const label = run.emoji.image?.accessibility?.accessibilityData?.label ?? run.emoji.emojiId
              const key = shortcut ?? `:${label.replace(/\s+/g, '-')}:`
              assembled += key
              const catalogueUrl = this.emojiCatalogue[run.emoji.emojiId]
              if (catalogueUrl) emotes[key] = [catalogueUrl]
            }
          }
        }
      }
      text = assembled
    }

    return {
      id: `youtube-${item.id ?? randomUUID()}`,
      platform: 'youtube',
      sourceId: this.sourceId,
      eventType,
      timestamp: new Date(item.snippet.publishedAt).getTime(),
      user,
      message: {
        text,
        isReply: false,
        emotes: Object.keys(emotes).length > 0 ? emotes : undefined
      },
      lane: 'general',
      metadata: item.snippet.superChatDetails
        ? { amount: item.snippet.superChatDetails.amountDisplayString }
        : undefined
    }
  }
}
