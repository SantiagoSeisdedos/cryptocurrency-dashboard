## Crypto Dashboard

Aplicación construida con Next.js 16 (App Router) que muestra precios en tiempo casi real de un set curado de criptomonedas utilizando la API pública de CoinGecko.

![Crypto Dashboard](./public/window.svg)

### Características

- Renderizado del lado del servidor con revalidación cada 60 s.
- Vista principal con tarjetas animadas, ranking de desempeño y acceso directo al detalle.
- Ruta dinámica `/coins/[id]` con precio actual, cambio porcentual y rangos alto/bajo de las últimas 24 h.
- Estados de error y carga uniformados, diseño responsive optimizado para mobile y desktop.

### Requisitos previos

- Node.js 20+
- npm 10+ (el proyecto incluye `package-lock.json`)

### Instalación y ejecución

```bash
npm install
npm run dev
```

Visita `http://localhost:3000` para ver el panel en modo desarrollo. Puedes generar la build de producción con:

```bash
npm run build
npm start
```

### Decisiones de diseño

- **CoinGecko API**: se usa el endpoint `simple/price` para el listado y `coins/{id}` para el detalle. Ambos se revalidan cada 60 s balanceando frescura y cuota de peticiones.
- **Gestión de datos**: las monedas soportadas y sus metadatos (nombre, símbolo, gradientes, imagen) se centralizan en `src/lib/coins.ts` para evitar duplicación.
- **UI/UX**: Tailwind CSS 4 aporta utilidades atómicas; se añaden degradados, tarjetas con glassmorphism y feedback visual consistente en carga/errores.
- **Mini gráficos**: las tarjetas muestran sparklines generadas con datos de `market_chart` (7 días, intervalo diario) preprocesados en el servidor y enriquecidos en streaming SSE.
- **Resiliencia ante límites**: cada petición captura el estado 429 de CoinGecko, informa al usuario del límite alcanzado y permite reintentar una vez que vuelva a estar disponible.

### Manejo de límites de la API de CoinGecko

La aplicación usa la cuota pública de CoinGecko, que puede responder con `429 Too Many Requests` cuando se excede el límite. En ese caso verás un mensaje explícito:

> *"Se alcanzó el límite de la API pública de CoinGecko. Intenta nuevamente en un momento o configura tu propia API key (ver README)."*

Si dispones de una cuenta Pro/Premium puedes añadir tu propia clave sin tocar el código:

1. Crea un archivo `.env.local` en la raíz del proyecto (o reutiliza el existente).
2. Define la variable:

   ```bash
   COINGECKO_API_KEY=tu_api_key_de_coingecko
   ```

3. Reinicia el servidor (`npm run dev`) o la build (`npm run build`) para que Next.js cargue la variable.

Cuando la clave está presente, cada petición incluye el header `x-cg-pro-api-key`, lo que eleva considerablemente el límite y elimina los mensajes de cuota para tu cuenta.
- **Accesibilidad**: contrastes AA, texto descriptivo y navegación basada en enlaces semánticos.

### Scripts útiles

- `npm run lint`: ejecuta ESLint según la configuración de Next.js.

### Próximos pasos sugeridos

- Profundiza en el streaming SSE en `docs/streaming.md`.
- Añadir gráficos históricos usando la API de market charts.
- Implementar tests de componentes con Vitest/Testing Library.
- Permitir seleccionar la moneda fíat para visualizar precios en distintas divisas.
