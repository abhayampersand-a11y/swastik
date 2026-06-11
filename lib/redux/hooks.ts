"use client"

import { useCallback, useEffect } from "react"
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux"
import type { RootState, AppDispatch } from "./store"
import { refreshUrl, invalidate } from "./api-cache-slice"

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/**
 * Stale-while-revalidate over the persisted Redux cache.
 *
 * - Cached data (persisted in localStorage via redux-persist) renders instantly,
 *   even right after a full page reload — no API wait.
 * - The URL is always re-fetched in the background; the cache and every
 *   subscribed component update automatically when fresh data arrives.
 */
export function useCachedApi<T>(url: string | null) {
  const dispatch = useAppDispatch()
  const entry = useAppSelector((s) =>
    url ? s.apiCache.entries[url] : undefined
  )

  useEffect(() => {
    if (url) dispatch(refreshUrl(url))
  }, [url, dispatch])

  const refresh = useCallback(() => {
    if (url) dispatch(refreshUrl(url))
  }, [url, dispatch])

  return {
    data: entry?.data as T | undefined,
    // Loading only when there is nothing cached yet (first ever visit)
    loading: !entry,
    refresh,
  }
}

/** Drop cached entries by URL prefix after a mutation, e.g. useInvalidate()("/api/customers") */
export function useInvalidate() {
  const dispatch = useAppDispatch()
  return useCallback((prefix: string) => dispatch(invalidate(prefix)), [dispatch])
}
