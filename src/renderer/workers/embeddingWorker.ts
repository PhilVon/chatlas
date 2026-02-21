import { pipeline, FeatureExtractionPipeline, Tensor } from '@huggingface/transformers'

type EmbedRequest = { type: 'init' } | { type: 'embed'; id: string; text: string }

let extractor: FeatureExtractionPipeline | null = null

self.onmessage = async (event: MessageEvent<EmbedRequest>) => {
  const msg = event.data

  if (msg.type === 'init') {
    try {
      extractor = (await (pipeline as (task: string, model: string, opts: object) => Promise<FeatureExtractionPipeline>)(
        'feature-extraction', 'Xenova/all-MiniLM-L6-v2',
        { progress_callback: (p: unknown) => self.postMessage({ type: 'progress', payload: p }) }
      ))
      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', payload: String(err) })
    }
    return
  }

  if (msg.type === 'embed' && extractor) {
    try {
      const output = await extractor(msg.text, { pooling: 'mean', normalize: true }) as Tensor
      self.postMessage({
        type: 'embedding',
        payload: { id: msg.id, embedding: Array.from(output.data as Float32Array) }
      })
    } catch {
      // Skip failed embeddings — Jaccard fallback handles this message
    }
  }
}
