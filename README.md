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
- **Accesibilidad**: contrastes AA, texto descriptivo y navegación basada en enlaces semánticos.

### Scripts útiles

- `npm run lint`: ejecuta ESLint según la configuración de Next.js.

### Próximos pasos sugeridos

- Añadir gráficos históricos usando la API de market charts.
- Implementar tests de componentes con Vitest/Testing Library.
- Permitir seleccionar la moneda fíat para visualizar precios en distintas divisas.
