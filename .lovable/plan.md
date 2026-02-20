
# Plan: Fix Build Errors + Landing Page Mejorada

## Parte 1 — Fix urgente de build (bloquea producción)

### Problema
`src/components/SubscriptionGate.tsx` y `src/components/TrialBanner.tsx` hacen una query que pide la columna `trial_end` de la tabla `subscriptions`, pero esa columna **no existe** en la base de datos real. Las columnas disponibles son:

- `id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`

### Corrección
Quitar `trial_end` del `.select(...)` y reemplazar toda referencia a `data.trial_end` por `data.current_period_end` en ambos archivos. La lógica de "días restantes de trial" sigue igual pero usando solo `current_period_end`.

---

## Parte 2 — Landing page mejorada

### Lo que existe actualmente
- Página básica con hero estático, sección de features en grid 2×2, sección de roles, badges de confianza y footer simple
- Sin animaciones, sin scroll-reveal, sin mockup de dashboard, sin tabs de features
- Nav ya tiene `backdrop-blur-md` pero no se activa al hacer scroll

### Lo que vamos a añadir

#### Animaciones & efectos
- **Blobs animados en hero** — 2-3 divs redondeados con `animate-[float_8s_ease-in-out_infinite]` en distintos delays, usando colores del brand teal/amber con opacity baja. Sin librerías externas, solo CSS + Tailwind.
- **Floating notification cards** — 2 mini-cards que flotan en el lado derecho del hero en desktop, simulando notificaciones de jobs completados ("Job #234 completed ✓", "Invoice sent $480"). Animadas con keyframe personalizado.
- **Scroll-reveal con IntersectionObserver** — Hook `useScrollReveal` que añade clase `opacity-100 translate-y-0` cuando el elemento entra al viewport. Aplicado a secciones de features, stats y roles.
- **Contadores animados en stats** — Sección nueva de stats (12k+ jobs, 98% satisfaction, etc.) con contadores que se animan del 0 al valor final cuando entran al viewport.
- **Marquee infinito** — Banda de features/integraciones que se desliza horizontalmente de forma continua con `@keyframes marquee`.

#### Jerarquía visual
- **Tipografía Syne para headings** — Importar desde Google Fonts en `index.html` y aplicar `font-display` a los h1/h2 principales de la landing. El resto del sistema sigue en Inter.
- **Grid overlay texture en hero** — SVG pattern de puntitos/cuadrícula superpuesto con opacity muy baja (2-4%) sobre el hero, da sensación de profundidad sin distracción.
- **Radial gradients para profundidad** — Reemplazar el gradiente lineal actual del hero por uno radial con glow en el centro, más dramático visualmente.
- **Dashboard mockup** — Componente `DashboardMockup` con datos ficticios de jobs (cards con status badges, nombres de clientes, progress bar) estilizado como captura de la app real. Aparece al lado del copy en desktop, debajo en mobile.

#### Conversión
- **Feature tabs (4 categorías)** — Reemplazar el grid estático de features por un sistema de tabs: "Jobs", "Staff", "Invoices", "Reports". Cada tab muestra icono grande + descripción + bullet points + mini-screenshot o mockup.
- **Pain → Solution narrative** — Sección nueva: columna izquierda con 3 pain points tachados ("Chasing staff via WhatsApp", "Losing track of invoices", "No proof of work done"), columna derecha con la solución de Pulcrix.
- **Dual CTA** — CTA adicional al final de cada sección mayor (no solo en el hero).
- **Social proof** — Sección de stats animados + 3 testimonios de ejemplo con avatar, nombre y empresa.
- **Pricing featured card con escala** — En lugar de redirigir a `/pricing`, añadir una mini-sección de pricing con 3 cards donde el plan "Professional" está ligeramente escalado (`scale-105`) y tiene badge "Most Popular".

#### UX Patterns
- **Sticky nav con blur en scroll** — `useScrollY` hook que detecta si `window.scrollY > 10` y añade clases de sombra/border al header. Ya tiene `backdrop-blur-md` pero sin la lógica de scroll.
- **Hover lift en cards** — Ya existe `.card-hover` en CSS, aplicarlo a las feature cards y role cards.
- **Language toggle EN/ES en footer** — Reutilizar el componente `LanguageSwitcher` existente en el footer, con traducciones básicas de los textos del landing (hero title, subtitle, CTAs, section titles).
- **Nav transparente → blur al hacer scroll** — El header inicia sin border/background y adquiere fondo blur al hacer scroll Y > 20px.

---

## Archivos a modificar

```text
index.html                          — Importar fuente Syne desde Google Fonts
src/index.css                       — Añadir @keyframes marquee, blob-float, counter-up
src/components/SubscriptionGate.tsx — Fix: quitar trial_end del select
src/components/TrialBanner.tsx      — Fix: quitar trial_end del select
src/pages/Index.tsx                 — Reescritura completa del landing con todas las mejoras
```

No se necesitan nuevas dependencias. Todo con React + CSS + Tailwind + IntersectionObserver nativo.

---

## Notas técnicas

- Las traducciones EN/ES del landing se implementarán con un objeto de strings local en `Index.tsx` que lee el idioma del `useLanguage()` hook ya existente.
- El mockup del dashboard es puramente visual (datos hardcodeados), no toca la base de datos.
- Las animaciones de blobs usan `will-change: transform` para GPU acceleration.
- El `IntersectionObserver` usa `threshold: 0.15` y `rootMargin: "0px 0px -50px 0px"` para que el reveal ocurra ligeramente antes de que el elemento sea 100% visible.
- Los contadores animados usan `requestAnimationFrame` con easing cuadrático, sin dependencias.
