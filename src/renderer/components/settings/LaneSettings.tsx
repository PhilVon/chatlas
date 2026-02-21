import type { AppSettings } from '../../../types/settings'
import './LaneSettings.css'

function formatDuration(ms: number): string {
  if (ms === 0) return 'Off'
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  if (seconds === 0) return `${minutes}m`
  return `${minutes}m ${seconds}s`
}

interface Props {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
}

export function LaneSettings({ settings, onChange }: Props) {
  const { lanes, dock, overlay } = settings

  const updateLanes = (patch: Partial<typeof lanes>) =>
    onChange({ ...settings, lanes: { ...lanes, ...patch } })

  const updateDock = (patch: Partial<typeof dock>) =>
    onChange({ ...settings, dock: { ...dock, ...patch } })

  const updateOverlay = (patch: Partial<typeof overlay>) =>
    onChange({ ...settings, overlay: { ...overlay, ...patch } })

  return (
    <div className="lane-settings">
      <div className="settings-field">
        <label className="settings-label">Active Lanes</label>
        <div className="lane-settings__toggles">
          <label className="settings-toggle-row">
            <span>Alerts</span>
            <input
              type="checkbox"
              checked={lanes.alertsEnabled}
              onChange={e => updateLanes({ alertsEnabled: e.target.checked })}
            />
          </label>
          <label className="settings-toggle-row">
            <span>Questions</span>
            <input
              type="checkbox"
              checked={lanes.questionsEnabled}
              onChange={e => updateLanes({ questionsEnabled: e.target.checked })}
            />
          </label>
          <label className="settings-toggle-row">
            <span>General</span>
            <input
              type="checkbox"
              checked={lanes.generalEnabled}
              onChange={e => updateLanes({ generalEnabled: e.target.checked })}
            />
          </label>
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-label">General Lane Display</label>
        <div className="lane-settings__toggles">
          <label className="settings-toggle-row">
            <span>Topic Clustering</span>
            <input
              type="checkbox"
              checked={lanes.topicClustering}
              onChange={e => updateLanes({ topicClustering: e.target.checked })}
            />
          </label>
        </div>
      </div>

      {lanes.generalEnabled && (
        <div className="settings-field">
          <label className="settings-label">Message Grouping</label>
          <label className="settings-label">Group timeout — {formatDuration(lanes.groupGapMs)}</label>
          <input
            className="lane-settings__slider"
            type="range"
            min={5000} max={60000} step={5000}
            value={lanes.groupGapMs}
            onChange={e => updateLanes({ groupGapMs: Number(e.target.value) })}
          />
          <label className="settings-label">Max per group — {lanes.maxGroupSize}</label>
          <input
            className="lane-settings__slider"
            type="range"
            min={2} max={20} step={1}
            value={lanes.maxGroupSize}
            onChange={e => updateLanes({ maxGroupSize: Number(e.target.value) })}
          />
        </div>
      )}

      {lanes.topicClustering && (
        <div className="settings-field">
          <label className="settings-label">Topic Clustering</label>
          <label className="settings-label">Cluster window — {formatDuration(lanes.clusterDecayMs)}</label>
          <input
            className="lane-settings__slider"
            type="range"
            min={10000} max={120000} step={5000}
            value={lanes.clusterDecayMs}
            onChange={e => updateLanes({ clusterDecayMs: Number(e.target.value) })}
          />
          <label className="settings-label">Similarity threshold — {Math.round(lanes.clusterSimilarity * 100)}%</label>
          <input
            className="lane-settings__slider"
            type="range"
            min={0.10} max={0.60} step={0.05}
            value={lanes.clusterSimilarity}
            onChange={e => updateLanes({ clusterSimilarity: Number(e.target.value) })}
          />
        </div>
      )}

      <div className="settings-field">
        <label className="settings-label">
          Burst Threshold (msgs / 60s) — {lanes.burstThreshold}
        </label>
        <input
          className="lane-settings__slider"
          type="range"
          min={5}
          max={200}
          value={lanes.burstThreshold}
          onChange={e => updateLanes({ burstThreshold: Number(e.target.value) })}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">
          Alert Auto-Clear — {formatDuration(lanes.alertAutoClearMs)}
        </label>
        <input
          className="lane-settings__slider"
          type="range"
          min={0}
          max={300000}
          step={5000}
          value={lanes.alertAutoClearMs}
          onChange={e => updateLanes({ alertAutoClearMs: Number(e.target.value) })}
        />
      </div>

      {lanes.questionsEnabled && (
        <div className="settings-field">
          <label className="settings-label">Questions</label>
          <label className="settings-label">Max visible questions — {lanes.maxVisibleQuestions}</label>
          <input
            className="lane-settings__slider"
            type="range"
            min={3} max={20} step={1}
            value={lanes.maxVisibleQuestions}
            onChange={e => updateLanes({ maxVisibleQuestions: Number(e.target.value) })}
          />
          <label className="settings-label">Dedup sensitivity — {Math.round(lanes.questionSimilarity * 100)}%</label>
          <input
            className="lane-settings__slider"
            type="range"
            min={0.10} max={0.70} step={0.05}
            value={lanes.questionSimilarity}
            onChange={e => updateLanes({ questionSimilarity: Number(e.target.value) })}
          />
        </div>
      )}

      <div className="settings-field">
        <label className="settings-label">
          General Dock Duration — {dock.dockDurationMs / 1000}s
        </label>
        <input
          className="lane-settings__slider"
          type="range"
          min={5000}
          max={120000}
          step={1000}
          value={dock.dockDurationMs}
          onChange={e => updateDock({ dockDurationMs: Number(e.target.value) })}
        />
      </div>

      <div className="settings-field">
        <label className="settings-label">Overlay Lane</label>
        <div className="settings-tabs">
          {(['questions', 'alerts'] as const).map(lane => (
            <button
              key={lane}
              className={`settings-tab${overlay.lane === lane ? ' settings-tab--active' : ''}`}
              onClick={() => updateOverlay({ lane })}
            >{lane}</button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-label">Max overlay items — {overlay.maxOverlayItems}</label>
        <input
          className="lane-settings__slider"
          type="range"
          min={1} max={15} step={1}
          value={overlay.maxOverlayItems}
          onChange={e => updateOverlay({ maxOverlayItems: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}
