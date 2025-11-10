import { NextRequest, NextResponse } from "next/server";
import { fetchCoinDetail, CoinGeckoRateLimitError } from "@/lib/coingecko";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: true, message: "A coin identifier is required." },
      { status: 400 }
    );
  }

  try {
    const detail = await fetchCoinDetail(id, { cache: "no-store" });
    if (!detail) {
      return NextResponse.json(
        { error: true, message: "The requested coin could not be found." },
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
    return NextResponse.json(
      {
        error: true,
        message: "Unable to retrieve coin details.",
      },
      { status: 500 }
    );
  }
}

