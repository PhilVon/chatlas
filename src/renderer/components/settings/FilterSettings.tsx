import { useState } from 'react'
import type { AppSettings } from '../../../types/settings'
import './FilterSettings.css'

interface Props {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
}

interface TagListSectionProps {
  label: string
  description: string
  items: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}

function TagListSection({ label, description, items, onAdd, onRemove }: TagListSectionProps) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const val = input.trim().toLowerCase()
    if (val && !items.includes(val)) {
      onAdd(val)
    }
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      <p className="filter-description">{description}</p>
      <div className="filter-tag-list">
        {items.map(item => (
          <span key={item} className="filter-tag">
            {item}
            <button
              className="filter-tag__remove"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="filter-add-row">
        <input
          className="filter-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add entry…"
        />
        <button className="filter-add-btn" onClick={handleAdd}>Add</button>
      </div>
    </div>
  )
}

export function FilterSettings({ settings, onChange }: Props) {
  const { filters } = settings

  const updateBotUsernames = (usernames: string[]) =>
    onChange({ ...settings, filters: { ...filters, botUsernames: usernames } })

  const updateAlertKeywords = (keywords: string[]) =>
    onChange({ ...settings, filters: { ...filters, alertKeywords: keywords } })

  return (
    <div className="filter-settings">
      <TagListSection
        label="Bot Usernames"
        description="Messages from these users are routed to the Alerts lane. Applies to Twitch and YouTube (Discord bots are detected automatically)."
        items={filters.botUsernames}
        onAdd={val => updateBotUsernames([...filters.botUsernames, val])}
        onRemove={val => updateBotUsernames(filters.botUsernames.filter(u => u !== val))}
      />

      <TagListSection
        label="Alert Keywords"
        description="Messages containing any of these words or phrases are routed to the Alerts lane."
        items={filters.alertKeywords}
        onAdd={val => updateAlertKeywords([...filters.alertKeywords, val])}
        onRemove={val => updateAlertKeywords(filters.alertKeywords.filter(k => k !== val))}
      />
    </div>
  )
}
