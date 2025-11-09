"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  LineChart,
  X,
} from "lucide-react";
import Sparkline from "./Sparkline";
import { currencyFormatter } from "@/lib/format";

interface CoinCardProps {
  id: string;
  name: string;
  symbol: string;
  image?: string | null;
  gradient: string;
  price?: number;
  change24h?: number;
  history: number[];
  index: number;
  supportsDetail: boolean;
  isDefault?: boolean;
  onRemove: (id: string) => void;
}

export default function CoinCard({
  id,
  name,
  symbol,
  image,
  gradient,
  price,
  change24h = 0,
  history,
  index,
  supportsDetail,
  isDefault,
  onRemove,
}: CoinCardProps) {
  const positive = change24h >= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur-xl"
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 blur-3xl transition-all duration-500 group-hover:opacity-60 group-hover:blur-2xl bg-gradient-to-r ${gradient}`}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
            {image ? (
              <Image
                src={image}
                alt={name}
                fill
                sizes="56px"
                className="object-contain p-2"
                priority={index < 2}
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-lg font-semibold text-cyan-200">
                {symbol.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{name}</h2>
            <p className="text-sm uppercase tracking-wide text-slate-400">
              {symbol}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:text-rose-300"
              aria-label={`Quitar ${name}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <LineChart className="h-6 w-6 text-slate-500 transition-colors duration-300 group-hover:text-slate-200" />
        </div>
      </div>

      <div className="relative mt-6 flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Precio actual
          </p>
          <p className="text-3xl font-semibold text-white">
            {price !== undefined ? currencyFormatter.format(price) : "—"}
          </p>
        </div>

        <Sparkline data={history} color={positive ? "#34d399" : "#f87171"} />

        <div className="flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              positive
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-rose-500/15 text-rose-300"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>
              {positive ? "+" : ""}
              {change24h.toFixed(2)}% 24h
            </span>
          </div>

          {supportsDetail ? (
            <Link
              href={`/coins/${id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition-colors duration-300 hover:text-cyan-200"
            >
              Ver detalles
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              Detalle no disponible
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
