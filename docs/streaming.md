> ENG
# Live Price Streaming

This project uses **Server-Sent Events (SSE)** to push price updates without requiring a page reload.

## Flow summary

1. The `GET /api/live-prices` endpoint opens an SSE stream and emits JSON payloads.
2. Every 60 seconds the server refreshes data from CoinGecko (`pushUpdate`) and sends the new prices plus a timestamp.
3. An `EventSource` instance in `DashboardView` listens for updates:
   - `event.data` holds the serialized JSON `{ coins, updatedAt }`.
   - After `JSON.parse(event.data)` the React state is replaced and UI metrics refresh instantly.
4. If something fails the server pushes `{ error, message }` so the client can render the error banner and retry button.
5. A keep-alive comment (":keep-alive") is sent every 15 seconds to avoid idle timeouts.

## Cache choices

- The SSE endpoint calls `fetchCoinMarketOverview({ cache: "no-store" })` to always hit the live API.
- The SSR homepage uses the same helper with `revalidate: 60` to balance freshness and performance.

## Quick references

- SSE endpoint: `src/app/api/live-prices/route.ts`
- Stream helpers: `src/lib/live-stream.ts`
- Client listener: `src/components/dashboard/DashboardView.tsx`
- CoinGecko helpers: `src/lib/coingecko.ts`

 
