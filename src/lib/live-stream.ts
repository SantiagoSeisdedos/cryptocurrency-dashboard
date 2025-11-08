import type { ReadableStreamDefaultController } from "stream/web";
import { fetchCoinMarketOverview } from "./coingecko";
import type { CoinOverview } from "./coingecko";

export interface LiveStreamMessage {
  coins?: CoinOverview[];
  updatedAt?: string;
  error?: boolean;
  message?: string;
}

type PushFn = (data: LiveStreamMessage) => void;
type ErrorFn = (error: Error) => void;
type KeepAliveFn = () => void;

export async function loadLivePrices(): Promise<LiveStreamMessage> {
  const coins = await fetchCoinMarketOverview({ cache: "no-store" });
  return { coins, updatedAt: new Date().toISOString() };
}

export function createStreamingLoop(
  _controller: ReadableStreamDefaultController,
  intervalMs: number,
  push: PushFn,
  onError: ErrorFn,
  keepAlive: KeepAliveFn
) {
  const tick = async () => {
    try {
      const payload = await loadLivePrices();
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

