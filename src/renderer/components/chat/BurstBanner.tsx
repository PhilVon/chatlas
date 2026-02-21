import type { BurstSummary } from '../../../types/brain'
import './BurstBanner.css'

interface Props {
  burst: BurstSummary
}

export function BurstBanner({ burst }: Props) {
  if (!burst.isActive) return null

  return (
    <div className="burst-banner glow-pulse">
      <span className="burst-banner__icon">⚡</span>
      <span className="burst-banner__count">{burst.messageCount} msg/min</span>
      {burst.topKeywords.length > 0 && (
        <span className="burst-banner__keywords">
          {burst.topKeywords.join(' · ')}
        </span>
      )}
    </div>
  )
}
