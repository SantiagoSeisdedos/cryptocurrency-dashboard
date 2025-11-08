"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, LineChart, Sparkle } from "lucide-react";
import type { CoinMeta } from "@/lib/coins";
import type { CoinOverview } from "@/lib/coingecko";

export type CoinWithMeta = CoinOverview & { meta: CoinMeta };

interface DashboardViewProps {
  coins: CoinWithMeta[];
  bestPerformer: CoinWithMeta | null;
  worstPerformer: CoinWithMeta | null;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default function DashboardView({
  coins,
  bestPerformer,
  worstPerformer,
}: DashboardViewProps) {
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

          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-4">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
              <span>Mejor desempeño</span>
              <span>Peor desempeño</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              {bestPerformer ? (
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-emerald-500/15 px-4 py-3">
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
              ) : (
                <EmptyPerformer placeholder="N/A" positive />
              )}
              {worstPerformer ? (
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-rose-500/15 px-4 py-3">
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
              ) : (
                <EmptyPerformer placeholder="N/A" />
              )}
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

function EmptyPerformer({
  placeholder,
  positive = false,
}: {
  placeholder: string;
  positive?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 ${
        positive ? "bg-emerald-500/5" : "bg-rose-500/5"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-5 w-5 text-emerald-200" />
      ) : (
        <ArrowDownRight className="h-5 w-5 text-rose-200" />
      )}
      <div>
        <p className="text-sm font-semibold text-white">{placeholder}</p>
        <p className="text-xs font-medium text-slate-400">Sin datos</p>
      </div>
    </div>
  );
}


