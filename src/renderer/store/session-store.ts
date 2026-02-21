import { create } from 'zustand'
import type { SourceStatus } from '../../types/session'
import type { PlatformStatusPayload } from '../../types/session'

interface SessionState {
  sources: SourceStatus[]
  setSources: (sources: SourceStatus[]) => void
  updateSourceStatus: (payload: PlatformStatusPayload) => void
  removeSource: (sourceId: string) => void
  overlayOpen: boolean
  setOverlayOpen: (open: boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sources: [],

  setSources: (sources) => set({ sources }),

  updateSourceStatus: (payload) =>
    set((state) => {
      const exists = state.sources.find(s => s.sourceId === payload.sourceId)
      if (exists) {
        return {
          sources: state.sources.map(s =>
            s.sourceId === payload.sourceId
              ? { ...s, status: payload.status, error: payload.error }
              : s
          )
        }
      }
      return {
        sources: [
          ...state.sources,
          {
            sourceId: payload.sourceId,
            config: { type: payload.platform },
            status: payload.status,
            error: payload.error
          }
        ]
      }
    }),

  removeSource: (sourceId) =>
    set((state) => ({
      sources: state.sources.filter(s => s.sourceId !== sourceId)
    })),

  overlayOpen: false,
  setOverlayOpen: (open) => set({ overlayOpen: open })
}))
