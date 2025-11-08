# Streaming de precios en vivo

Este proyecto utiliza **Server-Sent Events (SSE)** para actualizar los precios sin necesidad de recargar la página.

## Resumen del flujo

1. El endpoint `GET /api/live-prices` abre un stream SSE y envía datos en formato JSON.
2. Cada 60 segundos, el servidor vuelve a consultar CoinGecko (`pushUpdate`) y envía los precios actualizados junto con la hora del update.
3. Un `EventSource` en el cliente (`DashboardView`) escucha esos mensajes:
   - `event.data` contiene el JSON serializado con `{ coins, updatedAt }`.
   - Se hace `JSON.parse(event.data)` y se reemplaza el estado en React, mostrando los precios al instante.
4. Si ocurre un error, el servidor emite `{ error, message }` y el cliente muestra el estado “Error” con un botón para reintentar.
5. Se envía un “keep-alive” cada 15 segundos para evitar que proxies o navegadores cierren la conexión.

## Opciones de caché

- El stream llama a `fetchCoinMarketOverview({ cache: "no-store" })`, forzando peticiones frescas cada vez.
- La página SSR usa la misma función pero con `revalidate` (60s) para balancear rendimiento con datos relativamente frescos.

## Referencias rápidas

- Endpoint SSE: `src/app/api/live-prices/route.ts`
- Helpers del stream: `src/lib/live-stream.ts`
- Cliente (EventSource): `src/components/dashboard/DashboardView.tsx`
- Helper CoinGecko: `src/lib/coingecko.ts`

