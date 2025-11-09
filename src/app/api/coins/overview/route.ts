import { NextRequest, NextResponse } from "next/server";
import {
  CoinGeckoRateLimitError,
  fetchCoinMarketOverview,
} from "@/lib/coingecko";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  const ids = idsParam
    ? idsParam
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  try {
    const coins = await fetchCoinMarketOverview({
      ids,
      cache: "no-store",
    });

    return NextResponse.json({
      coins,
      fetchedAt: new Date().toISOString(),
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
        message: "No fue posible obtener las cotizaciones solicitadas.",
      },
      { status: 500 }
    );
  }
}
