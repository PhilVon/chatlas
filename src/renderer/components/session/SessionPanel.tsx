import { useState } from 'react'
import { useSessionStore } from '../../store/session-store'
import { SourceCard } from './SourceCard'
import { AddSourceModal } from './AddSourceModal'
import './SessionPanel.css'

interface Props {
  onClose: () => void
}

export function SessionPanel({ onClose }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const { sources, removeSource } = useSessionStore(s => ({
    sources: s.sources,
    removeSource: s.removeSource
  }))

  const handleRemove = async (sourceId: string) => {
    await window.electronAPI.sourceRemove(sourceId)
    removeSource(sourceId)
  }

  return (
    <>
      <div className="session-panel-overlay" onClick={onClose}>
        <div className="session-panel" onClick={e => e.stopPropagation()}>
          <div className="session-panel__header">
            <h3>Sources</h3>
            <button className="session-panel__close" onClick={onClose}>✕</button>
          </div>

          <div className="session-panel__body">
            {sources.length === 0 && (
              <div className="session-panel__empty">
                No sources added yet. Add a Twitch channel or YouTube live stream.
              </div>
            )}
            {sources.map(source => (
              <SourceCard
                key={source.sourceId}
                source={source}
                onRemove={() => void handleRemove(source.sourceId)}
              />
            ))}
          </div>

          <div className="session-panel__footer">
            <button
              className="session-panel__add-btn"
              onClick={() => setShowAdd(true)}
            >
              + Add Source
            </button>
          </div>
        </div>
      </div>

      {showAdd && <AddSourceModal onClose={() => setShowAdd(false)} />}
    </>
  )
}
