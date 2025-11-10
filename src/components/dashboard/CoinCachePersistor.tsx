"use client";

import { useEffect } from "react";
import type { CoinDetail } from "@/lib/coingecko";
import {
  MARKET_CACHE_KEY,
  type CoinCacheMap,
} from "@/lib/cache";

interface CoinCachePersistorProps {
  detail: CoinDetail;
  history: number[];
}

export default function CoinCachePersistor({
  detail,
  history,
}: CoinCachePersistorProps) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(MARKET_CACHE_KEY);
      const cache: CoinCacheMap = raw ? JSON.parse(raw) : {};
      const existing = cache[detail.id] ?? {};
      const timestamp = Date.now();

      cache[detail.id] = {
        ...existing,
        overview: {
          id: detail.id,
          name: detail.name,
          symbol: detail.symbol,
          price: detail.price,
          change24h: detail.change24h,
        },
        overviewUpdatedAt: timestamp,
        history: history.length > 0 ? history : existing.history ?? [],
        historyUpdatedAt:
          history.length > 0 ? timestamp : existing.historyUpdatedAt,
      };

      window.localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn("Failed to persist detail cache entry.", error);
    }
  }, [detail, history]);

  return null;
}

