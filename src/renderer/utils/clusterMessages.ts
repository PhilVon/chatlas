import type { ChatEvent } from '../../types/chat-event'
import type { TopicCluster, UserSubGroup } from '../../types/cluster'

const STOPWORDS = new Set([
  // Original stopwords
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'with', 'this', 'that', 'are', 'was', 'be', 'by',
  'i', 'me', 'my', 'you', 'your', 'we', 'they', 'he', 'she', 'has', 'have',
  'do', 'did', 'can', 'will', 'would', 'could', 'should', 'just', 'like',
  'so', 'what', 'how', 'why', 'when', 'if', 'then', 'from', 'its', 'been',
  // Chat reactions
  'lol', 'lmao', 'lmfao', 'omg', 'gg', 'rip', 'oof', 'wow', 'haha', 'ha', 'hehe',
  // Agreement / filler
  'yeah', 'yep', 'yup', 'nope', 'nah', 'ok', 'okay', 'same',
  // Generic positive/negative adjectives
  'good', 'great', 'nice', 'bad', 'cool', 'awesome',
  // Common verbs/adverbs with no topic value
  'get', 'got', 'let', 'go', 'going', 'really', 'very', 'much', 'more',
  'even', 'still', 'already', 'too', 'also', 'now', 'here', 'there', 'actually',
  // Streaming address terms
  'chat', 'guys', 'bro', 'dude',
])

const COSINE_THRESHOLD = 0.35
const MIN_TOKENS_FOR_CLUSTER = 2

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

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  return new Set(words)
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function buildUserSubGroups(messages: ChatEvent[]): UserSubGroup[] {
  const subGroupMap = new Map<string, UserSubGroup>()
  for (const msg of messages) {
    const key = `${msg.platform}:${msg.user.platformUserId}`
    const existing = subGroupMap.get(key)
    if (existing) {
      existing.events.push(msg)
    } else {
      subGroupMap.set(key, {
        userId: msg.user.platformUserId,
        platform: msg.platform,
        displayName: msg.user.displayName,
        color: msg.user.color,
        events: [msg]
      })
    }
  }
  return Array.from(subGroupMap.values())
}

export function clusterMessages(
  messages: ChatEvent[],
  expandedClusterIds: Set<string>,
  clusterDecayMs: number,
  clusterSimilarity: number,
  embeddings: Map<string, Float32Array> = new Map()
): TopicCluster[] {
  const clusters: TopicCluster[] = []

  // Local maps for representative-token comparison (not stored in TopicCluster)
  const repTokens = new Map<string, Set<string>>()         // clusterId → first-message tokens
  const tokenFreq = new Map<string, Map<string, number>>() // clusterId → token → count
  const msgCount = new Map<string, number>()               // clusterId → message count
  const centroids = new Map<string, Float32Array>()        // clusterId → embedding centroid

  // eventId → clusterId, for reply chain short-circuit
  const eventClusterMap = new Map<string, string>()

  // Tracks the most recent short-message cluster (for no-embedding grouping)
  let recentShortClusterId: string | null = null

  function getComparisonSet(clusterId: string): Set<string> {
    const count = msgCount.get(clusterId) ?? 1
    if (count <= 2) {
      return repTokens.get(clusterId)!
    }
    // Core tokens: appear in ≥2 messages in the cluster
    const core = new Set<string>()
    for (const [tok, freq] of tokenFreq.get(clusterId)!) {
      if (freq >= 2) core.add(tok)
    }
    return core.size >= 1 ? core : repTokens.get(clusterId)!
  }

  function mergeIntoCluster(cluster: TopicCluster, event: ChatEvent, tokens: Set<string>): void {
    cluster.messages.push(event)
    cluster.lastTimestamp = event.timestamp
    // Union keywords for display
    for (const token of tokens) {
      cluster.keywords.add(token)
    }
    // Update token frequency
    const freq = tokenFreq.get(cluster.clusterId)!
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1)
    }
    const n = msgCount.get(cluster.clusterId) ?? 1
    msgCount.set(cluster.clusterId, n + 1)
    // Update topKeyword to most-frequent token
    let top = '', maxF = 0
    for (const [tok, f] of freq) {
      if (f > maxF) { maxF = f; top = tok }
    }
    cluster.topKeyword = top
    cluster.userSubGroups = buildUserSubGroups(cluster.messages)
    cluster.isExpanded = expandedClusterIds.has(cluster.clusterId)
    // Update embedding centroid
    const msgVec = embeddings.get(event.id)
    if (msgVec) {
      const existing = centroids.get(cluster.clusterId)
      centroids.set(cluster.clusterId, existing
        ? updateCentroid(existing, n, msgVec)
        : msgVec.slice()
      )
    }
  }

  for (const event of messages) {
    const text = event.message?.text ?? ''
    const tokens = tokenize(text)

    const msgVec = embeddings.get(event.id)

    if (tokens.size < MIN_TOKENS_FOR_CLUSTER) {
      if (msgVec) {
        // Has embedding: fall through to cosine scoring below
      } else {
        // No embedding: time-based grouping with the most recent short-message cluster
        let merged = false
        if (recentShortClusterId !== null) {
          const shortCluster = clusters.find(c => c.clusterId === recentShortClusterId)
          if (shortCluster && event.timestamp - shortCluster.lastTimestamp <= clusterDecayMs) {
            mergeIntoCluster(shortCluster, event, tokens)
            eventClusterMap.set(event.id, recentShortClusterId)
            merged = true
          } else {
            recentShortClusterId = null
          }
        }
        if (!merged) {
          const id = event.id
          clusters.push({
            clusterId: id,
            topKeyword: '',
            keywords: new Set(tokens),
            messages: [event],
            userSubGroups: buildUserSubGroups([event]),
            firstTimestamp: event.timestamp,
            lastTimestamp: event.timestamp,
            isExpanded: expandedClusterIds.has(id)
          })
          eventClusterMap.set(event.id, id)
          repTokens.set(id, new Set())
          tokenFreq.set(id, new Map())
          msgCount.set(id, 1)
          recentShortClusterId = id
        }
        continue
      }
    }

    // Reply chain short-circuit: force-merge into parent's cluster
    if (event.message?.isReply && event.message?.replyToId) {
      const parentClusterId = eventClusterMap.get(event.message.replyToId)
      if (parentClusterId) {
        const parentCluster = clusters.find(c => c.clusterId === parentClusterId)
        if (parentCluster) {
          mergeIntoCluster(parentCluster, event, tokens)
          eventClusterMap.set(event.id, parentClusterId)
          continue
        }
      }
    }

    let bestMatch: { cluster: TopicCluster; score: number } | null = null

    for (const cluster of clusters) {
      if (cluster.messages.length === 0) continue
      const age = event.timestamp - cluster.lastTimestamp
      if (age > clusterDecayMs) continue

      const centroid = centroids.get(cluster.clusterId)
      let score: number
      let threshold: number
      if (msgVec && centroid) {
        score = cosineSimilarity(msgVec, centroid)
        threshold = COSINE_THRESHOLD
      } else {
        const compSet = getComparisonSet(cluster.clusterId)
        score = jaccardSimilarity(tokens, compSet)
        threshold = clusterSimilarity
      }

      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { cluster, score }
        }
      }
    }

    if (bestMatch) {
      mergeIntoCluster(bestMatch.cluster, event, tokens)
      eventClusterMap.set(event.id, bestMatch.cluster.clusterId)
    } else {
      const id = event.id
      const topKeyword = Array.from(tokens)[0] ?? ''
      const initFreq = new Map<string, number>()
      for (const tok of tokens) initFreq.set(tok, 1)
      clusters.push({
        clusterId: id,
        topKeyword,
        keywords: new Set(tokens),
        messages: [event],
        userSubGroups: buildUserSubGroups([event]),
        firstTimestamp: event.timestamp,
        lastTimestamp: event.timestamp,
        isExpanded: expandedClusterIds.has(id)
      })
      eventClusterMap.set(event.id, id)
      repTokens.set(id, new Set(tokens))
      tokenFreq.set(id, initFreq)
      msgCount.set(id, 1)
      // Set initial centroid if embedding is available
      if (msgVec) {
        centroids.set(id, msgVec.slice())
      }
    }
  }

  return clusters
}
