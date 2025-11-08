> ENG
 # Live Price Streaming

 This project uses **Server-Sent Events (SSE)** to update prices without needing to reload the page.

 ## Flow Summary

 1. The `GET /api/live-prices` endpoint opens an SSE stream and sends data in JSON format.
 2. Every 60 seconds, the server re-queries CoinGecko (`pushUpdate`) and sends the updated prices along  with the update time.
 3. An `EventSource` on the client (`DashboardView`) listens for those messages:
    - `event.data` contains the serialized JSON with `{ coins, updatedAt }`.
    - `JSON.parse(event.data)` is performed and the state in React is replaced, showing the prices  instantly.
 4. If an error occurs, the server emits `{ error, message }` and the client shows the “Error” state  with a button to retry.
 5. A “keep-alive” is sent every 15 seconds to prevent proxies or browsers from closing the connection.

 ## Cache Options

 - The stream calls `fetchCoinMarketOverview({ cache: "no-store" })`, forcing fresh requests each time.
 - The SSR page uses the same function but with `revalidate` (60s) to balance performance with  relatively fresh data.

 ## Quick References

 - SSE Endpoint: `src/app/api/live-prices/route.ts`
 - Stream Helpers: `src/lib/live-stream.ts`
 - Client (EventSource): `src/components/dashboard/DashboardView.tsx`
 - CoinGecko Helper: `src/lib/coingecko.ts`

<br>

> ESP
 # Streaming de precios en vivo

 Este proyecto utiliza **Server-Sent Events (SSE)** para actualizar los precios sin necesidad de recargar la página.

 ## Resumen del flujo

 1.  El endpoint `GET /api/live-prices` abre un stream SSE y envía datos en formato JSON.
 2.  Cada 60 segundos, el servidor vuelve a consultar CoinGecko (`pushUpdate`) y envía los precios actualizados junto con la hora del update.
 3.  Un `EventSource` en el cliente (`DashboardView`) escucha esos mensajes:

 - `event.data` contiene el JSON serializado con `{ coins, updatedAt }`.
 - Se hace `JSON.parse(event.data)` y se reemplaza el estado en React, mostrando los precios al instante.

 4.  Si ocurre un error, el servidor emite `{ error, message }` y el cliente muestra el estado “Error” con un botón para reintentar.
 5.  Se envía un “keep-alive” cada 15 segundos para evitar que proxies o navegadores cierren la conexión.

 ## Opciones de caché

 - El stream llama a `fetchCoinMarketOverview({ cache: "no-store" })`, forzando peticiones frescas cada vez.
 - La página SSR usa la misma función pero con `revalidate` (60s) para balancear rendimiento con datos relativamente frescos.

 ## Referencias rápidas

 - Endpoint SSE: `src/app/api/live-prices/route.ts`
 - Helpers del stream: `src/lib/live-stream.ts`
 - Cliente (EventSource): `src/components/dashboard/DashboardView.tsx`
 - Helper CoinGecko: `src/lib/coingecko.ts`

 
