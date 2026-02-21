import { useEffect, useRef, useState } from 'react'
import type { ChatEvent } from '../../types/chat-event'

export interface UseEmbeddingsResult {
  embeddings: Map<string, Float32Array>
  modelReady: boolean
  modelLoading: boolean
}

export function useEmbeddings(events: ChatEvent[], enabled: boolean = true): UseEmbeddingsResult {
  const workerRef = useRef<Worker | null>(null)
  const embeddedIdsRef = useRef<Set<string>>(new Set())
  const [embeddings, setEmbeddings] = useState<Map<string, Float32Array>>(new Map())
  const [modelReady, setModelReady] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)

  // Create worker only when enabled
  useEffect(() => {
    if (!enabled) return

    const worker = new Worker(
      new URL('../workers/embeddingWorker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    setModelLoading(true)

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data
      if (type === 'ready') {
        setModelReady(true)
        setModelLoading(false)
      } else if (type === 'embedding') {
        const vec = new Float32Array(payload.embedding)
        setEmbeddings(prev => {
          const next = new Map(prev)
          next.set(payload.id, vec)
          return next
        })
      } else if (type === 'error') {
        console.error('[EmbeddingWorker] Model failed to load:', payload)
        setModelLoading(false)
      }
    }

    worker.onerror = (err) => {
      console.error('[EmbeddingWorker] Worker error:', err.message)
      setModelLoading(false)
    }

    worker.postMessage({ type: 'init' })

    return () => { worker.terminate(); workerRef.current = null }
  }, [enabled])

  // Queue new events for embedding once model is ready
  useEffect(() => {
    if (!modelReady || !workerRef.current) return
    for (const event of events) {
      if (event.message?.text && !embeddedIdsRef.current.has(event.id)) {
        embeddedIdsRef.current.add(event.id)
        workerRef.current.postMessage({ type: 'embed', id: event.id, text: event.message.text })
      }
    }
  }, [events, modelReady])

  return { embeddings, modelReady, modelLoading }
}
