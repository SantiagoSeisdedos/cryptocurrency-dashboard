"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  LineChart,
  Radio,
  Sparkle,
} from "lucide-react";
import { getCoinMeta, type CoinMeta } from "@/lib/coins";
import type { CoinOverview } from "@/lib/coingecko";
import EmptyPerformer from "./EmptyPerformer";
import Sparkline from "./Sparkline";
import { currencyFormatter } from "@/lib/format";

export type CoinWithMeta = CoinOverview & { meta: CoinMeta };

type ConnectionStatus = "connected" | "connecting" | "error";

interface DashboardViewProps {
  initialCoins: CoinWithMeta[];
  initialHistory: Record<string, number[]>;
  initialTimestamp: string | null;
}

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const LIVE_ENDPOINT = "/api/live-prices";
const HISTORY_LIMIT = 7;

export default function DashboardView({
  initialCoins,
  initialHistory,
  initialTimestamp,
}: DashboardViewProps) {
  const [liveCoins, setLiveCoins] = useState<CoinWithMeta[] | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialTimestamp ? new Date(initialTimestamp) : null
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [streamSession, setStreamSession] = useState(0);
  const [history, setHistory] = useState<Record<string, number[]>>(
    initialHistory
  );
  const eventSourceRef = useRef<EventSource | null>(null);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    const source = new EventSource(`${LIVE_ENDPOINT}?session=${streamSession}`);
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
          const merged = (payload.coins as CoinOverview[])
            .map((coin) => {
              const meta = getCoinMeta(coin.id);
              if (!meta) return null;
              return { ...coin, meta };
            })
            .filter(Boolean) as CoinWithMeta[];

          if (merged.length > 0) {
            setLiveCoins(merged);
            setLastUpdated(
              payload.updatedAt ? new Date(payload.updatedAt) : new Date()
            );
            setConnectionStatus("connected");
            setLastError(null);
            setHistory((prev) => {
              const next = { ...prev };
              merged.forEach((coin) => {
                const existing =
                  next[coin.id] ?? initialHistory[coin.id] ?? [];
                const updated = [...existing, coin.price];
                if (updated.length > HISTORY_LIMIT) {
                  updated.splice(0, updated.length - HISTORY_LIMIT);
                }
                next[coin.id] = updated;
              });
              return next;
            });
          }
        }
      } catch {
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
  }, [streamSession, initialHistory]);

  const handleRestartStream = () => {
    setLiveCoins(null);
    setLastError(null);
    setConnectionStatus("connecting");
    closeStream();
    setLastUpdated(null);
    setHistory(initialHistory);
    setStreamSession((prev) => prev + 1);
  };

  const coins = liveCoins ?? initialCoins;

  const bestPerformer = useMemo(() => {
    return coins.reduce<CoinWithMeta | null>((best, curr) => {
      if (!best || curr.change24h > best.change24h) {
        return curr;
      }
      return best;
    }, coins[0] ?? null);
  }, [coins]);

  const worstPerformer = useMemo(() => {
    return coins.reduce<CoinWithMeta | null>((worst, curr) => {
      if (!worst || curr.change24h < worst.change24h) {
        return curr;
      }
      return worst;
    }, coins[0] ?? null);
  }, [coins]);

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

  const canRetry = connectionStatus === "error";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      <div className="pointer-events-none absolute -top-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 pb-16 pt-20 sm:px-8">
        <motion.header
          className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:flex-row"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200">
              <Sparkle className="h-4 w-4" />
              <span>Mercado en vivo</span>
            </div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Tablero de precios cripto
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
              Consulta los precios en tiempo casi real de las principales
              criptomonedas y explora su comportamiento en las últimas 24 horas.
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-5">
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
                    <ArrowUpRight className="h-4 w-4" />
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

            <div className="h-px w-full bg-white/5" />

            <div>
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
                <span>Mejor desempeño</span>
                <span>Peor desempeño</span>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {bestPerformer ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ArrowUpRight className="h-5 w-5 text-emerald-300" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {bestPerformer.meta.name}
                        </p>
                        <p className="text-xs font-medium text-emerald-300">
                          {bestPerformer.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="hidden h-12 w-32 sm:block">
                      <Sparkline
                        data={history[bestPerformer.id] ?? []}
                        color="#34d399"
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyPerformer placeholder="N/A" positive />
                )}
                {worstPerformer ? (
                  <div className="flex items-center justify-between rounded-xl bg-rose-500/15 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ArrowDownRight className="h-5 w-5 text-rose-300" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {worstPerformer.meta.name}
                        </p>
                        <p className="text-xs font-medium text-rose-300">
                          {worstPerformer.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="hidden h-12 w-32 sm:block">
                      <Sparkline
                        data={history[worstPerformer.id] ?? []}
                        color="#f87171"
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyPerformer placeholder="N/A" />
                )}
              </div>
            </div>
          </div>
        </motion.header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {coins.map((coin, index) => (
            <motion.article
              key={coin.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl"
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 blur-3xl transition-all duration-500 group-hover:opacity-60 group-hover:blur-2xl bg-gradient-to-r ${coin.meta.gradient}`}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                    <Image
                      src={coin.meta.image}
                      alt={coin.meta.name}
                      fill
                      sizes="56px"
                      className="object-contain p-2"
                      priority={index < 2}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {coin.meta.name}
                    </h2>
                    <p className="text-sm uppercase tracking-wide text-slate-400">
                      {coin.meta.symbol}
                    </p>
                  </div>
                </div>
                <LineChart className="h-6 w-6 text-slate-500 transition-colors duration-300 group-hover:text-slate-200" />
              </div>

              <div className="relative mt-6 flex flex-col gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Precio actual
                  </p>
                  <p className="text-3xl font-semibold text-white">
                    {currencyFormatter.format(coin.price)}
                  </p>
                </div>

                <Sparkline
                  data={history[coin.id] ?? []}
                  color={coin.change24h >= 0 ? "#34d399" : "#f87171"}
                />

                <div className="flex items-center justify-between">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                      coin.change24h >= 0
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {coin.change24h >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    <span>
                      {coin.change24h >= 0 ? "+" : ""}
                      {coin.change24h.toFixed(2)}% 24h
                    </span>
                  </div>

                  <Link
                    href={`/coins/${coin.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition-colors duration-300 hover:text-cyan-200"
                  >
                    Ver detalles
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      </div>
    </main>
  );
}
