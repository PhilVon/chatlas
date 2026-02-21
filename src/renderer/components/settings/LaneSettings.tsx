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
    </div>
  )
}
