import WebSocket from 'ws'
import { randomUUID } from 'crypto'
import { net } from 'electron'
import type { ChatEvent, ChatUser } from '../../types/chat-event'
import type { SourceConfig } from '../../types/session'
import { BaseAdapter } from './base-adapter'
import { errorMessage } from '../utils/errors'

interface PusherFrame { event: string; data: string; channel?: string }

interface KickBadge { type: string; text: string; count?: number }
interface KickSender {
  id: number; username: string; slug: string
  identity?: { color?: string; badges?: KickBadge[] }
}
interface KickChatMessage {
  id: string; chatroom_id: number; content: string; type: string
  created_at: string; sender: KickSender
}
interface KickSubscription { username: string; months: number; channel: { slug: string } }
interface KickGiftedSubs { gifted_username: string; gifter_username: string; channel: { slug: string } }
interface KickEmoteSet { id: number; emotes: Array<{ id: number; name: string }> }
interface KickChannelResponse { chatroom: { id: number }; emotes?: KickEmoteSet[] }

const PUSHER_URL =
  'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679' +
  '?protocol=7&client=js&version=8.4.0-rc2&flash=false'
const KICK_API_BASE = 'https://kick.com/api/v1'
const KICK_EMOTE_BASE = 'https://files.kick.com/emotes'

export class KickAdapter extends BaseAdapter {
  readonly sourceId: string
  readonly config: SourceConfig
  private ws: WebSocket | null = null
  private chatroomId: number | null = null
  private emoteUrls: Map<string, string> = new Map()
  private destroyed = false
  private pingTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: SourceConfig) {
    super()
    this.config = config
    this.sourceId = `kick:${config.channel}`
  }

  async connect(): Promise<void> {
    if (this.destroyed) return
    if (!this.config.channel) { this.setStatus('error', 'No channel specified'); return }
    this.setStatus('connecting')
    try {
      const data = await this.fetchChannelData(this.config.channel)
      this.chatroomId = data.chatroom.id
      this.buildEmoteMap(data.emotes ?? [])
    } catch (err) {
      this.setStatus('error', `Failed to fetch channel: ${errorMessage(err)}`)
      return
    }
    this.openSocket()
  }

  async disconnect(): Promise<void> {
    this.destroyed = true
    this.clearPingTimer()
    if (this.ws) { try { this.ws.close() } catch { /* ignore */ }; this.ws = null }
    this.setStatus('disconnected')
  }

  private async fetchChannelData(slug: string): Promise<KickChannelResponse> {
    const res = await net.fetch(`${KICK_API_BASE}/channels/${slug}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://kick.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<KickChannelResponse>
  }

  private buildEmoteMap(sets: KickEmoteSet[]): void {
    for (const set of sets)
      for (const e of set.emotes)
        this.emoteUrls.set(e.name, `${KICK_EMOTE_BASE}/${e.id}/fullsize`)
  }

  private openSocket(): void {
    if (this.destroyed) return
    const socket = new WebSocket(PUSHER_URL)
    this.ws = socket
    socket.on('message', (raw) => { if (!this.destroyed) this.handleFrame(raw.toString()) })
    socket.on('close', (_code, reason) => {
      this.clearPingTimer()
      if (!this.destroyed) this.setStatus('error', reason?.toString() || 'WebSocket closed')
    })
    socket.on('error', (err) => {
      this.clearPingTimer()
      if (!this.destroyed) this.setStatus('error', err.message)
    })
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.chatroomId === null) return
    this.ws.send(JSON.stringify({
      event: 'pusher:subscribe',
      data: { auth: '', channel: `chatrooms.${this.chatroomId}.v2` }
    }))
  }

  private handleFrame(raw: string): void {
    let frame: PusherFrame
    try { frame = JSON.parse(raw) as PusherFrame } catch { return }

    switch (frame.event) {
      case 'pusher:connection_established':
        this.subscribe()
        this.setStatus('connected')
        this.startPingTimer()
        break
      case 'pusher:ping':
        if (this.ws?.readyState === WebSocket.OPEN)
          this.ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }))
        break
      case 'App\\Events\\ChatMessageEvent':
        try { this.handleChatMessage(JSON.parse(frame.data) as KickChatMessage) } catch { /**/ }
        break
      case 'App\\Events\\SubscriptionEvent':
        try { this.handleSubscription(JSON.parse(frame.data) as KickSubscription) } catch { /**/ }
        break
      case 'App\\Events\\GiftedSubscriptionsEvent':
        try { this.handleGiftedSub(JSON.parse(frame.data) as KickGiftedSubs) } catch { /**/ }
        break
    }
  }

  private startPingTimer(): void {
    this.clearPingTimer()
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN)
        this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }))
    }, 60_000)
  }

  private clearPingTimer(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
  }

  private handleChatMessage(data: KickChatMessage): void {
    const identity = data.sender.identity
    const user: ChatUser = {
      platformUserId: String(data.sender.id),
      displayName: data.sender.username,
      roles: this.extractRoles(identity?.badges ?? []),
      badges: (identity?.badges ?? []).map(b => b.type),
      color: identity?.color ?? undefined
    }
    const emotes = this.parseEmotes(data.content)
    const event: ChatEvent = {
      id: `kick-${data.id}`,
      platform: 'kick',
      sourceId: this.sourceId,
      eventType: 'message',
      timestamp: new Date(data.created_at).getTime(),
      user,
      message: {
        text: data.content,
        isReply: false,
        emotes: Object.keys(emotes).length > 0 ? emotes : undefined
      },
      lane: 'general'
    }
    this.emitEvent(event)
  }

  private handleSubscription(data: KickSubscription): void {
    this.emitEvent({
      id: `kick-sub-${randomUUID()}`,
      platform: 'kick', sourceId: this.sourceId, eventType: 'sub',
      timestamp: Date.now(),
      user: { platformUserId: data.username.toLowerCase(), displayName: data.username, roles: ['subscriber'], badges: ['subscriber'] },
      lane: 'general',
      metadata: { months: data.months }
    })
  }

  private handleGiftedSub(data: KickGiftedSubs): void {
    this.emitEvent({
      id: `kick-gift-${randomUUID()}`,
      platform: 'kick', sourceId: this.sourceId, eventType: 'sub',
      timestamp: Date.now(),
      user: { platformUserId: data.gifter_username.toLowerCase(), displayName: data.gifter_username, roles: [], badges: [] },
      lane: 'general',
      metadata: { gifted_to: data.gifted_username }
    })
  }

  private parseEmotes(text: string): Record<string, string[]> {
    const result: Record<string, string[]> = {}

    // Handle bracket-format emotes: [emote:1730776:emojiGoofy]
    const bracketEmoteRegex = /\[emote:(\d+):(\w+)\]/g
    let match: RegExpExecArray | null
    while ((match = bracketEmoteRegex.exec(text)) !== null) {
      const [fullMatch, id, name] = match
      if (!(fullMatch in result)) {
        const url = this.emoteUrls.get(name) ?? `${KICK_EMOTE_BASE}/${id}/fullsize`
        result[fullMatch] = [url]
      }
    }

    // Word-based emote matching (for any non-bracket emotes)
    for (const word of text.split(/\s+/)) {
      if (word && !(word in result)) {
        const url = this.emoteUrls.get(word)
        if (url) result[word] = [url]
      }
    }

    return result
  }

  private extractRoles(badges: KickBadge[]): string[] {
    const map: Record<string, string> = {
      broadcaster: 'broadcaster', moderator: 'mod', subscriber: 'subscriber',
      vip: 'vip', og: 'og', verified: 'verified'
    }
    return badges.map(b => map[b.type]).filter(Boolean)
  }
}
