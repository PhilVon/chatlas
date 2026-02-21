import { useState, useCallback, useMemo } from 'react'
import type { ChatEvent, LaneType } from '../../../types/chat-event'
import type { QuestionGroup } from '../../../types/brain'
import type { MessageGroup } from '../../utils/groupMessages'
import type { TopicCluster } from '../../../types/cluster'
import { LaneHeader } from './LaneHeader'
import { BurstBanner } from './BurstBanner'
import { AlertCard } from './AlertCard'
import { QuestionCard } from './QuestionCard'
import { QuestionGroupCard } from './QuestionGroupCard'
import { MessageGroupCard } from './MessageGroupCard'
import { TopicClusterCard } from './TopicClusterCard'
import { groupGeneralMessages } from '../../utils/groupMessages'
import { clusterMessages } from '../../utils/clusterMessages'
import { isNoisyMessage, scoreCluster, getClusterTier } from '../../utils/messageQuality'
import { groupQuestions } from '../../utils/groupQuestions'
import { useEmbeddings } from '../../hooks/useEmbeddings'
import { useAnimatedList } from '../../hooks/useAnimatedList'
import { useChatStore } from '../../store/chat-store'
import { useSettingsStore } from '../../store/settings-store'
import './LaneColumn.css'

// Stable empty arrays so hook deps stay referentially equal across renders
const EMPTY_EVENTS: ChatEvent[] = []
const EMPTY_QUESTION_ITEMS: QuestionItem[] = []
const EMPTY_CLUSTER_ITEMS: ClusterItem[] = []
const EMPTY_GROUPS: MessageGroup[] = []

interface QuestionItem {
  key: string
  type: 'group' | 'event'
  group?: QuestionGroup
  event?: ChatEvent
}

interface ClusterItem {
  key: string
  cluster: TopicCluster
  score: number
  isNoise: boolean
}

interface Props {
  lane: LaneType
  focusedEventId: string | null
  isFocusedLane: boolean
  onFocusLane: () => void
  onFocusEvent: (event: ChatEvent) => void
}

export function LaneColumn({
  lane,
  focusedEventId,
  isFocusedLane,
  onFocusLane,
  onFocusEvent
}: Props) {
  const messages = useChatStore(s => s.lanes[lane].messages)
  const burst = useChatStore(s => s.lanes[lane].burst)
  const answeredIds = useChatStore(s => s.answeredIds)
  const clearLane = useChatStore(s => s.clearLane)
  const topicClustering     = useSettingsStore(s => s.settings.lanes.topicClustering)
  const showAvatars         = useSettingsStore(s => s.settings.display.showAvatars)
  const showEmotes          = useSettingsStore(s => s.settings.display.showEmotes)
  const groupGapMs          = useSettingsStore(s => s.settings.lanes.groupGapMs)
  const maxGroupSize        = useSettingsStore(s => s.settings.lanes.maxGroupSize)
  const clusterDecayMs      = useSettingsStore(s => s.settings.lanes.clusterDecayMs)
  const clusterSimilarity   = useSettingsStore(s => s.settings.lanes.clusterSimilarity)
  const maxVisibleQuestions = useSettingsStore(s => s.settings.lanes.maxVisibleQuestions)
  const questionSimilarity  = useSettingsStore(s => s.settings.lanes.questionSimilarity)

  const [expandedClusterIds, setExpandedClusterIds] = useState(new Set<string>())
  const [showNoise, setShowNoise] = useState(false)

  const isQuestionsLane = lane === 'questions'
  const isAlertsLane = lane === 'alerts'
  const isGeneralLane = lane === 'general'
  const embeddingsEnabled = (isGeneralLane && topicClustering) || isQuestionsLane
  const { embeddings, modelLoading } = useEmbeddings(messages, embeddingsEnabled)

  const handleExpandCluster = useCallback((clusterId: string) => {
    setExpandedClusterIds(prev => {
      const next = new Set(prev)
      if (next.has(clusterId)) {
        next.delete(clusterId)
      } else {
        next.add(clusterId)
      }
      return next
    })
  }, [])


  const handleClear = () => {
    clearLane(lane)
    window.electronAPI.laneClear(lane)
  }

  // ── Hoist data for all branches before any early returns ─────────────────
  // Questions lane data
  const rawQuestionItems = useMemo((): QuestionItem[] => {
    if (!isQuestionsLane) return EMPTY_QUESTION_ITEMS
    const unanswered = messages.filter(m => !answeredIds.has(m.id))
    const groups = groupQuestions(unanswered, questionSimilarity, embeddings)
    const items: QuestionItem[] = []
    for (const group of groups) {
      if (group.askers.length > 1) {
        items.push({ key: `group-${group.groupId}`, type: 'group', group })
      } else {
        const event = unanswered.find(m => m.id === group.eventIds[0])
        if (event) {
          items.push({ key: event.id, type: 'event', event })
        }
      }
    }
    return items
  }, [isQuestionsLane, messages, answeredIds, questionSimilarity, embeddings])

  // Cluster lane data
  const rawClusterItems = useMemo((): ClusterItem[] => {
    if (!isGeneralLane || !topicClustering) return EMPTY_CLUSTER_ITEMS
    const clusters = clusterMessages(messages, expandedClusterIds, clusterDecayMs, clusterSimilarity, embeddings)
    const now = Date.now()
    const noisyRatios = new Map(clusters.map(c => {
      const noisyCount = c.messages.filter(e => isNoisyMessage(e)).length
      return [c.clusterId, noisyCount / c.messages.length]
    }))

    const visible: typeof clusters = []
    const suppressed: typeof clusters = []
    for (const cluster of clusters) {
      if ((noisyRatios.get(cluster.clusterId) ?? 0) >= 0.75) {
        suppressed.push(cluster)
      } else {
        visible.push(cluster)
      }
    }

    const BOOST_MS = 90_000
    const scored = visible.map(c => {
      const noisyRatio = noisyRatios.get(c.clusterId) ?? 0
      const baseScore = scoreCluster(c, now)
      return { cluster: c, score: baseScore * Math.max(0.1, 1 - noisyRatio) }
    })
    scored.sort((a, b) =>
      (b.cluster.lastTimestamp + b.score * BOOST_MS) -
      (a.cluster.lastTimestamp + a.score * BOOST_MS)
    )

    const items: ClusterItem[] = [
      ...scored.map(({ cluster, score }) => ({
        key: cluster.clusterId,
        cluster,
        score,
        isNoise: false
      })),
      ...suppressed.map(cluster => ({
        key: cluster.clusterId,
        cluster,
        score: 0,
        isNoise: true
      }))
    ]
    return items
  }, [isGeneralLane, topicClustering, messages, expandedClusterIds, clusterDecayMs, clusterSimilarity, embeddings])

  // Message group data (general fallback)
  const rawGroups = useMemo((): MessageGroup[] => {
    if (!isGeneralLane || topicClustering) return EMPTY_GROUPS
    return groupGeneralMessages(messages, groupGapMs, maxGroupSize)
  }, [isGeneralLane, topicClustering, messages, groupGapMs, maxGroupSize])

  // ── Animation hooks — called unconditionally ──────────────────────────────
  const visibleQuestionItems = useMemo(
    () => isQuestionsLane ? rawQuestionItems.slice(0, maxVisibleQuestions) : EMPTY_QUESTION_ITEMS,
    [isQuestionsLane, rawQuestionItems, maxVisibleQuestions]
  )

  const animatedAlerts    = useAnimatedList(isAlertsLane ? messages : EMPTY_EVENTS, e => e.id)
  const animatedQuestions = useAnimatedList(visibleQuestionItems, item => item.key)
  const animatedClusters  = useAnimatedList(rawClusterItems, item => item.key)
  const animatedGroups    = useAnimatedList(rawGroups, g => g.groupId)

  // ── Questions lane: fixed non-scrollable queue ────────────────────────────
  if (lane === 'questions') {
    const overflow = rawQuestionItems.length - Math.min(rawQuestionItems.length, maxVisibleQuestions)

    return (
      <div className={`lane-column${isFocusedLane ? ' lane-column--focused' : ''}`}>
        <LaneHeader
          lane={lane}
          count={messages.length}
          isFocused={isFocusedLane}
          onClear={handleClear}
          onClick={onFocusLane}
        />
        <div className="lane-column__questions-body">
          {modelLoading && (
            <div className="cluster-model-loading">Loading language model...</div>
          )}
          {burst && burst.isActive && <BurstBanner burst={burst} />}
          {rawQuestionItems.length === 0 && (
            <div className="lane-column__empty">No questions yet</div>
          )}
          {animatedQuestions.map(({ item, isExiting }) => (
            <div key={item.key} className={isExiting ? 'card-exit-wrapper' : undefined}>
              {item.type === 'group' && item.group ? (
                <QuestionGroupCard group={item.group} />
              ) : item.event ? (
                <QuestionCard
                  event={item.event}
                  isAnswered={false}
                  isFocused={focusedEventId === item.event.id}
                  showAvatars={showAvatars}
                  showEmotes={showEmotes}
                  onFocusEvent={onFocusEvent}
                />
              ) : null}
            </div>
          ))}
        </div>
        {overflow > 0 && (
          <div className="lane-column__overflow">+{overflow} more questions</div>
        )}
      </div>
    )
  }

  // ── Alerts lane: scrollable, individual cards ─────────────────────────────
  if (lane === 'alerts') {
    return (
      <div className={`lane-column${isFocusedLane ? ' lane-column--focused' : ''}`}>
        <LaneHeader
          lane={lane}
          count={messages.length}
          isFocused={isFocusedLane}
          onClear={handleClear}
          onClick={onFocusLane}
        />
        <div className="lane-column__body">
          {burst && burst.isActive && <BurstBanner burst={burst} />}
          {messages.length === 0 && (
            <div className="lane-column__empty">No alerts yet</div>
          )}
          {animatedAlerts.map(({ item: event, isExiting }) => (
            <div key={event.id} className={isExiting ? 'card-exit-wrapper' : undefined}>
              <AlertCard
                event={event}
                isFocused={focusedEventId === event.id}
                showAvatars={showAvatars}
                showEmotes={showEmotes}
                onFocusEvent={onFocusEvent}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── General lane: topic clustering or user grouping ───────────────────────
  if (topicClustering) {
    const scoredItems = animatedClusters.filter(d => !d.item.isNoise)
    const suppressedItems = animatedClusters.filter(d => d.item.isNoise)
    const allScores = scoredItems.map(d => d.item.score)

    return (
      <div className={`lane-column${isFocusedLane ? ' lane-column--focused' : ''}`}>
        <LaneHeader
          lane={lane}
          count={messages.length}
          isFocused={isFocusedLane}
          onClear={handleClear}
          onClick={onFocusLane}
        />
        <div className="lane-column__body">
          {modelLoading && (
            <div className="cluster-model-loading">Loading language model...</div>
          )}
          {burst && burst.isActive && <BurstBanner burst={burst} />}
          {messages.length === 0 && (
            <div className="lane-column__empty">No messages yet</div>
          )}
          {scoredItems.map(({ item, isExiting }) => (
            <div key={item.key} className={isExiting ? 'card-exit-wrapper' : undefined}>
              <TopicClusterCard
                cluster={item.cluster}
                tier={getClusterTier(item.score, allScores)}
                answeredIds={answeredIds}
                focusedEventId={focusedEventId}
                showAvatars={showAvatars}
                showEmotes={showEmotes}
                onFocusEvent={onFocusEvent}
                onExpand={handleExpandCluster}
              />
            </div>
          ))}
        </div>
        {suppressedItems.length > 0 && (
          <div className="lane-noise-footer" onClick={() => setShowNoise(v => !v)}>
            {showNoise ? '▼' : '▶'} {suppressedItems.length} low-value message
            {suppressedItems.length !== 1 ? 's' : ''}
          </div>
        )}
        {showNoise && suppressedItems.length > 0 && (
          <div className="lane-column__noise-body">
            {suppressedItems.map(({ item, isExiting }) => (
              <div key={item.key} className={isExiting ? 'card-exit-wrapper' : undefined}>
                <TopicClusterCard
                  cluster={item.cluster}
                  tier="cold"
                  answeredIds={answeredIds}
                  focusedEventId={focusedEventId}
                  showAvatars={showAvatars}
                  showEmotes={showEmotes}
                  onFocusEvent={onFocusEvent}
                  onExpand={handleExpandCluster}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Fallback: user-based grouping
  return (
    <div className={`lane-column${isFocusedLane ? ' lane-column--focused' : ''}`}>
      <LaneHeader
        lane={lane}
        count={messages.length}
        isFocused={isFocusedLane}
        onClear={handleClear}
        onClick={onFocusLane}
      />
      <div className="lane-column__body">
        {burst && burst.isActive && <BurstBanner burst={burst} />}
        {messages.length === 0 && (
          <div className="lane-column__empty">No messages yet</div>
        )}
        {animatedGroups.map(({ item: group, isExiting }) => (
          <div key={group.groupId} className={isExiting ? 'card-exit-wrapper' : undefined}>
            <MessageGroupCard
              group={group}
              answeredIds={answeredIds}
              focusedEventId={focusedEventId}
              showAvatars={showAvatars}
              showEmotes={showEmotes}
              onFocusEvent={onFocusEvent}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
