import { useState } from 'react'
import { useSettingsStore } from '../../store/settings-store'
import { CredentialSettings } from './CredentialSettings'
import { DisplaySettings } from './DisplaySettings'
import { FilterSettings } from './FilterSettings'
import { HotkeySettings } from './HotkeySettings'
import { LaneSettings } from './LaneSettings'
import './SettingsModal.css'

interface Props {
  onClose: () => void
}

type Tab = 'sources' | 'appearance' | 'lanes' | 'filters' | 'hotkeys'

const TABS: { id: Tab; label: string }[] = [
  { id: 'sources', label: 'Sources' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'lanes', label: 'Lanes' },
  { id: 'filters', label: 'Filters' },
  { id: 'hotkeys', label: 'Hotkeys' }
]

export function SettingsModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('sources')
  const { settings, save } = useSettingsStore(s => ({ settings: s.settings, save: s.save }))

  const handleSave = async () => {
    await save(settings)
    onClose()
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h3>Settings</h3>
          <button className="settings-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-modal__tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`settings-modal__tab${activeTab === tab.id ? ' settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-modal__body">
          {activeTab === 'sources' && (
            <CredentialSettings
              settings={settings}
              onChange={(s) => useSettingsStore.getState().update(s)}
            />
          )}
          {activeTab === 'appearance' && (
            <DisplaySettings
              settings={settings}
              onChange={(s) => useSettingsStore.getState().update(s)}
            />
          )}
          {activeTab === 'lanes' && (
            <LaneSettings
              settings={settings}
              onChange={(s) => useSettingsStore.getState().update(s)}
            />
          )}
          {activeTab === 'filters' && (
            <FilterSettings
              settings={settings}
              onChange={(s) => useSettingsStore.getState().update(s)}
            />
          )}
          {activeTab === 'hotkeys' && (
            <HotkeySettings
              settings={settings}
              onChange={(s) => useSettingsStore.getState().update(s)}
            />
          )}
        </div>

        <div className="settings-modal__footer">
          <button className="settings-modal__btn settings-modal__btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="settings-modal__btn settings-modal__btn--save"
            onClick={() => void handleSave()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
