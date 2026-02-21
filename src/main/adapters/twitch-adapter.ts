import * as tmi from 'tmi.js'
import { randomUUID } from 'crypto'
import type { ChatEvent, ChatUser } from '../../types/chat-event'
import type { SourceConfig } from '../../types/session'
import { BaseAdapter } from './base-adapter'
import { errorMessage } from '../utils/errors'

export class TwitchAdapter extends BaseAdapter {
  readonly sourceId: string
  readonly config: SourceConfig

  private client: tmi.Client | null = null

  constructor(config: SourceConfig) {
    super()
    this.config = config
    this.sourceId = `twitch:${config.channel}`
  }

  async connect(): Promise<void> {
    if (!this.config.channel) {
      this.setStatus('error', 'No channel specified')
      return
    }

    try {
      this.setStatus('connecting')

      this.client = new tmi.Client({
        channels: [this.config.channel],
        options: { debug: false }
      })

      this.client.on('message', (_channel, tags, message, self) => {
        if (self) return

        const user: ChatUser = {
          platformUserId: tags['user-id'] ?? tags.username ?? 'unknown',
          displayName: tags['display-name'] ?? tags.username ?? 'Unknown',
          roles: this.extractRoles(tags),
          badges: Object.keys(tags.badges ?? {}),
          color: tags.color ?? undefined
        }

        const event: ChatEvent = {
          id: `twitch-${randomUUID()}`,
          platform: 'twitch',
          sourceId: this.sourceId,
          eventType: 'message',
          timestamp: Date.now(),
          user,
          message: {
            text: message,
            isReply: !!tags['reply-parent-msg-id'],
            replyToId: tags['reply-parent-msg-id'] ?? undefined,
            emotes: tags.emotes ?? undefined
          },
          lane: 'general'
        }

        this.emitEvent(event)
      })

      this.client.on('subscription', (_channel, username, _method, _message, tags) => {
        const event: ChatEvent = {
          id: `twitch-${randomUUID()}`,
          platform: 'twitch',
          sourceId: this.sourceId,
          eventType: 'sub',
          timestamp: Date.now(),
          user: {
            platformUserId: tags?.['user-id'] ?? username ?? 'unknown',
            displayName: tags?.['display-name'] ?? username ?? 'Unknown',
            roles: [],
            badges: []
          },
          lane: 'general',
          metadata: { username }
        }
        this.emitEvent(event)
      })

      this.client.on('raided', (_channel, username, viewers) => {
        const event: ChatEvent = {
          id: `twitch-${randomUUID()}`,
          platform: 'twitch',
          sourceId: this.sourceId,
          eventType: 'raid',
          timestamp: Date.now(),
          user: {
            platformUserId: username,
            displayName: username,
            roles: [],
            badges: []
          },
          lane: 'general',
          metadata: { viewers }
        }
        this.emitEvent(event)
      })

      this.client.on('cheer', (_channel, tags, message) => {
        const event: ChatEvent = {
          id: `twitch-${randomUUID()}`,
          platform: 'twitch',
          sourceId: this.sourceId,
          eventType: 'donation',
          timestamp: Date.now(),
          user: {
            platformUserId: tags['user-id'] ?? tags.username ?? 'unknown',
            displayName: tags['display-name'] ?? tags.username ?? 'Unknown',
            roles: this.extractRoles(tags),
            badges: Object.keys(tags.badges ?? {}),
            color: tags.color ?? undefined
          },
          message: { text: message, isReply: false, emotes: tags.emotes ?? undefined },
          lane: 'general',
          metadata: { amount: `${tags.bits ?? '?'} bits` }
        }
        this.emitEvent(event)
      })

      this.client.on('connected', () => {
        this.setStatus('connected')
      })

      this.client.on('disconnected', (reason) => {
        this.setStatus('disconnected', reason)
      })

      await this.client.connect()
    } catch (err) {
      this.setStatus('error', errorMessage(err))
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect()
      } catch {
        // ignore disconnect errors
      }
      this.client = null
    }
    this.setStatus('disconnected')
  }

  private extractRoles(tags: tmi.ChatUserstate): string[] {
    const roles: string[] = []
    if (tags.mod) roles.push('mod')
    if (tags.subscriber) roles.push('subscriber')
    if (tags['user-type'] === 'staff') roles.push('staff')
    if (tags.badges?.broadcaster) roles.push('broadcaster')
    if (tags.badges?.vip) roles.push('vip')
    return roles
  }
}
