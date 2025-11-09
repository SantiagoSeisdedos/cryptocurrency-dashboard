import type { CoinOverview } from "./coingecko";

export const MARKET_CACHE_KEY = "crypto-dashboard:coin-cache";
export const OVERVIEW_TTL_MS = 60 * 1000; // 1 minuto
export const HISTORY_TTL_MS = 5 * 60 * 1000; // 5 minutos

export interface CoinCacheEntry {
  overview?: CoinOverview;
  overviewUpdatedAt?: number;
  history?: number[];
  historyUpdatedAt?: number;
}

export type CoinCacheMap = Record<string, CoinCacheEntry>;

