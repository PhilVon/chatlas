import type { LaneType } from '../../types/chat-event'
import type { BurstState } from '../../types/brain'

const WINDOW_MS = 60_000

export class BurstDetector {
  private windows = new Map<LaneType, number[]>()
  private states = new Map<LaneType, BurstState>()
  private threshold: number

  constructor(threshold = 30) {
    this.threshold = threshold
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold
  }

  record(lane: LaneType): BurstState {
    const now = Date.now()

    if (!this.windows.has(lane)) {
      this.windows.set(lane, [])
    }

    const timestamps = this.windows.get(lane)!
    timestamps.push(now)

    const windowStart = now - WINDOW_MS
    const pruned = timestamps.filter(t => t >= windowStart)
    this.windows.set(lane, pruned)

    const count = pruned.length
    const isActive = count >= this.threshold

    const state: BurstState = {
      lane,
      isActive,
      messageCount: count,
      windowStartMs: windowStart
    }

    this.states.set(lane, state)
    return state
  }

  getState(lane: LaneType): BurstState {
    return this.states.get(lane) ?? {
      lane,
      isActive: false,
      messageCount: 0,
      windowStartMs: Date.now() - WINDOW_MS
    }
  }

  getAllStates(): BurstState[] {
    return Array.from(this.states.values())
  }
}
