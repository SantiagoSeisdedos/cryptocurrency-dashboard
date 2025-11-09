"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  LineChart,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkle,
  X,
} from "lucide-react";
import { getCoinMeta, type CoinMeta } from "@/lib/coins";
import type { CoinDetail, CoinOverview } from "@/lib/coingecko";
import EmptyPerformer from "./EmptyPerformer";
import Sparkline from "./Sparkline";
import { currencyFormatter, timeFormatter } from "@/lib/format";
import { useWatchlist, type WatchlistEntry } from "@/hooks/useWatchlist";
import {
  HISTORY_TTL_MS,
  MARKET_CACHE_KEY,
  OVERVIEW_TTL_MS,
  type CoinCacheEntry,
  type CoinCacheMap,
} from "@/lib/cache";

type ConnectionStatus = "connected" | "connecting" | "error";
type SortKey = "watchlist" | "name" | "price" | "change";
type FilterMode = "all" | "gainers" | "losers";

export type CoinWithMeta = CoinOverview & { meta: CoinMeta };

interface DashboardViewProps {
  initialCoins: CoinWithMeta[];
  initialHistory: Record<string, number[]>;
  initialTimestamp: string | null;
}

interface DisplayCoin {
  id: string;
  entry: WatchlistEntry;
  overview?: CoinOverview;
  history: number[];
  gradient: string;
  image?: string | null;
  name: string;
  symbol: string;
  supportsDetail: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  image?: string | null;
  marketCapRank?: number | null;
}

const LIVE_ENDPOINT = "/api/live-prices";
const HISTORY_LIMIT = 7;
const FALLBACK_GRADIENTS = [
  "from-cyan-500/40 via-slate-700/30 to-indigo-500/40",
  "from-emerald-500/40 via-slate-700/30 to-teal-500/40",
  "from-purple-500/40 via-indigo-500/30 to-fuchsia-500/40",
  "from-rose-500/40 via-slate-700/30 to-amber-500/40",
  "from-blue-500/40 via-slate-700/30 to-cyan-500/40",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveGradient(id: string) {
  const index = hashString(id) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[index] ?? FALLBACK_GRADIENTS[0];
}

function buildDisplayCoin(
  entry: WatchlistEntry,
  overview: CoinOverview | undefined,
  history: Record<string, number[]>
): DisplayCoin {
  const meta = entry.meta ?? getCoinMeta(entry.id);

  return {
    id: entry.id,
    entry,
    overview,
    history: history[entry.id] ?? [],
    gradient: meta?.gradient ?? resolveGradient(entry.id),
    image: meta?.image ?? entry.image ?? null,
    name: meta?.name ?? entry.name,
    symbol: meta?.symbol ?? entry.symbol,
    supportsDetail: true,
  };
}

export default function DashboardView({
  initialCoins,
  initialHistory,
  initialTimestamp,
}: DashboardViewProps) {
  const {
    entries,
    isReady: isWatchlistReady,
    addToken,
    removeToken,
    reset,
  } = useWatchlist();

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialTimestamp ? new Date(initialTimestamp) : null
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [history, setHistory] =
    useState<Record<string, number[]>>(initialHistory);
  const [coinData, setCoinData] = useState<Record<string, CoinOverview>>(() => {
    const map: Record<string, CoinOverview> = {};
    initialCoins.forEach((coin) => {
      map[coin.id] = coin;
    });
    return map;
  });
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const requestedIdsRef = useRef(new Set<string>());
  const eventSourceRef = useRef<EventSource | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("watchlist");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<CoinCacheMap>({});
  const cacheLoadedRef = useRef(false);
  const initialCacheSeedRef = useRef(false);

  const persistCache = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        MARKET_CACHE_KEY,
        JSON.stringify(cacheRef.current)
      );
    } catch (error) {
      console.warn("No fue posible persistir la caché de mercado.", error);
    }
  }, []);

  const setCacheEntry = useCallback(
    (id: string, update: Partial<CoinCacheEntry>, persist = true) => {
      cacheRef.current[id] = {
        ...cacheRef.current[id],
        ...update,
      };
      if (persist) {
        persistCache();
      }
    },
    [persistCache]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(MARKET_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CoinCacheMap;
        cacheRef.current = parsed;
      }
    } catch (error) {
      console.warn("No fue posible leer la caché de mercado.", error);
    } finally {
      cacheLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!cacheLoadedRef.current || initialCacheSeedRef.current) {
      return;
    }
    initialCacheSeedRef.current = true;
    const now = Date.now();
    const cacheUpdates: Array<() => void> = [];

    initialCoins.forEach((coin) => {
      cacheUpdates.push(() =>
        setCacheEntry(
          coin.id,
          { overview: coin, overviewUpdatedAt: now },
          false
        )
      );
    });

    Object.entries(initialHistory).forEach(([id, series]) => {
      cacheUpdates.push(() =>
        setCacheEntry(
          id,
          { history: series, historyUpdatedAt: now },
          false
        )
      );
    });

    cacheUpdates.forEach((apply) => apply());
    if (cacheUpdates.length > 0) {
      persistCache();
    }
  }, [initialCoins, initialHistory, setCacheEntry, persistCache]);

  useEffect(() => {
    if (!cacheLoadedRef.current || !isWatchlistReady) {
      return;
    }
    const now = Date.now();
    if (entries.length === 0) {
      return;
    }

    setCoinData((prev) => {
      let changed = false;
      const next = { ...prev };
      entries.forEach((entry) => {
        const cached = cacheRef.current[entry.id];
        if (
          cached?.overview &&
          cached.overviewUpdatedAt &&
          now - cached.overviewUpdatedAt <= OVERVIEW_TTL_MS &&
          !next[entry.id]
        ) {
          next[entry.id] = cached.overview;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setHistory((prev) => {
      let changed = false;
      const next = { ...prev };
      entries.forEach((entry) => {
        const cached = cacheRef.current[entry.id];
        if (
          cached?.history &&
          cached.history.length > 0 &&
          cached.historyUpdatedAt &&
          now - cached.historyUpdatedAt <= HISTORY_TTL_MS &&
          (!next[entry.id] || next[entry.id].length === 0)
        ) {
          next[entry.id] = cached.history;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [entries, isWatchlistReady]);

  const watchlistSignature = useMemo(
    () => entries.map((entry) => entry.id).join(","),
    [entries]
  );

  const statusConfig = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return { label: "Conectado", tone: "text-emerald-300" };
      case "connecting":
        return { label: "Conectando...", tone: "text-slate-300" };
      case "error":
        return { label: "Error de streaming", tone: "text-rose-300" };
      default:
        return { label: "Desconocido", tone: "text-slate-400" };
    }
  }, [connectionStatus]);

  const lastUpdatedLabel = lastUpdated
    ? timeFormatter.format(lastUpdated)
    : "—";

  const displayCoins = useMemo<DisplayCoin[]>(() => {
    return entries.map((entry) =>
      buildDisplayCoin(entry, coinData[entry.id], history)
    );
  }, [entries, coinData, history]);

  const readyCoins = useMemo(
    () => displayCoins.filter((coin) => coin.overview),
    [displayCoins]
  );

  const bestPerformer = useMemo(() => {
    if (readyCoins.length === 0) return null;
    return readyCoins.reduce<DisplayCoin | null>((best, current) => {
      const bestChange = best?.overview?.change24h ?? -Infinity;
      const currentChange = current.overview?.change24h ?? -Infinity;
      if (currentChange > bestChange) {
        return current;
      }
      return best;
    }, readyCoins[0]);
  }, [readyCoins]);

  const worstPerformer = useMemo(() => {
    if (readyCoins.length === 0) return null;
    return readyCoins.reduce<DisplayCoin | null>((worst, current) => {
      const worstChange = worst?.overview?.change24h ?? Infinity;
      const currentChange = current.overview?.change24h ?? Infinity;
      if (currentChange < worstChange) {
        return current;
      }
      return worst;
    }, readyCoins[0]);
  }, [readyCoins]);

  const sortedCoins = useMemo(() => {
    const list = [...displayCoins];
    if (sortKey === "watchlist") {
      return list;
    }

    list.sort((a, b) => {
      const left = a.overview;
      const right = b.overview;

      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price": {
          const valueA = left?.price ?? -Infinity;
          const valueB = right?.price ?? -Infinity;
          return valueA - valueB;
        }
        case "change": {
          const valueA = left?.change24h ?? -Infinity;
          const valueB = right?.change24h ?? -Infinity;
          return valueA - valueB;
        }
        default:
          return 0;
      }
    });

    if (sortDirection === "desc") {
      list.reverse();
    }

    return list;
  }, [displayCoins, sortKey, sortDirection]);

  const filteredCoins = useMemo(() => {
    const baseList = sortKey === "watchlist" ? displayCoins : sortedCoins;

    if (filterMode === "all") {
      return baseList;
    }

    if (filterMode === "gainers") {
      return baseList
        .filter((coin) => (coin.overview?.change24h ?? 0) > 0)
        .sort(
          (a, b) => (b.overview?.change24h ?? 0) - (a.overview?.change24h ?? 0)
        );
    }

    return baseList
      .filter((coin) => (coin.overview?.change24h ?? 0) < 0)
      .sort(
        (a, b) => (a.overview?.change24h ?? 0) - (b.overview?.change24h ?? 0)
      );
  }, [displayCoins, sortedCoins, sortKey, filterMode]);

  useEffect(() => {
    if (!isWatchlistReady) {
      return;
    }

    const params = new URLSearchParams({
      key: String(streamKey),
      ids: watchlistSignature,
    });

    const source = new EventSource(`${LIVE_ENDPOINT}?${params.toString()}`);
    eventSourceRef.current = source;

    source.onopen = () => {
      setConnectionStatus("connected");
    };

    source.onmessage = (event) => {
      if (!event.data) {
        return;
      }

      try {
        const payload = JSON.parse(event.data);
        if (payload?.error) {
          setConnectionStatus("error");
          setLastError(
            payload.message ?? "No fue posible actualizar los precios en vivo."
          );
          return;
        }

        if (payload?.coins) {
          const updatedAt = payload.updatedAt
            ? new Date(payload.updatedAt)
            : new Date();
          const overviewArray = payload.coins as CoinOverview[];

          const overviewUpdates: Array<{ id: string; overview: CoinOverview }> =
            [];
          const historyUpdates: Array<{ id: string; series: number[] }> = [];

          setCoinData((prev) => {
            const next = { ...prev };
            overviewArray.forEach((coin) => {
              next[coin.id] = coin;
              overviewUpdates.push({ id: coin.id, overview: coin });
            });
            return next;
          });

          setHistory((prev) => {
            const next = { ...prev };
            overviewArray.forEach((coin) => {
              const previous = next[coin.id] ?? [];
              const appended = [...previous, coin.price];
              if (appended.length === 1) {
                appended.push(coin.price);
              }
              if (appended.length > HISTORY_LIMIT) {
                appended.splice(0, appended.length - HISTORY_LIMIT);
              }
              next[coin.id] = appended;
              historyUpdates.push({ id: coin.id, series: appended });
            });
            return next;
          });

          if (overviewUpdates.length > 0 || historyUpdates.length > 0) {
            const timestamp = Date.now();
            overviewUpdates.forEach(({ id, overview }) =>
              setCacheEntry(
                id,
                { overview, overviewUpdatedAt: timestamp },
                false
              )
            );
            historyUpdates.forEach(({ id, series }) =>
              setCacheEntry(
                id,
                { history: series, historyUpdatedAt: timestamp },
                false
              )
            );
            persistCache();
          }

          setLastUpdated(updatedAt);
          setConnectionStatus("connected");
          setLastError(null);
        }
      } catch (error) {
        console.error("SSE parsing error", error);
        setConnectionStatus("error");
        setLastError("No se pudo interpretar la actualización en vivo.");
      }
    };

    source.onerror = () => {
      setConnectionStatus("error");
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [
    streamKey,
    watchlistSignature,
    isWatchlistReady,
    setCacheEntry,
    persistCache,
  ]);

  const handleRestartStream = useCallback(() => {
    setLastError(null);
    setConnectionStatus("connecting");
    setStreamKey((prev) => prev + 1);
  }, []);

  const handleRemoveToken = useCallback(
    (id: string) => {
      removeToken(id);
      requestedIdsRef.current.delete(id);
      setHistory((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setCoinData((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [removeToken]
  );

  const canRetry = connectionStatus === "error";

  const handleResetWatchlist = useCallback(() => {
    requestedIdsRef.current.clear();
    reset();
  }, [reset]);

  useEffect(() => {
    if (!isWatchlistReady || !cacheLoadedRef.current) {
      return;
    }

    const now = Date.now();
    const idsToFetch: string[] = [];
    const seedCoinData: Record<string, CoinOverview> = {};
    const seedHistory: Record<string, number[]> = {};

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

      if (cached?.overview && !coinData[id]) {
        seedCoinData[id] = cached.overview;
      }

      if (cached?.history && cached.history.length > 0 && (!history[id] || history[id].length === 0)) {
        seedHistory[id] = cached.history;
      }

      const needsOverview = !overviewFresh;
      const needsHistory =
        !historyFresh ||
        !cached?.history ||
        cached.history.length === 0;

      if (
        (needsOverview || needsHistory) &&
        !requestedIdsRef.current.has(id)
      ) {
        idsToFetch.push(id);
      }
    });

    if (Object.keys(seedCoinData).length > 0) {
      setCoinData((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(seedCoinData).forEach(([id, overview]) => {
          if (!next[id]) {
            next[id] = overview;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }

    if (Object.keys(seedHistory).length > 0) {
      setHistory((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(seedHistory).forEach(([id, series]) => {
          if (!next[id] || next[id].length === 0) {
            next[id] = series;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }

    if (idsToFetch.length === 0) {
      return;
    }

    idsToFetch.forEach((id) => requestedIdsRef.current.add(id));
    setIsLoadingWatchlist(true);
    setWatchlistError(null);

    const controller = new AbortController();
    let cancelled = false;

    const loadMissing = async () => {
      try {
        const response = await fetch(
          `/api/coins/overview?ids=${encodeURIComponent(idsToFetch.join(","))}`,
          { signal: controller.signal }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            (payload as { message?: string })?.message ??
            "No fue posible obtener las cotizaciones.";
          idsToFetch.forEach((id) => requestedIdsRef.current.delete(id));
          if (!cancelled) {
            setWatchlistError(message);
          }
          return;
        }

        const overviewArray =
          (payload as { coins?: CoinOverview[] })?.coins ?? [];
        const overviewMap = new Map(
          overviewArray.map((coin) => [coin.id, coin] as const)
        );

        const overviewUpdates: Array<{ id: string; overview: CoinOverview }> =
          [];

        setCoinData((prev) => {
          const next = { ...prev };
          overviewArray.forEach((coin) => {
            next[coin.id] = coin;
            overviewUpdates.push({ id: coin.id, overview: coin });
          });
          return next;
        });

        const missingOverviewFallback = idsToFetch.filter(
          (id) => !overviewMap.has(id)
        );

        if (missingOverviewFallback.length > 0) {
          for (const id of missingOverviewFallback) {
            if (cancelled) break;
            try {
              const detailResponse = await fetch(
                `/api/coins/detail?id=${encodeURIComponent(id)}`,
                { signal: controller.signal }
              );
              const detailPayload = (await detailResponse
                .json()
                .catch(() => null)) as { coin?: CoinDetail } | null;

              if (!detailResponse.ok) {
                const message =
                  (detailPayload as { message?: string })?.message ??
                  "No fue posible obtener la cotización detallada.";
                if (!cancelled) {
                  setWatchlistError((prev) => prev ?? message);
                }
                continue;
              }

              const detailCoin = detailPayload?.coin;

              if (!detailCoin?.price) {
                continue;
              }

              const fallbackOverview: CoinOverview = {
                id: detailCoin.id,
                name: detailCoin.name,
                symbol: detailCoin.symbol,
                price: detailCoin.price,
                change24h: detailCoin.change24h ?? 0,
              };

              overviewMap.set(id, fallbackOverview);
              overviewUpdates.push({ id, overview: fallbackOverview });
              setCoinData((prev) => ({
                ...prev,
                [id]: fallbackOverview,
              }));
            } catch (detailError) {
              if (
                detailError instanceof Error &&
                detailError.name === "AbortError"
              ) {
                return;
              }
              console.error("Detail fallback error", detailError);
              if (!cancelled) {
                setWatchlistError((prev) =>
                  prev ??
                  "No fue posible obtener una cotización alternativa para la moneda seleccionada."
                );
              }
            }
          }
        }

        if (payload?.fetchedAt) {
          setLastUpdated(new Date(payload.fetchedAt));
        }

        const historyUpdates: Array<{ id: string; series: number[] }> = [];

        for (const id of idsToFetch) {
          if (cancelled) break;
          try {
            const historyResponse = await fetch(
              `/api/coins/history?id=${encodeURIComponent(
                id
              )}&days=7&interval=daily&points=${HISTORY_LIMIT}`,
              { signal: controller.signal }
            );
            const historyPayload = await historyResponse
              .json()
              .catch(() => null);
            if (!historyResponse.ok) {
              const message =
                (historyPayload as { message?: string })?.message ??
                "Histórico no disponible.";
              if (!cancelled) {
                setWatchlistError((prev) => prev ?? message);
              }
              continue;
            }
            const preparedSeries = (() => {
              const raw = Array.isArray(
                (historyPayload as { history?: number[] })?.history
              )
                ? [
                    ...((historyPayload as { history: number[] }).history ??
                      []),
                  ]
                : [];

              if (raw.length === 0) {
                const fallbackPrice = overviewMap.get(id)?.price;
                return fallbackPrice !== undefined
                  ? [fallbackPrice, fallbackPrice]
                  : [];
              }

              if (raw.length === 1) {
                raw.push(raw[0]);
              }

              return raw;
            })();

            if (!historyResponse.ok || preparedSeries.length === 0) {
              const fallbackPrice = overviewMap.get(id)?.price;
              if (fallbackPrice !== undefined) {
                const fallbackSeries = [fallbackPrice, fallbackPrice];
                historyUpdates.push({ id, series: fallbackSeries });
                setHistory((prev) => ({
                  ...prev,
                  [id]: fallbackSeries,
                }));
              }
              if (!cancelled) {
                const message =
                  (historyPayload as { message?: string })?.message ??
                  "Histórico no disponible.";
                setWatchlistError((prev) => prev ?? message);
              }
              continue;
            }

            historyUpdates.push({ id, series: preparedSeries });
            setHistory((prev) => ({
              ...prev,
              [id]: preparedSeries,
            }));
          } catch (historyError) {
            if (
              historyError instanceof Error &&
              historyError.name === "AbortError"
            ) {
              return;
            }
            console.error("History fetch error", historyError);
            if (!cancelled) {
              const message =
                historyError instanceof Error
                  ? historyError.message
                  : "No fue posible obtener histórico adicional.";
              setWatchlistError((prev) => prev ?? message);
            }
          }
        }

        const timestamp = Date.now();
        overviewUpdates.forEach(({ id, overview }) =>
          setCacheEntry(
            id,
            { overview, overviewUpdatedAt: timestamp },
            false
          )
        );
        historyUpdates.forEach(({ id, series }) =>
          setCacheEntry(
            id,
            { history: series, historyUpdatedAt: timestamp },
            false
          )
        );
        if (overviewUpdates.length > 0 || historyUpdates.length > 0) {
          persistCache();
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Watchlist fetch error", error);
        idsToFetch.forEach((id) => requestedIdsRef.current.delete(id));
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo sincronizar una o más monedas nuevas. Intenta nuevamente.";
          setWatchlistError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWatchlist(false);
        }
      }
    };

    loadMissing();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    entries,
    coinData,
    history,
    isWatchlistReady,
    setCacheEntry,
    persistCache,
  ]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const handler = setTimeout(() => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }

      const controller = new AbortController();
      searchAbortRef.current = controller;

      fetch(`/api/coins/search?query=${encodeURIComponent(searchTerm)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);

          if (!response.ok) {
            const message =
              (payload as { message?: string })?.message ??
              "No fue posible completar la búsqueda.";
            throw new Error(message);
          }

          setSearchResults(
            (payload as { coins?: SearchResult[] })?.coins ?? []
          );
          setSearchError(null);
        })
        .catch((error) => {
          if ((error as Error)?.name === "AbortError") {
            return;
          }
          console.error("Search error", error);
          const message =
            error instanceof Error
              ? error.message
              : "Error al buscar monedas. Intenta otra vez.";
          setSearchError(message);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      addToken({
        id: result.id,
        name: result.name,
        symbol: result.symbol,
        image: result.image,
        isDefault: false,
      });
      setSearchTerm("");
      setSearchResults([]);
    },
    [addToken]
  );

  const handleToggleSort = useCallback(
    (key: SortKey) => {
      if (key === "watchlist") {
        setSortKey("watchlist");
        return;
      }

      if (sortKey === key) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDirection("desc");
      }
    },
    [sortKey]
  );

  const handleFilterChange = useCallback((mode: FilterMode) => {
    setFilterMode(mode);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      <div className="pointer-events-none absolute -top-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 pb-16 pt-20 sm:px-8">
        <motion.header
          className="flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Live prices */}
            <div className="flex flex-col gap-6">
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200">
                <Sparkle className="h-4 w-4" />
                <span>Mercado en vivo</span>
              </div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Tablero de precios cripto
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                Gestiona tu watchlist cripto, descubre nuevos tokens y compara
                desempeño con actualizaciones automáticas cada minuto.
              </p>
              {/* Search form */}
              <form
                className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 shadow-inner"
                onSubmit={(event) => event.preventDefault()}
              >
                <Search className="h-4 w-4 text-cyan-300" />
                <input
                  className="w-full bg-transparent py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  placeholder="Buscar tokens por nombre o símbolo (ej. avax, arbitrum, ton)..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                )}
                {searchTerm && !isSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setSearchResults([]);
                    }}
                    className="text-slate-400 transition-colors hover:text-slate-200"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {searchResults.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl">
                    {searchResults.map((result) => {
                      const alreadyInWatchlist = entries.some(
                        (entry) => entry.id === result.id
                      );
                      return (
                        <li key={result.id}>
                          <button
                            type="button"
                            disabled={alreadyInWatchlist}
                            onClick={() => handleSelectResult(result)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:text-slate-500"
                          >
                            {result.image ? (
                              <Image
                                src={result.image}
                                alt={result.name}
                                width={28}
                                height={28}
                                className="rounded-full"
                              />
                            ) : (
                              <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-200">
                                {result.symbol.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-white">
                                {result.name}
                              </p>
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                {result.symbol}{" "}
                                {result.marketCapRank
                                  ? `· #${result.marketCapRank}`
                                  : null}
                              </p>
                            </div>
                            {alreadyInWatchlist ? (
                              <span className="text-xs font-semibold text-emerald-300">
                                En watchlist
                              </span>
                            ) : (
                              <Plus className="h-4 w-4 text-cyan-300" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </form>
              {searchError && (
                <p className="mt-2 text-xs text-rose-300">{searchError}</p>
              )}
              {/* Spacer */}
              <div className="border-b border-white/10" />
            </div>

            {/* Streaming status */}
            <div className="flex w-full h-fit flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Radio className="h-4 w-4 text-cyan-300" />
                    Estado del streaming
                  </p>
                  <p
                    className={`mt-2 text-sm font-semibold ${statusConfig.tone}`}
                  >
                    {statusConfig.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Última actualización:{" "}
                    <span className="font-medium text-slate-200">
                      {lastUpdatedLabel}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {canRetry && (
                    <button
                      type="button"
                      onClick={handleRestartStream}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400 hover:text-emerald-100"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reintentar
                    </button>
                  )}
                </div>
              </div>

              {lastError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {lastError}
                </div>
              )}
            </div>
          </div>

          {/* Watchlist */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-5">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
                <span>Watchlist</span>
                <span>{entries.length} activos</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {entries.map((entry) => (
                  <span
                    key={entry.id}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200"
                  >
                    {entry.symbol.toUpperCase()}
                    {!entry.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleRemoveToken(entry.id)}
                        className="text-slate-400 transition-colors hover:text-rose-300"
                        aria-label={`Quitar ${entry.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Best and worst performers */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-5">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
                <span>Mejores y peores</span>
                <button
                  type="button"
                  onClick={handleResetWatchlist}
                  className="text-xs font-semibold text-cyan-300 underline-offset-4 hover:underline"
                >
                  Resetear watchlist
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4">
                {bestPerformer ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ArrowUpRight className="h-5 w-5 text-emerald-300" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {bestPerformer.name}
                        </p>
                        <p className="text-xs font-medium text-emerald-300">
                          {bestPerformer.overview?.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="hidden h-12 w-32 md:block">
                      <Sparkline data={bestPerformer.history} color="#34d399" />
                    </div>
                  </div>
                ) : (
                  <EmptyPerformer placeholder="Sin datos" positive />
                )}

                {worstPerformer ? (
                  <div className="flex items-center justify-between rounded-xl bg-rose-500/15 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ArrowDownRight className="h-5 w-5 text-rose-300" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {worstPerformer.name}
                        </p>
                        <p className="text-xs font-medium text-rose-300">
                          {worstPerformer.overview?.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="hidden h-12 w-32 md:block">
                      <Sparkline
                        data={worstPerformer.history}
                        color="#f87171"
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyPerformer placeholder="Sin datos" />
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
              <Filter className="h-4 w-4 text-cyan-300" />
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  filterMode === "all"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("gainers")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  filterMode === "gainers"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                Top ganadoras
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("losers")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  filterMode === "losers"
                    ? "bg-rose-500/20 text-rose-200"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                Top perdedoras
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
              <span className="text-slate-400">Ordenar por:</span>
              <button
                type="button"
                onClick={() => handleToggleSort("watchlist")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  sortKey === "watchlist"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                Watchlist
              </button>
              <button
                type="button"
                onClick={() => handleToggleSort("name")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  sortKey === "name"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                Nombre{" "}
                {sortKey === "name"
                  ? sortDirection === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </button>
              <button
                type="button"
                onClick={() => handleToggleSort("price")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  sortKey === "price"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                Precio{" "}
                {sortKey === "price"
                  ? sortDirection === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </button>
              <button
                type="button"
                onClick={() => handleToggleSort("change")}
                className={`rounded-full px-3 py-1 transition-colors ${
                  sortKey === "change"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                % 24h{" "}
                {sortKey === "change"
                  ? sortDirection === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </button>
            </div>
          </div>

          {/* Watchlist loading or error */}
          {(isLoadingWatchlist || watchlistError) && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
              {isLoadingWatchlist && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                  <span>
                    Sincronizando nuevas monedas añadidas a tu watchlist...
                  </span>
                </>
              )}
              {!isLoadingWatchlist && watchlistError && (
                <span className="text-rose-300">{watchlistError}</span>
              )}
            </div>
          )}
        </motion.header>

        {/* Coins list */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredCoins.map((coin, index) => {
            const change = coin.overview?.change24h ?? 0;
            const price = coin.overview?.price;
            const positive = change >= 0;
            const historyData = coin.history;
            return (
              <motion.article
                key={coin.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 blur-3xl transition-all duration-500 group-hover:opacity-60 group-hover:blur-2xl bg-gradient-to-r ${coin.gradient}`}
                />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                      {coin.image ? (
                        <Image
                          src={coin.image}
                          alt={coin.name}
                          fill
                          sizes="56px"
                          className="object-contain p-2"
                          priority={index < 2}
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-lg font-semibold text-cyan-200">
                          {coin.symbol.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {coin.name}
                      </h2>
                      <p className="text-sm uppercase tracking-wide text-slate-400">
                        {coin.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!coin.entry.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleRemoveToken(coin.id)}
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:text-rose-300"
                        aria-label={`Quitar ${coin.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <LineChart className="h-6 w-6 text-slate-500 transition-colors duration-300 group-hover:text-slate-200" />
                  </div>
                </div>

                <div className="relative mt-6 flex flex-col gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Precio actual
                    </p>
                    <p className="text-3xl font-semibold text-white">
                      {price !== undefined
                        ? currencyFormatter.format(price)
                        : "—"}
                    </p>
                  </div>

                  <Sparkline
                    data={historyData}
                    color={positive ? "#34d399" : "#f87171"}
                  />

                  <div className="flex items-center justify-between">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                        positive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {positive ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      <span>
                        {positive ? "+" : ""}
                        {change.toFixed(2)}% 24h
                      </span>
                    </div>

                    {coin.supportsDetail ? (
                      <Link
                        href={`/coins/${coin.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition-colors duration-300 hover:text-cyan-200"
                      >
                        Ver detalles
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Detalle no disponible
                      </span>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
