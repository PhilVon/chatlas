import type { SourceStatus } from '../../../types/session'
import './SourceCard.css'

interface Props {
  source: SourceStatus
  onRemove: () => void
}

const STATUS_LABELS: Record<string, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
  'missing-credentials': 'Missing Credentials'
}

export function SourceCard({ source, onRemove }: Props) {
  const label = source.config.channel
    ? `twitch: ${source.config.channel}`
    : source.config.videoId
      ? `youtube: ${source.config.videoId}`
      : source.sourceId

  return (
    <div className={`source-card source-card--${source.status}`}>
      <div className="source-card__info">
        <span className="source-card__label">{label}</span>
        <span className={`source-card__status source-card__status--${source.status}`}>
          {STATUS_LABELS[source.status] ?? source.status}
        </span>
        {source.error && (
          <span className="source-card__error">{source.error}</span>
        )}
      </div>
      <button className="source-card__remove" onClick={onRemove} title="Remove source">
        ✕
      </button>
    </div>
  )
}
