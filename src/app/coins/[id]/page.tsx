import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, ArrowLeft, Clock } from "lucide-react";
import ErrorMessage from "@/components/ErrorMessage";
import {
  fetchCoinDetail,
  fetchCoinMarketHistory,
} from "@/lib/coingecko";
import { getCoinMeta } from "@/lib/coins";
import Sparkline from "@/components/dashboard/Sparkline";
import { currencyFormatter } from "@/lib/format";

type PageParams = {
  id: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function CoinDetailPage({ params }: PageProps) {
  const { id } = await params;
  const meta = getCoinMeta(id);

  if (!meta) {
    notFound();
  }

  let detail;
  let error: Error | null = null;
  let history: number[] = [];

  try {
    detail = await fetchCoinDetail(id);
    history = await fetchCoinMarketHistory(meta.id, {
      days: 30,
      points: 30,
      interval: "daily",
      cache: "default",
      revalidate: 600,
    });
  } catch (err) {
    error = err as Error;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950">
        <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-4 py-16">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <ErrorMessage
            message={
              error?.message ??
              "Error al obtener el detalle de la criptomoneda."
            }
          />
        </div>
      </main>
    );
  }

  if (!detail) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-black" />
      <div className="pointer-events-none absolute -top-64 left-1/2 h-128 w-lg -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 pb-16 pt-20 sm:px-8">
        <div className="flex flex-col gap-6">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al tablero
          </Link>

          <div className="flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="flex items-center gap-6">
              <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-white/20 bg-white/10">
                <Image
                  src={detail.image ?? meta.image}
                  alt={meta.name}
                  fill
                  sizes="80px"
                  className="object-contain p-4"
                  priority
                />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  {meta.name}
                </h1>
                <p className="mt-1 text-sm uppercase tracking-wider text-slate-300">
                  {meta.symbol}
                </p>
                {detail.lastUpdated && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    <Clock className="h-3.5 w-3.5" />
                    Actualizado {new Date(detail.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Precio actual
              </p>
              <p className="text-3xl font-semibold text-white">
                {currencyFormatter.format(detail.price)}
              </p>
              <div
                className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                  detail.change24h >= 0
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {detail.change24h >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>
                  {detail.change24h >= 0 ? "+" : ""}
                  {detail.change24h.toFixed(2)}% 24h
                </span>
              </div>
            </div>
          </div>
          {history.length > 1 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
                Evolución últimos 30 días
              </h2>
              <div className="mt-6 h-48 w-full">
                <Sparkline
                  data={history}
                  color={detail.change24h >= 0 ? "#34d399" : "#f87171"}
                  width={640}
                  height={180}
                />
              </div>
            </div>
          )}
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Máximo 24h
            </h2>
            <p className="mt-3 text-3xl font-semibold text-white">
              {currencyFormatter.format(detail.high24h)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Valor más alto registrado en las últimas 24 horas.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Mínimo 24h
            </h2>
            <p className="mt-3 text-3xl font-semibold text-white">
              {currencyFormatter.format(detail.low24h)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Valor más bajo registrado en las últimas 24 horas.
            </p>
          </article>
        </section>

        <div className="mt-4 text-sm text-slate-400 sm:text-center">
          Fuente de datos: CoinGecko API — actualizaciones automáticas cada 60
          segundos.
        </div>
      </div>
    </main>
  );
}
