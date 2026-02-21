import { useState, useEffect, useRef } from 'react'

export interface AnimatedItem<T> {
  item: T
  isExiting: boolean
}

/**
 * Wraps a keyed list so removed items stay in the DOM briefly with
 * isExiting:true, letting CSS animations play before they unmount.
 */
export function useAnimatedList<T>(
  items: T[],
  getKey: (item: T) => string,
  exitDurationMs = 250
): Array<AnimatedItem<T>> {
  const [displayItems, setDisplayItems] = useState<Array<AnimatedItem<T>>>(
    () => items.map(item => ({ item, isExiting: false }))
  )

  // Always-current ref so timeout callbacks never see stale items
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    const currentKeys = new Set(items.map(getKey))
    const itemByKey = new Map(items.map(item => [getKey(item), item]))

    setDisplayItems(prev => {
      const prevKeys = new Set(prev.map(d => getKey(d.item)))
      let changed = false

      // Mark newly-absent items as exiting; refresh data for items that changed
      const next = prev.map(d => {
        const key = getKey(d.item)
        if (!d.isExiting && !currentKeys.has(key)) {
          changed = true
          return { ...d, isExiting: true }
        }
        const fresh = itemByKey.get(key)
        if (fresh !== undefined && fresh !== d.item) {
          changed = true
          return { ...d, item: fresh }
        }
        return d
      })

      // Append genuinely new items
      for (const item of items) {
        if (!prevKeys.has(getKey(item))) {
          changed = true
          next.push({ item, isExiting: false })
        }
      }

      // Return prev unchanged so React bails out and avoids a re-render
      return changed ? next : prev
    })

    // After animation duration, purge exiting items that are still absent
    const timer = setTimeout(() => {
      const liveKeys = new Set(itemsRef.current.map(getKey))
      setDisplayItems(prev => prev.filter(d => liveKeys.has(getKey(d.item))))
    }, exitDurationMs)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, exitDurationMs])

  return displayItems
}
