import { useEffect, useState } from 'react';
import { cacheSet, cacheGetStale, formatCacheAge, CacheKey } from '../db/cache';

interface CachedQueryResult<T> {
  data:       T | undefined;
  isLoading:  boolean;
  isError:    boolean;
  isStale:    boolean;         // true when serving from SQLite cache
  cacheLabel: string | null;  // e.g. "Last updated 3 min ago"
  refetch:    () => void;
}

/**
 * Wraps an RTK Query result with SQLite read-cache fallback.
 *
 * When the network query succeeds, the result is persisted to SQLite.
 * When it fails (network error), stale SQLite data is served instead.
 *
 * @param cacheKey   - SQLite cache key (determines TTL)
 * @param queryResult - RTK Query hook result
 */
export function useCachedQuery<T>(
  cacheKey: CacheKey,
  queryResult: {
    data?:     T | undefined;
    isLoading: boolean;
    isError:   boolean;
    refetch:   () => void;
  }
): CachedQueryResult<T> {
  const [staleData,    setStaleData]    = useState<T | undefined>(undefined);
  const [staleLabel,   setStaleLabel]   = useState<string | null>(null);
  const [loadingCache, setLoadingCache] = useState(true);

  // Persist fresh data to SQLite whenever a successful response arrives
  useEffect(() => {
    if (queryResult.data !== undefined && !queryResult.isError) {
      cacheSet(cacheKey, queryResult.data);
    }
  }, [cacheKey, queryResult.data, queryResult.isError]);

  // Load stale cache on mount (for instant display while network loads)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await cacheGetStale<T>(cacheKey);
      if (!cancelled && cached) {
        setStaleData(cached.data);
        setStaleLabel(formatCacheAge(cached.cachedAt));
      }
      if (!cancelled) setLoadingCache(false);
    })();
    return () => { cancelled = true; };
  }, [cacheKey]);

  const serveFromCache = queryResult.isError && staleData !== undefined;
  const isLoading      = queryResult.isLoading && loadingCache;

  return {
    data:       serveFromCache ? staleData : queryResult.data,
    isLoading,
    isError:    queryResult.isError && staleData === undefined,
    isStale:    serveFromCache,
    cacheLabel: serveFromCache ? staleLabel : null,
    refetch:    queryResult.refetch,
  };
}
