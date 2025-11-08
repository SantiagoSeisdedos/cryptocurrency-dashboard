import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";

export default function CoinNotFound() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full border border-white/10 bg-rose-500/10 p-4 text-rose-300">
          <CircleAlert className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-semibold text-white">
          No encontramos esa criptomoneda
        </h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Verifica el identificador y vuelve a intentarlo, o regresa al listado
          principal para explorar las monedas disponibles.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al tablero
        </Link>
      </div>
    </main>
  );
}

