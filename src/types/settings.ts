export interface HotkeyMap {
  answered: string
  cyclePlatform: string
  expand: string
  clearLane: string
  clearAlerts: string
}

export interface DockSettings {
  dockDurationMs: number
}

export interface LaneSettings {
  alertsEnabled: boolean
  questionsEnabled: boolean
  generalEnabled: boolean
  burstThreshold: number
  topicClustering: boolean
  alertAutoClearMs: number
  groupGapMs: number
  maxGroupSize: number
  clusterDecayMs: number
  clusterSimilarity: number
  maxVisibleQuestions: number
  questionSimilarity: number
}

export interface DisplaySettings {
  showPlatformBadge: boolean
  showUserBadge: boolean
  fontSize: 'small' | 'medium' | 'large'
  crtEffect: boolean
  showAvatars: boolean
  showEmotes: boolean
}

export interface OverlaySettings {
  lane: 'questions' | 'alerts'
  opacity: number
  maxOverlayItems: number
  bounds?: { x: number; y: number; width: number; height: number }
}

export interface CredentialSettings {
  discordBotToken?: string
  dggAuthToken?: string
}

export interface FilterSettings {
  botUsernames: string[]
  alertKeywords: string[]
}

export interface AppSettings {
  hotkeys: HotkeyMap
  dock: DockSettings
  lanes: LaneSettings
  display: DisplaySettings
  credentials: CredentialSettings
  filters: FilterSettings
  overlay: OverlaySettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  hotkeys: {
    answered: 'F2',
    cyclePlatform: 'F3',
    expand: 'F4',
    clearLane: 'F5',
    clearAlerts: 'F6'
  },
  dock: {
    dockDurationMs: 15000
  },
  lanes: {
    alertsEnabled: true,
    questionsEnabled: true,
    generalEnabled: true,
    burstThreshold: 30,
    topicClustering: true,
    alertAutoClearMs: 60000,
    groupGapMs: 20000,
    maxGroupSize: 6,
    clusterDecayMs: 30000,
    clusterSimilarity: 0.25,
    maxVisibleQuestions: 8,
    questionSimilarity: 0.30
  },
  display: {
    showPlatformBadge: true,
    showUserBadge: true,
    fontSize: 'medium',
    crtEffect: false,
    showAvatars: true,
    showEmotes: true
  },
  credentials: {},
  filters: {
    botUsernames: ['nightbot', 'streamelements', 'moobot', 'fossabot', 'wizebot', 'streamlabs', 'botisimo'],
    alertKeywords: []
  },
  overlay: { lane: 'questions', opacity: 1.0, maxOverlayItems: 5 }
}
