import type { ChatEvent } from '../../types/chat-event'
import type { TopicCluster } from '../../types/cluster'
import { tokenize } from './clusterMessages'

export function isNoisyMessage(event: ChatEvent): boolean {
  const text = event.message?.text ?? ''
  // Strip @-mentions before analysis so "@username k" → "k" (not a false token)
  const cleanText = text.replace(/@\S+/g, '').trim()

  // Emote span check (Twitch/YouTube emotes with position strings like "0-7")
  // Use original text positions since emote offsets reference the original string
  if (event.message?.emotes) {
    let emotedChars = 0
    for (const positions of Object.values(event.message.emotes)) {
      for (const pos of positions) {
        const [start, end] = pos.split('-').map(Number)
        if (!isNaN(start) && !isNaN(end)) {
          emotedChars += end - start + 1
        }
      }
    }
    if (text.length > 0 && emotedChars / text.length > 0.6) return true
  }

  // Unicode emoji density check on cleaned text
  const emojiMatches = cleanText.match(/\p{Emoji_Presentation}/gu)
  if (emojiMatches && cleanText.length > 0 && emojiMatches.length / cleanText.length > 0.3) return true

  // Filler check: all stopwords or too short to produce any meaningful token
  const tokens = tokenize(cleanText)
  if (tokens.size === 0) return true

  // All-caps single-word reactions: BROOOO, YEWS, LETSGO, KEKW, GG, etc.
  // Legitimate messages are rarely written in all uppercase
  if (tokens.size === 1 && /^[A-Z0-9]+$/.test(cleanText.trim())) return true

  return false
}

export function getRoleBonus(roles: string[]): number {
  if (roles.includes('mod') || roles.includes('broadcaster')) return 1.5
  if (roles.includes('vip')) return 1.3
  if (roles.includes('subscriber')) return 1.2
  return 1.0
}

export function scoreCluster(cluster: TopicCluster, now: number): number {
  const participantCount = cluster.userSubGroups.length
  const messageCount = cluster.messages.length
  const ageMs = now - cluster.lastTimestamp
  const recencyDecay = Math.exp(-ageMs / 120_000) // half-life ~2 min

  const roleBonus = Math.max(...cluster.messages.map(e => getRoleBonus(e.user.roles)))

  return participantCount * Math.log1p(messageCount) * recencyDecay * roleBonus
}

export function getClusterTier(score: number, allScores: number[]): 'hot' | 'warm' | 'cold' {
  if (allScores.length <= 2) return 'warm'

  const sorted = [...allScores].sort((a, b) => a - b)
  const p25 = sorted[Math.floor(sorted.length * 0.25)]
  const p75 = sorted[Math.floor(sorted.length * 0.75)]

  if (score >= p75) return 'hot'
  if (score <= p25) return 'cold'
  return 'warm'
}
