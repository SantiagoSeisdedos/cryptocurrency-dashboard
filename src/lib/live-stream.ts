import type { ReadableStreamDefaultController } from "stream/web";
import {
  CoinGeckoRateLimitError,
  fetchCoinMarketOverview,
  type CoinOverview,
} from "./coingecko";

export interface LiveStreamMessage {
  coins?: CoinOverview[];
  updatedAt?: string;
  error?: boolean;
  message?: string;
}

type PushFn = (data: LiveStreamMessage) => void;
type ErrorFn = (error: Error) => void;
type KeepAliveFn = () => void;

export async function loadLivePrices(
  ids?: string[]
): Promise<LiveStreamMessage> {
  try {
    const coins = await fetchCoinMarketOverview({ cache: "no-store", ids });
    return { coins, updatedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof CoinGeckoRateLimitError) {
      return { error: true, message: error.message };
    }
    return {
      error: true,
      message: "No fue posible obtener los precios actuales para el streaming.",
    };
  }
}

export function createStreamingLoop(
  _controller: ReadableStreamDefaultController,
  intervalMs: number,
  push: PushFn,
  onError: ErrorFn,
  keepAlive: KeepAliveFn,
  ids?: string[]
) {
  const tick = async () => {
    try {
      const payload = await loadLivePrices(ids);
      push(payload);
    } catch (error) {
      onError(error as Error);
    }
  };

  // Primer envío inmediato
  tick();

  const timer = setInterval(tick, intervalMs);
  const heartbeat = setInterval(keepAlive, 15000);

  return () => {
    clearInterval(timer);
    clearInterval(heartbeat);
  };
}

