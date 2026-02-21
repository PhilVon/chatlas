import { useState } from 'react'
import type { AppSettings } from '../../../types/settings'
import './HotkeySettings.css'

interface Props {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
}

const HOTKEY_LABELS: Record<keyof AppSettings['hotkeys'], string> = {
  answered: 'Mark Answered',
  cyclePlatform: 'Next Lane',
  expand: 'Toggle Overlay',
  clearLane: 'Clear Questions',
  clearAlerts: 'Clear Alert'
}

function buildAccelerator(e: { key: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }): string | null {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const keyName = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(keyName)
  return parts.join('+')
}

export function HotkeySettings({ settings, onChange }: Props) {
  const { hotkeys } = settings
  const [capturing, setCapturing] = useState<keyof typeof hotkeys | null>(null)

  const update = (key: keyof typeof hotkeys, value: string) =>
    onChange({ ...settings, hotkeys: { ...hotkeys, [key]: value } })

  return (
    <div className="hotkey-settings">
      {(Object.keys(HOTKEY_LABELS) as (keyof typeof hotkeys)[]).map(key => (
        <div key={key} className="hotkey-row">
          <span className="hotkey-row__label">{HOTKEY_LABELS[key]}</span>
          <input
            className={`hotkey-row__input${capturing === key ? ' hotkey-row__input--capturing' : ''}`}
            type="text"
            readOnly
            value={capturing === key ? '' : hotkeys[key]}
            placeholder={capturing === key ? 'Press a key…' : 'e.g. F1'}
            onFocus={() => setCapturing(key)}
            onBlur={() => setCapturing(null)}
            onKeyDown={e => {
              if (capturing !== key) return
              e.preventDefault()
              const accel = buildAccelerator(e)
              if (accel) {
                update(key, accel)
                setCapturing(null)
                e.currentTarget.blur()
              }
            }}
          />
        </div>
      ))}
      <p className="hotkey-settings__note">
        Shortcuts work globally even when this window is unfocused. Click a field and press any key to rebind.
      </p>
    </div>
  )
}
