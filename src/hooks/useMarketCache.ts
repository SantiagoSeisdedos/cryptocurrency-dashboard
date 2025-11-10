import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CoinOverview } from "@/lib/coingecko";
import type { WatchlistEntry } from "@/hooks/useWatchlist";
import {
  HISTORY_TTL_MS,
  MARKET_CACHE_KEY,
  OVERVIEW_TTL_MS,
  type CoinCacheEntry,
  type CoinCacheMap,
} from "@/lib/cache";

interface UseMarketCacheArgs {
  initialCoins: CoinOverview[];
  initialHistory: Record<string, number[]>;
  entries: WatchlistEntry[];
  isWatchlistReady: boolean;
  setCoinData: React.Dispatch<
    React.SetStateAction<Record<string, CoinOverview>>
  >;
  setHistory: React.Dispatch<
    React.SetStateAction<Record<string, number[]>>
  >;
}

interface UseMarketCacheReturn {
  cacheReady: boolean;
  pendingIds: string[];
  setCacheEntry: (
    id: string,
    update: Partial<CoinCacheEntry>,
    persist?: boolean
  ) => void;
  persistCache: () => void;
  cacheRef: React.MutableRefObject<CoinCacheMap>;
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function useMarketCache({
  initialCoins,
  initialHistory,
  entries,
  isWatchlistReady,
  setCoinData,
  setHistory,
}: UseMarketCacheArgs): UseMarketCacheReturn {
  const cacheRef = useRef<CoinCacheMap>({});
  const initialSeedRef = useRef(false);
  const [cacheReady, setCacheReady] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [cacheVersion, setCacheVersion] = useState(0);

  const persistCache = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        MARKET_CACHE_KEY,
        JSON.stringify(cacheRef.current)
      );
    } catch (error) {
      console.warn("Failed to persist market cache.", error);
    }
  }, []);

  const setCacheEntry = useCallback(
    (id: string, update: Partial<CoinCacheEntry>, persist = true) => {
      cacheRef.current[id] = {
        ...cacheRef.current[id],
        ...update,
      };
      setCacheVersion((version) => version + 1);
      if (persist) {
        persistCache();
      }
    },
    [persistCache]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      setCacheReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(MARKET_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CoinCacheMap;
        cacheRef.current = parsed;
      }
    } catch (error) {
      console.warn("Failed to read market cache.", error);
    } finally {
      setCacheReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cacheReady || initialSeedRef.current) {
      return;
    }
    initialSeedRef.current = true;
    const timestamp = Date.now();

    initialCoins.forEach((coin) => {
      setCacheEntry(
        coin.id,
        { overview: coin, overviewUpdatedAt: timestamp },
        false
      );
    });

    Object.entries(initialHistory).forEach(([id, series]) => {
      setCacheEntry(
        id,
        { history: series, historyUpdatedAt: timestamp },
        false
      );
    });

    if (
      initialCoins.length > 0 ||
      Object.keys(initialHistory).length > 0
    ) {
      persistCache();
    }
  }, [cacheReady, initialCoins, initialHistory, persistCache, setCacheEntry]);

  useEffect(() => {
    if (!cacheReady || !isWatchlistReady) {
      return;
    }

    const now = Date.now();
    const coinSeeds: Record<string, CoinOverview> = {};
    const historySeeds: Record<string, number[]> = {};
    const idsToFetch: string[] = [];

    entries.forEach((entry) => {
      const id = entry.id;
      const cached = cacheRef.current[id];

      const overviewFresh =
        cached?.overview &&
        cached.overviewUpdatedAt &&
        now - cached.overviewUpdatedAt <= OVERVIEW_TTL_MS;

      const historyFresh =
        cached?.history &&
        cached.history.length > 0 &&
        cached.historyUpdatedAt &&
        now - cached.historyUpdatedAt <= HISTORY_TTL_MS;

      if (cached?.overview) {
        coinSeeds[id] = cached.overview;
      }

      if (cached?.history && cached.history.length > 0) {
        historySeeds[id] = cached.history;
      }

      if (!overviewFresh || !historyFresh) {
        idsToFetch.push(id);
      }
    });

    if (Object.keys(coinSeeds).length > 0) {
      setCoinData((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(coinSeeds).forEach(([id, overview]) => {
          if (!next[id]) {
            next[id] = overview;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }

    if (Object.keys(historySeeds).length > 0) {
      setHistory((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(historySeeds).forEach(([id, series]) => {
          if (!next[id] || next[id].length === 0) {
            next[id] = series;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }

    setPendingIds((prev) =>
      arraysEqual(prev, idsToFetch) ? prev : idsToFetch
    );
  }, [
    cacheReady,
    cacheVersion,
    entries,
    isWatchlistReady,
    setCoinData,
    setHistory,
  ]);

  return useMemo(
    () => ({
      cacheReady,
      pendingIds,
      setCacheEntry,
      persistCache,
      cacheRef,
    }),
    [cacheReady, pendingIds, persistCache, setCacheEntry]
  );
}

export type { CoinCacheEntry, CoinCacheMap } from "@/lib/cache";
