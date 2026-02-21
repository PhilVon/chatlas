import { Client, GatewayIntentBits, Events } from 'discord.js'
import { randomUUID } from 'crypto'
import type { ChatEvent, ChatUser } from '../../types/chat-event'
import type { SourceConfig } from '../../types/session'
import { BaseAdapter } from './base-adapter'
import { errorMessage } from '../utils/errors'

export class DiscordAdapter extends BaseAdapter {
  readonly sourceId: string
  readonly config: SourceConfig

  private client: Client | null = null

  constructor(config: SourceConfig) {
    super()
    this.config = config
    this.sourceId = `discord:${config.discordChannelId}`
  }

  async connect(): Promise<void> {
    if (!this.config.botToken || !this.config.discordChannelId) {
      this.setStatus('missing-credentials')
      return
    }

    try {
      this.setStatus('connecting')

      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      })

      this.client.on(Events.MessageCreate, (msg) => {
        if (msg.channelId !== this.config.discordChannelId) return

        const roles = msg.member?.roles.cache.map(r => r.name) ?? []
        const color = msg.member?.displayHexColor

        const user: ChatUser = {
          platformUserId: msg.author.id,
          displayName: msg.member?.displayName ?? msg.author.username,
          roles,
          badges: [],
          color: color && color !== '#000000' ? color : undefined,
          avatarUrl: msg.author.avatarURL({ size: 64 }) ?? undefined,
          isBot: msg.author.bot || undefined
        }

        const event: ChatEvent = {
          id: `discord-${randomUUID()}`,
          platform: 'discord',
          sourceId: this.sourceId,
          eventType: 'message',
          timestamp: msg.createdTimestamp,
          user,
          message: {
            text: msg.content,
            isReply: msg.reference != null,
            replyToId: msg.reference?.messageId ?? undefined
          },
          lane: 'general'
        }

        this.emitEvent(event)
      })

      this.client.on(Events.Error, (err) => {
        this.setStatus('error', err.message)
      })

      this.client.on(Events.ClientReady, () => {
        this.setStatus('connected')
      })

      await this.client.login(this.config.botToken)
    } catch (err) {
      this.setStatus('error', errorMessage(err))
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        this.client.destroy()
      } catch {
        // ignore
      }
      this.client = null
    }
    this.setStatus('disconnected')
  }
}
