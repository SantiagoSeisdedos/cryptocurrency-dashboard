import { NextRequest, NextResponse } from "next/server";

const COINGECKO_API = "https://api.coingecko.com/api/v3/search";

interface CoinSearchItem {
  id?: string;
  name?: string;
  symbol?: string;
  thumb?: string;
  large?: string;
  market_cap_rank?: number | null;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ coins: [] });
  }

  const params = new URLSearchParams({ query });

  try {
    const response = await fetch(`${COINGECKO_API}?${params.toString()}`, {
      next: { revalidate: 60 },
    });

    if (response.status === 429) {
      return NextResponse.json(
        {
          error: true,
          message:
            "The public CoinGecko API limit was reached while searching. Try again later or provide your own API key.",
        },
        { status: 429 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: true,
          message: "Unable to search for coins right now.",
        },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const coins = Array.isArray(payload?.coins)
      ? (payload.coins as CoinSearchItem[])
      : [];

    const normalised = coins.slice(0, 10).map((coin) => ({
      id: coin.id ?? "",
      name: coin.name ?? "",
      symbol: coin.symbol?.toUpperCase() ?? "",
      image: coin.thumb ?? coin.large ?? null,
      marketCapRank: coin.market_cap_rank ?? null,
    }));

    return NextResponse.json({ coins: normalised });
  } catch {
    return NextResponse.json(
      {
        error: true,
        message: "Unexpected error while searching for coins.",
      },
      { status: 500 }
    );
  }
}
