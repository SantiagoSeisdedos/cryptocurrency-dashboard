import "server-only";

import { SUPPORTED_COINS, type SupportedCoinId } from "./coins";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const COINGECKO_API_KEY =
  process.env.COINGECKO_API_KEY ??
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY ??
  null;

export class CoinGeckoRateLimitError extends Error {
  status: number;

  constructor(
    message = "Se alcanzó el límite de la API pública de CoinGecko. Intenta nuevamente en un momento o configura tu propia API key (ver README).",
    status = 429
  ) {
    super(message);
    this.name = "CoinGeckoRateLimitError";
    this.status = status;
  }
}

interface SimplePriceResponse {
  [key: string]: {
    usd?: number;
    usd_24h_change?: number;
  };
}

export interface CoinOverview {
  id: SupportedCoinId | string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
}

export interface CoinDetail {
  id: SupportedCoinId | string;
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

function createFetchConfig(
  options?: FetchOptions,
  defaultRevalidate = 60
): RequestInit & { next?: { revalidate: number } } {
  const config: RequestInit & { next?: { revalidate: number } } = {};

  if (COINGECKO_API_KEY) {
    config.headers = {
      "x-cg-pro-api-key": COINGECKO_API_KEY,
    };
  }

  if (options?.cache) {
    config.cache = options.cache;
  }

  if (options?.cache !== "no-store") {
    config.next = { revalidate: options?.revalidate ?? defaultRevalidate };
  }

  return config;
}

function assertRateLimit(response: Response) {
  if (response.status === 429) {
    throw new CoinGeckoRateLimitError();
  }
}

type CoinId = SupportedCoinId | string;

export async function fetchCoinMarketOverview(
  options?: FetchOptions & { ids?: CoinId[] }
): Promise<CoinOverview[]> {
  const idsList = options?.ids ?? SUPPORTED_COINS.map((coin) => coin.id);
  const params = new URLSearchParams({
    ids: idsList.join(","),
    vs_currencies: "usd",
    include_24hr_change: "true",
  });

  const fetchConfig = createFetchConfig(options);
  let response: Response;
  try {
    response = await fetch(
      `${COINGECKO_API}/simple/price?${params.toString()}`,
      fetchConfig
    );
  } catch {
    throw new Error("No fue posible obtener los precios actuales.");
  }

  assertRateLimit(response);

  if (!response.ok) {
    throw new Error("No fue posible obtener los precios actuales.");
  }

  const result: SimplePriceResponse = await response.json();

  return idsList.flatMap((id) => {
    const entry = result[id];
    if (!entry || entry.usd === undefined) {
      return [];
    }

    const meta = SUPPORTED_COINS.find((coin) => coin.id === id);

    return {
      id: id as SupportedCoinId,
      name: meta?.name ?? id.toUpperCase(),
      symbol: meta?.symbol ?? id.slice(0, 5).toUpperCase(),
      price: entry.usd ?? 0,
      change24h: entry.usd_24h_change ?? 0,
    };
  });
}

export async function fetchCoinDetail(
  id: string,
  options?: FetchOptions
): Promise<CoinDetail | undefined> {
  const normalizedId = id.toLowerCase();

  const fetchConfig = createFetchConfig(options);
  const response = await fetch(
    `${COINGECKO_API}/coins/${normalizedId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    fetchConfig
  );

  assertRateLimit(response);

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

  return {
    id: (data?.id ?? normalizedId) as SupportedCoinId | string,
    name: data.name ?? normalizedId.toUpperCase(),
    symbol: (data.symbol ?? normalizedId).toUpperCase(),
    price: marketData.current_price.usd ?? 0,
    change24h: marketData.price_change_percentage_24h ?? 0,
    high24h: marketData.high_24h?.usd ?? 0,
    low24h: marketData.low_24h?.usd ?? 0,
    image: data.image?.large ?? null,
    lastUpdated: data.last_updated ?? null,
  };
}

export async function fetchCoinMarketHistory(
  id: string,
  options?: MarketChartOptions
): Promise<number[]> {
  const params = new URLSearchParams({
    vs_currency: "usd",
    days: String(options?.days ?? 7),
    interval: options?.interval ?? "daily",
  });

  const fetchConfig = createFetchConfig(
    {
      ...options,
      revalidate: options?.revalidate ?? 600,
    },
    600
  );

  let response: Response;
  try {
    response = await fetch(
      `${COINGECKO_API}/coins/${id}/market_chart?${params.toString()}`,
      fetchConfig
    );
  } catch {
    return [];
  }

  assertRateLimit(response);

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
