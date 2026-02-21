import type { AppSettings } from '../../../types/settings'
import './DisplaySettings.css'

interface Props {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
}

export function DisplaySettings({ settings, onChange }: Props) {
  const { display, overlay } = settings

  const update = (patch: Partial<typeof display>) =>
    onChange({ ...settings, display: { ...display, ...patch } })

  const updateOverlay = (patch: Partial<typeof overlay>) =>
    onChange({ ...settings, overlay: { ...overlay, ...patch } })

  return (
    <div className="display-settings">
      <div className="settings-field">
        <label className="settings-label">Font Size</label>
        <div className="settings-tabs">
          {(['small', 'medium', 'large'] as const).map(size => (
            <button
              key={size}
              className={`settings-tab${display.fontSize === size ? ' settings-tab--active' : ''}`}
              onClick={() => update({ fontSize: size })}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-toggle-row">
          <span className="settings-label">Show Platform Badge</span>
          <input
            type="checkbox"
            checked={display.showPlatformBadge}
            onChange={e => update({ showPlatformBadge: e.target.checked })}
          />
        </label>
      </div>

      <div className="settings-field">
        <label className="settings-toggle-row">
          <span className="settings-label">Show User Badge</span>
          <input
            type="checkbox"
            checked={display.showUserBadge}
            onChange={e => update({ showUserBadge: e.target.checked })}
          />
        </label>
      </div>

      <div className="settings-field">
        <label className="settings-toggle-row">
          <span className="settings-label">CRT Effect</span>
          <input
            type="checkbox"
            checked={display.crtEffect}
            onChange={e => update({ crtEffect: e.target.checked })}
          />
        </label>
      </div>

      <div className="settings-field">
        <label className="settings-toggle-row">
          <span className="settings-label">Show Avatars</span>
          <input
            type="checkbox"
            checked={display.showAvatars}
            onChange={e => update({ showAvatars: e.target.checked })}
          />
        </label>
      </div>

      <div className="settings-field">
        <label className="settings-toggle-row">
          <span className="settings-label">Show Emotes</span>
          <input
            type="checkbox"
            checked={display.showEmotes}
            onChange={e => update({ showEmotes: e.target.checked })}
          />
        </label>
      </div>

      <div className="settings-field">
        <label className="settings-label">
          Overlay Opacity — {Math.round(overlay.opacity * 100)}%
        </label>
        <input
          type="range"
          className="lane-settings__slider"
          min={0.3}
          max={1}
          step={0.05}
          value={overlay.opacity}
          onChange={e => updateOverlay({ opacity: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}
