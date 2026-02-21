import type { ChatEvent } from '../../types/chat-event'
import type { QuestionGroup } from '../../types/brain'

const STOPWORDS = new Set([
  // Common English stopwords
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'with', 'this', 'that', 'are', 'was', 'be', 'by',
  'i', 'me', 'my', 'you', 'your', 'we', 'they', 'he', 'she', 'has', 'have',
  'do', 'did', 'can', 'will', 'would', 'could', 'should', 'just', 'like',
  'so', 'if', 'then', 'from', 'its', 'been',
  // Chat reactions
  'lol', 'lmao', 'lmfao', 'omg', 'gg', 'rip', 'oof', 'wow', 'haha', 'ha', 'hehe',
  // Agreement / filler
  'yeah', 'yep', 'yup', 'nope', 'nah', 'ok', 'okay', 'same',
  // Generic adjectives
  'good', 'great', 'nice', 'bad', 'cool', 'awesome',
  // Common verbs/adverbs with no topic value
  'get', 'got', 'let', 'go', 'going', 'really', 'very', 'much', 'more',
  'even', 'still', 'already', 'too', 'also', 'now', 'here', 'there', 'actually',
  // Streaming address terms
  'chat', 'guys', 'bro', 'dude',
  // Question-intent words: carry no topical content when grouping questions
  'what', 'how', 'why', 'where', 'who', 'which', 'when',
  'anyone', 'please', 'does', 'know', 'about', 'think',
  'help', 'need', 'want', 'try', 'using', 'use',
])

const COSINE_THRESHOLD = 0.55
const JACCARD_THRESHOLD = 0.30
const MAX_GROUPS = 50

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot // vectors are pre-normalized by all-MiniLM-L6-v2
}

function updateCentroid(existing: Float32Array, n: number, newVec: Float32Array): Float32Array {
  const result = new Float32Array(existing.length)
  for (let i = 0; i < existing.length; i++) {
    result[i] = (existing[i] * n + newVec[i]) / (n + 1)
  }
  let mag = 0
  for (const x of result) mag += x * x
  mag = Math.sqrt(mag)
  return result.map(x => x / mag) as Float32Array
}

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  return new Set(words)
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  // Return 0 for empty sets — zero-token messages share no signal
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function groupQuestions(
  events: ChatEvent[],
  embeddings: Map<string, Float32Array> = new Map()
): QuestionGroup[] {
  const groups: QuestionGroup[] = []
  const centroids = new Map<string, Float32Array>()  // groupId → embedding centroid
  const repTokens = new Map<string, Set<string>>()   // groupId → representative tokens
  const memberCounts = new Map<string, number>()     // groupId → count for centroid rolling avg

  for (const event of events) {
    const text = event.message?.text ?? ''
    const tokens = tokenize(text)
    const eventVec = embeddings.get(event.id)

    let bestGroup: QuestionGroup | null = null
    let bestScore = -Infinity

    for (const group of groups) {
      // Same-user dedup: don't add a user to a group they already asked in
      const userKey = `${event.user.platformUserId}:${event.platform}`
      const alreadyAsked = group.askers.some(
        a => `${a.userId}:${a.platform}` === userKey
      )
      if (alreadyAsked) continue

      const centroid = centroids.get(group.groupId)
      let score: number
      let threshold: number

      if (eventVec && centroid) {
        score = cosineSimilarity(eventVec, centroid)
        threshold = COSINE_THRESHOLD
      } else {
        const repToks = repTokens.get(group.groupId)!
        score = jaccardSimilarity(tokens, repToks)
        threshold = JACCARD_THRESHOLD
      }

      if (score >= threshold && score > bestScore) {
        bestScore = score
        bestGroup = group
      }
    }

    if (bestGroup) {
      // Merge into existing group
      bestGroup.eventIds.push(event.id)
      bestGroup.lastTimestamp = event.timestamp
      bestGroup.askers.push({
        userId: event.user.platformUserId,
        displayName: event.user.displayName,
        color: event.user.color,
        platform: event.platform
      })
      // Union keywords
      for (const token of tokens) {
        if (!bestGroup.keywords.includes(token)) {
          bestGroup.keywords.push(token)
        }
      }
      // Update centroid
      const n = memberCounts.get(bestGroup.groupId) ?? 1
      memberCounts.set(bestGroup.groupId, n + 1)
      if (eventVec) {
        const existing = centroids.get(bestGroup.groupId)
        centroids.set(bestGroup.groupId, existing
          ? updateCentroid(existing, n, eventVec)
          : eventVec.slice()
        )
      }
    } else {
      // Create new group; evict oldest if at capacity
      if (groups.length >= MAX_GROUPS) {
        const evicted = groups.shift()!
        centroids.delete(evicted.groupId)
        repTokens.delete(evicted.groupId)
        memberCounts.delete(evicted.groupId)
      }
      const newGroup: QuestionGroup = {
        groupId: event.id,
        representativeText: text,
        eventIds: [event.id],
        askers: [{
          userId: event.user.platformUserId,
          displayName: event.user.displayName,
          color: event.user.color,
          platform: event.platform
        }],
        keywords: Array.from(tokens),
        firstTimestamp: event.timestamp,
        lastTimestamp: event.timestamp,
        isAnswered: false
      }
      groups.push(newGroup)
      repTokens.set(event.id, new Set(tokens))
      memberCounts.set(event.id, 1)
      if (eventVec) {
        centroids.set(event.id, eventVec.slice())
      }
    }
  }

  return groups
}
