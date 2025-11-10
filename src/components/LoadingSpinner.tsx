"use client";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-slate-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-900/70 p-2 shadow-lg">
        <span className="relative block h-full w-full rounded-full border-4 border-cyan-400/40 border-t-cyan-300 animate-spin" />
      </div>
      <p className="text-sm font-medium tracking-wide text-slate-300 animate-pulse">
        Loading market data...
      </p>
    </div>
  );
}
