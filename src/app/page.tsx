import Link from "next/link";
import ErrorMessage from "@/components/ErrorMessage";
import DashboardView from "@/components/dashboard/DashboardView";
import type { CoinWithMeta } from "@/components/dashboard/DashboardView";
import { fetchCoinMarketOverview } from "@/lib/coingecko";
import { getCoinMeta } from "@/lib/coins";

export default async function HomePage() {
  let coins: CoinWithMeta[] = [];
  let fetchedAt: string | null = null;
  let error: Error | null = null;

  try {
    // Artificial delay for testing LoadingSpinner
    // await new Promise((resolve) => setTimeout(resolve, 500));
    const overview = await fetchCoinMarketOverview();
    fetchedAt = new Date().toISOString();
    coins = overview
      .map((coin) => {
        const meta = getCoinMeta(coin.id);
        if (!meta) return null;
        return { ...coin, meta } as CoinWithMeta;
      })
      .filter(Boolean) as CoinWithMeta[];
  } catch (err) {
    error = err as Error;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="mx-auto flex max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
          <ErrorMessage message={error.message} />
        </div>
      </main>
    );
  }

  if (coins.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="mx-auto flex max-w-5xl flex-1 flex-col items-center gap-6 px-4 py-16 text-center">
          <ErrorMessage message="No se encontraron cotizaciones disponibles en este momento." />
          <p className="max-w-md text-sm text-slate-300">
            Puede tratarse de un problema temporal con la API de CoinGecko. Intenta nuevamente
            en unos segundos.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:text-cyan-100"
          >
            Reintentar
          </Link>
        </div>
      </main>
    );
  }

  return (
    <DashboardView initialCoins={coins} initialTimestamp={fetchedAt} />
  );
}
