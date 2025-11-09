import { useCallback, useEffect, useState } from "react";
import { SUPPORTED_COINS, type CoinMeta } from "@/lib/coins";

const STORAGE_KEY = "crypto-dashboard:watchlist";

export interface WatchlistEntry {
  id: string;
  name: string;
  symbol: string;
  image?: string | null;
  meta?: CoinMeta;
  isDefault?: boolean;
}

const BASE_ENTRIES: WatchlistEntry[] = SUPPORTED_COINS.map((coin) => ({
  id: coin.id,
  name: coin.name,
  symbol: coin.symbol,
  image: coin.image,
  meta: coin,
  isDefault: true,
}));

function normaliseEntry(entry: unknown): WatchlistEntry | null {
  if (
    !entry ||
    typeof entry !== "object" ||
    !("id" in entry) ||
    typeof entry.id !== "string"
  ) {
    return null;
  }

  const id = entry.id;
  const name =
    "name" in entry && typeof entry.name === "string"
      ? entry.name
      : id.toUpperCase();
  const symbol =
    "symbol" in entry && typeof entry.symbol === "string"
      ? entry.symbol
      : id.slice(0, 5).toUpperCase();

  return {
    id,
    name,
    symbol,
    image:
      "image" in entry && typeof entry.image === "string"
        ? entry.image
        : undefined,
    isDefault:
      "isDefault" in entry && typeof entry.isDefault === "boolean"
        ? entry.isDefault
        : false,
  };
}

function readWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") {
    return BASE_ENTRIES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return BASE_ENTRIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return BASE_ENTRIES;
    }

    const valid = parsed
      .map(normaliseEntry)
      .filter((entry): entry is WatchlistEntry => entry !== null);

    const dedup = new Map<string, WatchlistEntry>();
    BASE_ENTRIES.forEach((entry) => dedup.set(entry.id, entry));
    valid.forEach((entry) => dedup.set(entry.id, entry));

    return Array.from(dedup.values());
  } catch (error) {
    console.warn("Watchlist read failed", error);
  }

  return BASE_ENTRIES;
}

function writeWatchlist(entries: WatchlistEntry[]) {
  try {
    if (typeof window !== "undefined") {
      const serialisable = entries.map((entry) => {
        const clone = { ...entry };
        delete clone.meta;
        return clone;
      });
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(serialisable)
      );
    }
  } catch (error) {
    console.warn("Watchlist write failed", error);
  }
}

/* eslint-disable react-hooks/set-state-in-effect */
export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(BASE_ENTRIES);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const list = readWatchlist();
    setEntries(list);
    setIsReady(true);
  }, []);

  const addToken = useCallback((entry: WatchlistEntry) => {
    setEntries((prev) => {
      if (prev.some((item) => item.id === entry.id)) {
        return prev;
      }
      const next = [
        ...prev,
        {
          ...entry,
          isDefault: entry.isDefault ?? false,
        },
      ];
      writeWatchlist(next);
      return next;
    });
  }, []);

  const removeToken = useCallback((id: string) => {
    if (BASE_ENTRIES.some((entry) => entry.id === id)) {
      return;
    }

    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      writeWatchlist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    writeWatchlist(BASE_ENTRIES);
    setEntries(BASE_ENTRIES);
  }, []);

  return {
    entries,
    isReady,
    addToken,
    removeToken,
    reset,
  };
}
/* eslint-enable react-hooks/set-state-in-effect */

