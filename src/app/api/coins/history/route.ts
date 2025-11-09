import { NextRequest, NextResponse } from "next/server";
import {
  CoinGeckoRateLimitError,
  fetchCoinMarketHistory,
} from "@/lib/coingecko";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const days = Number(request.nextUrl.searchParams.get("days") ?? 7);
  const interval = request.nextUrl.searchParams.get("interval") ?? "daily";
  const points = request.nextUrl.searchParams.get("points");

  if (!id) {
    return NextResponse.json(
      { error: true, message: "Se requiere un identificador de moneda." },
      { status: 400 }
    );
  }

  try {
    const history = await fetchCoinMarketHistory(id.toLowerCase(), {
      days: Number.isNaN(days) ? 7 : days,
      interval,
      points: points ? Number(points) : undefined,
      cache: "no-store",
    });

    return NextResponse.json({
      id,
      history,
    });
  } catch (error) {
    if (error instanceof CoinGeckoRateLimitError) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error: true,
        message: "No fue posible obtener el histórico solicitado.",
      },
      { status: 500 }
    );
  }
}

