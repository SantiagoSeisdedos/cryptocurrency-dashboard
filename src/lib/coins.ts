export type SupportedCoinId =
  | "bitcoin"
  | "ethereum"
  | "dogecoin"
  | "cardano"
  | "solana";

export interface CoinMeta {
  id: SupportedCoinId;
  name: string;
  symbol: string;
  accent: string;
  gradient: string;
  image: string;
}

export const SUPPORTED_COINS: CoinMeta[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    accent: "text-amber-400",
    gradient: "from-amber-500/90 via-orange-500/80 to-amber-600/90",
    image:
      "https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1547033579",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    accent: "text-sky-300",
    gradient: "from-slate-500/90 via-sky-500/80 to-indigo-600/90",
    image:
      "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    accent: "text-yellow-300",
    gradient: "from-yellow-400/90 via-amber-400/80 to-yellow-500/90",
    image:
      "https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1547792256",
  },
  {
    id: "cardano",
    name: "Cardano",
    symbol: "ADA",
    accent: "text-sky-200",
    gradient: "from-sky-500/90 via-blue-500/80 to-indigo-600/90",
    image:
      "https://assets.coingecko.com/coins/images/975/large/cardano.png?1696502090",
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    accent: "text-emerald-300",
    gradient: "from-emerald-500/90 via-teal-500/80 to-purple-600/90",
    image:
      "https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756",
  },
];

export const COIN_ID_SET = new Set(SUPPORTED_COINS.map((coin) => coin.id));

export const getCoinMeta = (id: string): CoinMeta | undefined =>
  SUPPORTED_COINS.find((coin) => coin.id === id);

