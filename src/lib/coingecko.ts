import "server-only";

import { COIN_ID_SET, SUPPORTED_COINS, type SupportedCoinId } from "./coins";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

interface SimplePriceResponse {
  [key: string]: {
    usd?: number;
    usd_24h_change?: number;
  };
}

export interface CoinOverview {
  id: SupportedCoinId;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
}

export interface CoinDetail {
  id: SupportedCoinId;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  image: string | null;
  lastUpdated: string | null;
}

interface FetchOptions {
  cache?: RequestCache;
  revalidate?: number;
}

interface MarketChartOptions extends FetchOptions {
  days?: number;
  interval?: string;
  points?: number;
}

export async function fetchCoinMarketOverview(
  options?: FetchOptions
): Promise<CoinOverview[]> {
  const ids = SUPPORTED_COINS.map((coin) => coin.id).join(",");

  const params = new URLSearchParams({
    ids,
    vs_currencies: "usd",
    include_24hr_change: "true",
  });

  const fetchConfig: RequestInit & { next?: { revalidate: number } } = {};

  if (options?.cache) {
    fetchConfig.cache = options.cache;
  }

  if (options?.cache !== "no-store") {
    fetchConfig.next = { revalidate: options?.revalidate ?? 60 };
  }
  let response: Response;
  try {
    response = await fetch(
      `${COINGECKO_API}/simple/price?${params.toString()}`,
      fetchConfig
    );
  } catch(error) {
    console.error(error);
    throw new Error("No fue posible obtener los precios actuales.");
  }

  if (!response.ok) {
    throw new Error("No fue posible obtener los precios actuales.");
  }

  const result: SimplePriceResponse = await response.json();
  return SUPPORTED_COINS.flatMap((coin) => {
    const entry = result[coin.id];
    if (!entry || entry.usd === undefined) {
      return [];
    }

    return {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      price: entry.usd ?? 0,
      change24h: entry.usd_24h_change ?? 0,
    };
  });
}

export async function fetchCoinDetail(
  id: string,
  options?: FetchOptions
): Promise<CoinDetail | undefined> {
  if (!COIN_ID_SET.has(id as SupportedCoinId)) {
    return undefined;
  }

  const fetchConfig: RequestInit & { next?: { revalidate: number } } = {};

  if (options?.cache) {
    fetchConfig.cache = options.cache;
  }

  if (options?.cache !== "no-store") {
    fetchConfig.next = { revalidate: options?.revalidate ?? 60 };
  }

  const response = await fetch(
    `${COINGECKO_API}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    fetchConfig
  );

  if (!response.ok) {
    if (response.status === 404) {
      return undefined;
    }

    throw new Error("No fue posible obtener el detalle de la criptomoneda.");
  }

  const data = await response.json();
  const marketData = data.market_data;

  if (!marketData?.current_price?.usd) {
    return undefined;
  }

  const castId = id as SupportedCoinId;

  return {
    id: castId,
    name: data.name ?? castId.toUpperCase(),
    symbol: (data.symbol ?? castId).toUpperCase(),
    price: marketData.current_price.usd ?? 0,
    change24h: marketData.price_change_percentage_24h ?? 0,
    high24h: marketData.high_24h?.usd ?? 0,
    low24h: marketData.low_24h?.usd ?? 0,
    image: data.image?.large ?? null,
    lastUpdated: data.last_updated ?? null,
  };
}

export async function fetchCoinMarketHistory(
  id: SupportedCoinId,
  options?: MarketChartOptions
): Promise<number[]> {
  if (!COIN_ID_SET.has(id)) {
    return [];
  }

  const params = new URLSearchParams({
    vs_currency: "usd",
    days: String(options?.days ?? 7),
    interval: options?.interval ?? "daily",
  });

  const fetchConfig: RequestInit & { next?: { revalidate: number } } = {};

  if (options?.cache) {
    fetchConfig.cache = options.cache;
  }

  if (options?.cache !== "no-store") {
    fetchConfig.next = { revalidate: options?.revalidate ?? 600 };
  }

  let response: Response;
  try {
    response = await fetch(
      `${COINGECKO_API}/coins/${id}/market_chart?${params.toString()}`,
      fetchConfig
    );
  } catch {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const prices = Array.isArray(data?.prices) ? data.prices : [];
  const extracted = prices
    .map((point: unknown) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const price = Number(point[1]);
      return Number.isFinite(price) ? price : null;
    })
    .filter((value: number | null): value is number => value !== null);

  const limit = options?.points ?? 7;
  if (extracted.length > limit) {
    return extracted.slice(-limit);
  }

  return extracted;
}
