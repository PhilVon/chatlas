import WebSocket from 'ws'
import type { ClientOptions } from 'ws'
import { randomUUID } from 'crypto'
import type { ChatEvent, ChatUser } from '../../types/chat-event'
import type { SourceConfig } from '../../types/session'
import { BaseAdapter } from './base-adapter'

interface DggMsgPayload {
  nick: string
  features: string[]
  timestamp: number
  data: string
  message_id: number
}

interface DggBroadcastPayload {
  data: string
}

interface DggMutePayload {
  nick: string
  sender: string
  features: string[]
}

interface DggBanPayload {
  nick: string
  sender: string
  features: string[]
}

interface DggEmoteEntry {
  prefix: string
  image: Array<{ url: string }>
}

const SYSTEM_USER: ChatUser = {
  platformUserId: 'system',
  displayName: 'System',
  roles: ['admin'],
  badges: []
}

export class DestinyggAdapter extends BaseAdapter {
  readonly sourceId: string = 'destinygg:main'
  readonly config: SourceConfig

  private ws: WebSocket | null = null
  private emoteUrls: Map<string, string> = new Map()
  private destroyed = false

  constructor(config: SourceConfig) {
    super()
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.destroyed) return
    this.setStatus('connecting')
    this.fetchEmotes()

    const options: ClientOptions = {}
    if (this.config.dggAuthToken) {
      options.headers = { Cookie: `authtoken=${this.config.dggAuthToken}` }
    }

    const socket = new WebSocket('wss://chat.destiny.gg/ws', options)
    this.ws = socket

    socket.on('open', () => {
      if (!this.destroyed) this.setStatus('connected')
    })

    socket.on('message', (raw) => {
      if (!this.destroyed) this.handleRaw(raw.toString())
    })

    socket.on('close', (_code, reason) => {
      if (!this.destroyed) this.setStatus('error', reason?.toString() || 'WebSocket closed')
    })

    socket.on('error', (err) => {
      if (!this.destroyed) this.setStatus('error', err.message)
    })
  }

  async disconnect(): Promise<void> {
    this.destroyed = true
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  private handleRaw(raw: string): void {
    const spaceIdx = raw.indexOf(' ')
    if (spaceIdx === -1) return

    const msgType = raw.slice(0, spaceIdx)
    const jsonStr = raw.slice(spaceIdx + 1)

    switch (msgType) {
      case 'MSG': {
        try {
          const payload = JSON.parse(jsonStr) as DggMsgPayload
          this.handleMsg(payload)
        } catch {
          // ignore malformed
        }
        break
      }
      case 'BROADCAST': {
        try {
          const payload = JSON.parse(jsonStr) as DggBroadcastPayload
          const event: ChatEvent = {
            id: `destinygg-broadcast-${randomUUID()}`,
            platform: 'destinygg',
            sourceId: this.sourceId,
            eventType: 'system',
            timestamp: Date.now(),
            user: SYSTEM_USER,
            message: { text: payload.data, isReply: false },
            lane: 'general'
          }
          this.emitEvent(event)
        } catch {
          // ignore malformed
        }
        break
      }
      case 'MUTE': {
        try {
          const payload = JSON.parse(jsonStr) as DggMutePayload
          const event: ChatEvent = {
            id: `destinygg-mute-${randomUUID()}`,
            platform: 'destinygg',
            sourceId: this.sourceId,
            eventType: 'system',
            timestamp: Date.now(),
            user: SYSTEM_USER,
            message: { text: `${payload.nick} was muted by ${payload.sender}`, isReply: false },
            lane: 'general',
            metadata: { action: 'mute', target: payload.nick }
          }
          this.emitEvent(event)
        } catch {
          // ignore malformed
        }
        break
      }
      case 'BAN': {
        try {
          const payload = JSON.parse(jsonStr) as DggBanPayload
          const event: ChatEvent = {
            id: `destinygg-ban-${randomUUID()}`,
            platform: 'destinygg',
            sourceId: this.sourceId,
            eventType: 'system',
            timestamp: Date.now(),
            user: SYSTEM_USER,
            message: { text: `${payload.nick} was banned by ${payload.sender}`, isReply: false },
            lane: 'general',
            metadata: { action: 'ban', target: payload.nick }
          }
          this.emitEvent(event)
        } catch {
          // ignore malformed
        }
        break
      }
      case 'PING': {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('PONG {}')
        }
        break
      }
      case 'ERR': {
        console.warn('[DestinyggAdapter] Server error:', jsonStr)
        break
      }
      default:
        break
    }
  }

  private handleMsg(payload: DggMsgPayload): void {
    const emotes = this.parseEmotes(payload.data)
    const user: ChatUser = {
      platformUserId: payload.nick.toLowerCase(),
      displayName: payload.nick,
      roles: this.extractRoles(payload.features),
      badges: payload.features,
      isBot: payload.features.includes('bot') || undefined
    }
    const event: ChatEvent = {
      id: `destinygg-${payload.message_id}-${randomUUID()}`,
      platform: 'destinygg',
      sourceId: this.sourceId,
      eventType: 'message',
      timestamp: payload.timestamp,
      user,
      message: {
        text: payload.data,
        isReply: false,
        emotes: Object.keys(emotes).length > 0 ? emotes : undefined
      },
      lane: 'general'
    }
    this.emitEvent(event)
  }

  private extractRoles(features: string[]): string[] {
    const roles: string[] = []
    for (const f of features) {
      switch (f) {
        case 'admin':           roles.push('admin'); break
        case 'moderator':       roles.push('mod'); break
        case 'vip':             roles.push('vip'); break
        case 'bot':             roles.push('bot'); break
        case 'subscriber':      roles.push('subscriber'); break
        case 'subscriber_tier_2': roles.push('subscriber_t2'); break
        case 'subscriber_tier_3': roles.push('subscriber_t3'); break
        case 'subscriber_tier_4': roles.push('subscriber_t4'); break
        case 'protected':       roles.push('protected'); break
      }
    }
    return roles
  }

  private fetchEmotes(): void {
    fetch('https://cdn.destiny.gg/emotes/emotes.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((entries: DggEmoteEntry[]) => {
        const map = new Map<string, string>()
        for (const entry of entries) {
          const url = entry.image?.[0]?.url
          if (url) map.set(entry.prefix, url)
        }
        this.emoteUrls = map
      })
      .catch(() => {})
  }

  private parseEmotes(text: string): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    const words = text.split(/\s+/)
    for (const word of words) {
      if (word && !(word in result)) {
        const url = this.emoteUrls.get(word)
        if (url) result[word] = [url]
      }
    }
    return result
  }
}
