import { NextRequest, NextResponse } from "next/server";
import { fetchCoinDetail, CoinGeckoRateLimitError } from "@/lib/coingecko";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: true, message: "Se requiere un identificador de moneda." },
      { status: 400 }
    );
  }

  try {
    const detail = await fetchCoinDetail(id, { cache: "no-store" });
    if (!detail) {
      return NextResponse.json(
        { error: true, message: "No se encontró la criptomoneda solicitada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ coin: detail });
  } catch (error) {
    if (error instanceof CoinGeckoRateLimitError) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: error.status }
      );
    }
    console.error("Detail API error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "No fue posible obtener la cotización detallada.",
      },
      { status: 500 }
    );
  }
}

