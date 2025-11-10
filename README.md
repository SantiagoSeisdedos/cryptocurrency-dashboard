## Crypto Dashboard

A Next.js 16 (App Router) application that surfaces near real-time cryptocurrency prices using the public CoinGecko API.

## Crypto Dashboard: Video Demo [Part 1](https://www.loom.com/share/4c5016d94c0649e9bd64c88ef46be75c) & [Part 2](https://www.loom.com/share/9ec148ecc2ca4ed3bb68a9b1355adbad)

<img width="2546" height="1385" alt="Screenshot 2025-11-10 014748" src="https://github.com/user-attachments/assets/5359d9c3-618e-4cbb-a8c2-12fa0230dcde" />
<img width="2560" height="1440" alt="Screenshot 2025-11-10 014759" src="https://github.com/user-attachments/assets/695ab3af-cf22-4106-8d8b-b544d7f0e685" />
<img width="2550" height="1387" alt="Screenshot 2025-11-10 015122" src="https://github.com/user-attachments/assets/ff9f62f9-b19b-422e-8d74-d46db66c1e75" />

### Features

- Server-rendered dashboard revalidated every 60 seconds.
- Watchlist with animated cards, top movers, filters, and quick access to detailed views.
- Dynamic route `/coins/[id]` exposing current price, 24h change, and high/low ranges.
- SSE (Server-Sent Events) stream for live updates plus local caching to smooth out API rate-limit spikes.
- Responsive layout, Tailwind utility styling, and consistent empty/error states.

### Getting started

Prerequisites:

- Node.js 20+
- npm 10+ (a `package-lock.json` is included)

Install dependencies and launch the dev server:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to explore the dashboard. Production build:

```bash
npm run build
npm start
```

### Useful scripts

- `npm run lint` – run ESLint.
- `npm run analyze` – generate bundle stats (`ANALYZE=true next build --webpack`). Open `.next/analyze/client.html` in your browser to inspect the treemap.

### Performance notes

- Images are served through `next/image`, with only the above-the-fold logos flagged as `priority`. All other thumbnails are lazily loaded.
- The dashboard seeds and hydrates a local cache (`localStorage`) so returning users see the last known prices and sparklines immediately, even if CoinGecko briefly rate-limits fresh requests.
- Streaming updates append rather than recreate history arrays to keep React renders shallow.

### Assumptions & design decisions

- **Single fiat currency (USD)** – CoinGecko requests and sparklines are denominated in USD to keep the interface consistent. Extending to more currencies would require tweaking the API params and UI copy.
- **Server-Sent Events cadence (60s)** – matching CoinGecko rate limits while preserving timely updates. The server also emits keep-alives and persists the last timestamp to avoid hydration mismatches.
- **Local caching** – watchlist entries and historical data are stored in `localStorage`. TTLs ensure we reuse recent data during API hiccups but still re-fetch after a grace period.
- **Default watchlist** – five curated assets ship with the app so first-time users see data immediately; custom tokens added via search persist between sessions.
- **Framer Motion for micro-interactions** – lightweight animations improve clarity when cards update. Imported APIs stay scoped to client components to limit bundle size.
- **Error messaging** – all fetchers bubble meaningful messages (rate limit, missing asset, etc.) to surface useful context in the UI without leaking implementation details.

### CoinGecko rate limits

The app uses the public tier of CoinGecko, which returns `429 Too Many Requests` when the quota is exhausted. In that case the UI displays:

> *"The public CoinGecko API limit was reached. Try again shortly or configure your own API key (see README)."*

If you have a Pro/Premium account you can add your key without code changes:

1. Create `.env.local` in the project root (or reuse an existing one).
2. Define the variable:

   ```bash
   COINGECKO_API_KEY=your_coin_gecko_key
   ```

3. Restart `npm run dev` (or rerun `npm run build`) so Next.js picks up the variable.

All requests automatically include the `x-cg-pro-api-key` header when the variable is defined.

### Design decisions

- **Data helpers** – supported coins and metadata (name, symbol, gradients, image) live in `src/lib/coins.ts` to avoid duplication.
- **Mini charts** – sparklines use 7-day daily data pre-fetched on the server; the SSE stream gradually appends real-time points.
- **Rate-limit awareness** – every request traps `429` responses, surfaces a friendly error, and allows users to retry once the quota resets.

### 📝 Project Notes

This project was built as part of a frontend technical challenge for **Blockchain.com** (Explorer team).
The main goal was to create a cryptocurrency dashboard using Next.js that fetches real-time market data from the CoinGecko API for at least five tokens.

### ✅ Requirements Completed

- Built with **Next.js** and **TypeScript**.
- Fetched **real-time token data** (price, market cap, volume, and change percentage) using the **CoinGecko public API**.
- Displayed live market information in a responsive and user-friendly dashboard.

### 🚀 Additional Features Implemented

- **Search bar with autocomplete**: allows users to quickly find tokens by name or symbol.
- **Sorting and filtering options**: users can sort tokens by price, market cap, or 24h change.
- **Token detail view**: each token includes a static price chart and extended information.
- **Automatic refetching system**: implemented to update data periodically and maintain accuracy.
- **Local storage caching**: reduces unnecessary API calls by storing previously fetched data locally.
- **Support for more tokens** than initially required, increasing the dashboard’s usefulness.

### ⚠️ API Limitations and Considerations

By including more tokens than required, the app approached the **rate limits** of the free CoinGecko API.
To handle this, I implemented local caching and periodic refetch intervals to avoid exceeding API limits.

**In a real-world scenario, I would consider:**
- Using **multiple data providers** (e.g., Covalent, Alchemy, Moralis, Li.Fi, or Jupiter) to diversify data sources and avoid dependency on a single API.
- Adding an API key or using a backend proxy to manage and balance requests.
- Implementing a **rate-limit queue** to throttle requests dynamically when approaching API limits.

**💡 Future Improvements**

- Replace static charts with **real-time dynamic charts** using libraries like Recharts or Chart.js.
- Add **user preferences** (e.g., favorite tokens, preferred fiat currency).
- Integrate **WebSocket-based price streaming** for instant updates.

### Further reading

- Streaming implementation notes: `docs/streaming.md`
- Consider adding component tests (Vitest/Testing Library) or fiat currency selection as follow-up improvements.
