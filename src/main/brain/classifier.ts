import type { ChatEvent, LaneType } from '../../types/chat-event'
import type { ClassificationResult } from '../../types/brain'
import type { FilterSettings } from '../../types/settings'

const QUESTION_PHRASES = [
  'what', 'how', 'why', 'when', 'where', 'who', 'which', 'whose', 'whom',
  'could you', 'can you', 'would you', 'will you', 'is there', 'are there',
  'do you', 'does', 'did you', 'should i', 'should we',
  'is it', 'is this', 'are you', 'are we', 'was it', 'were you',
  'i was wondering', 'does anyone know', 'anyone know', 'has anyone',
  'do you know', 'anyone else', 'tell me', 'show me', 'help me', 'explain',
  'any tips', 'any advice', 'any recommendations', 'any idea', 'any ideas',
  'is it possible', 'would it be', 'could it be'
]

function isQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim()
  if (lower.includes('?')) return true
  return QUESTION_PHRASES.some(phrase => lower.startsWith(phrase))
}

export function classifyEvent(event: ChatEvent, streamerName?: string, filters?: FilterSettings): ClassificationResult {
  if (event.eventType !== 'message') {
    return { lane: 'alerts' }
  }

  if (event.user.isBot) {
    return { lane: 'alerts' }
  }

  const text = event.message?.text ?? ''

  if (filters?.alertKeywords.length) {
    const lower = text.toLowerCase()
    if (filters.alertKeywords.some(kw => kw && lower.includes(kw.toLowerCase()))) {
      return { lane: 'alerts' }
    }
  }

  if (streamerName) {
    const lowerText = text.toLowerCase()
    const lowerName = streamerName.toLowerCase()
    if (lowerText.includes(`@${lowerName}`)) {
      return { lane: 'alerts' }
    }
  }

  if (isQuestion(text)) {
    return { lane: 'questions' }
  }

  return { lane: 'general' }
}

export function getLane(event: ChatEvent, streamerName?: string, filters?: FilterSettings): LaneType {
  return classifyEvent(event, streamerName, filters).lane
}
