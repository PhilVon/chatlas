import { create } from 'zustand'
import type { ChatEvent, LaneType } from '../../types/chat-event'
import type { BurstSummary } from '../../types/brain'

const RING_BUFFER_SIZE = 200

interface LaneState {
  messages: ChatEvent[]
  burst: BurstSummary | null
}

interface ChatState {
  lanes: Record<LaneType, LaneState>
  answeredIds: Set<string>

  addEvent: (event: ChatEvent) => void
  removeEvent: (eventId: string, lane: LaneType) => void
  clearLane: (lane: LaneType) => void
  updateBurst: (summary: BurstSummary) => void
  markAnswered: (eventId: string) => void
}

const emptyLane = (): LaneState => ({ messages: [], burst: null })

export const useChatStore = create<ChatState>((set) => ({
  lanes: {
    alerts: emptyLane(),
    questions: emptyLane(),
    general: emptyLane()
  },
  answeredIds: new Set(),

  addEvent: (event) =>
    set((state) => {
      const lane = event.lane
      const prev = state.lanes[lane].messages
      const next = prev.length >= RING_BUFFER_SIZE
        ? [...prev.slice(1), event]
        : [...prev, event]
      return {
        lanes: {
          ...state.lanes,
          [lane]: { ...state.lanes[lane], messages: next }
        }
      }
    }),

  removeEvent: (eventId, lane) =>
    set((state) => ({
      lanes: {
        ...state.lanes,
        [lane]: {
          ...state.lanes[lane],
          messages: state.lanes[lane].messages.filter(m => m.id !== eventId)
        }
      }
    })),

  clearLane: (lane) =>
    set((state) => ({
      lanes: {
        ...state.lanes,
        [lane]: { ...state.lanes[lane], messages: [] }
      }
    })),

  updateBurst: (summary) =>
    set((state) => ({
      lanes: {
        ...state.lanes,
        [summary.lane]: { ...state.lanes[summary.lane], burst: summary }
      }
    })),

  markAnswered: (eventId) =>
    set((state) => {
      const next = new Set(state.answeredIds)
      next.add(eventId)
      return { answeredIds: next }
    }),
}))
