const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'with', 'this', 'that', 'are', 'was', 'be', 'by',
  'i', 'me', 'my', 'you', 'your', 'we', 'they', 'he', 'she', 'has', 'have',
  'do', 'did', 'can', 'will', 'would', 'could', 'should', 'just', 'like',
  'so', 'what', 'how', 'why', 'when', 'if', 'then', 'from', 'its', 'been'
])

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  return new Set(words)
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function extractTopKeywords(messages: string[], topN = 5): string[] {
  const freq = new Map<string, number>()

  for (const msg of messages) {
    const words = msg
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))

    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word)
}
