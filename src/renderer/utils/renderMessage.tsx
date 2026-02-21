import type { ReactNode } from 'react'
import type { Platform } from '../../types/chat-event'

const DISCORD_EMOTE_RE = /<(a?):(\w+):(\d+)>/g
const YT_EMOJI_RE = /:[\w-]+:/g

export function renderMessage(
  text: string,
  platform: Platform,
  emotes: Record<string, string[]> | undefined,
  showEmotes: boolean
): ReactNode {
  if (platform === 'twitch' && showEmotes && emotes) {
    // Build sorted list of emote positions
    const positions: { start: number; end: number; id: string }[] = []
    for (const [id, ranges] of Object.entries(emotes)) {
      for (const range of ranges) {
        const [startStr, endStr] = range.split('-')
        const start = parseInt(startStr, 10)
        const end = parseInt(endStr, 10)
        if (!isNaN(start) && !isNaN(end)) {
          positions.push({ start, end, id })
        }
      }
    }
    positions.sort((a, b) => a.start - b.start)

    const nodes: ReactNode[] = []
    let cursor = 0
    for (const { start, end, id } of positions) {
      if (start > cursor) {
        nodes.push(text.slice(cursor, start))
      }
      const emoteName = text.slice(start, end + 1)
      nodes.push(
        <img
          key={`emote-${start}`}
          src={`https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`}
          alt={emoteName}
          title={emoteName}
          className="chat-emote"
        />
      )
      cursor = end + 1
    }
    if (cursor < text.length) {
      nodes.push(text.slice(cursor))
    }
    return nodes.length > 0 ? nodes : text
  }

  if (platform === 'discord' && showEmotes) {
    DISCORD_EMOTE_RE.lastIndex = 0
    const nodes: ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = DISCORD_EMOTE_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index))
      }
      const animated = match[1] === 'a'
      const name = match[2]
      const id = match[3]
      nodes.push(
        <img
          key={`emote-${id}-${match.index}`}
          src={`https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=32`}
          alt={name}
          title={name}
          className="chat-emote"
        />
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex))
    }
    return nodes.length > 0 ? nodes : text
  }

  if (platform === 'youtube' && showEmotes) {
    // YouTube emoji arrive as shortcodes in the message text (e.g. ":face-red-droopy-eyes:").
    // The public Data API v3 does not expose image URLs for these, so we render them as
    // compact inline chips. If image URLs are ever available via the emotes map, use those.
    YT_EMOJI_RE.lastIndex = 0
    const firstMatch = YT_EMOJI_RE.exec(text)
    if (!firstMatch) return text

    const nodes: ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null = firstMatch

    do {
      const shortcode = match[0]
      const imageUrl = emotes?.[shortcode]?.[0]

      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index))
      }

      if (imageUrl) {
        nodes.push(
          <img
            key={`emote-${shortcode}-${match.index}`}
            src={imageUrl}
            alt={shortcode}
            title={shortcode}
            className="chat-emote"
          />
        )
      } else {
        nodes.push(
          <span
            key={`yt-emoji-${match.index}`}
            className="yt-emoji-chip"
            title={shortcode}
          >
            {shortcode.slice(1, -1)}
          </span>
        )
      }

      lastIndex = match.index + shortcode.length
    } while ((match = YT_EMOJI_RE.exec(text)) !== null)

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex))
    }
    return nodes.length > 0 ? nodes : text
  }

  if (platform === 'destinygg' && showEmotes && emotes && Object.keys(emotes).length > 0) {
    const parts = text.split(/(\s+)/)
    const nodes: ReactNode[] = []
    for (let i = 0; i < parts.length; i++) {
      const imageUrl = emotes[parts[i]]?.[0]
      if (imageUrl) {
        nodes.push(
          <img
            key={`dgg-emote-${parts[i]}-${i}`}
            src={imageUrl}
            alt={parts[i]}
            title={parts[i]}
            className="chat-emote"
          />
        )
      } else {
        nodes.push(parts[i])
      }
    }
    return nodes.length > 0 ? nodes : text
  }

  return text
}
