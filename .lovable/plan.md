
# Cambio de tipografía: Syne → Plus Jakarta Sans

## Qué vamos a cambiar

### Por qué Plus Jakarta Sans
Es moderna, geométrica, con personalidad propia pero muy legible. Sus pesos 700/800 tienen mucho impacto visual en headings grandes, y combina perfectamente con Inter para el cuerpo de texto. Es la elección más popular en productos SaaS en 2024-2026.

### Comparación
```text
Antes : Syne        — muy estilizada, angular, nicho display
Ahora : Plus Jakarta Sans — moderna, geométrica, SaaS-ready
Body  : Inter       — sin cambios, sigue igual
```

## Archivos a modificar (solo 2)

### 1. `index.html` — Línea 46
Reemplazar el `<link>` de Google Fonts:

```
Antes: family=Syne:wght@700;800
Ahora: family=Plus+Jakarta+Sans:wght@700;800
```

### 2. `tailwind.config.ts` — Línea 106-108
Agregar la familia `display` al objeto `fontFamily` para que la clase `font-display` usada en `Index.tsx` funcione:

```typescript
// Antes
fontFamily: {
  sans: ["Inter", "system-ui", "sans-serif"],
},

// Después
fontFamily: {
  sans: ["Inter", "system-ui", "sans-serif"],
  display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
},
```

## Dónde se aplica la nueva fuente

La clase `font-display` ya existe en `Index.tsx` en:
- `h1` del hero (línea 454) — título principal del landing
- `h3` de las feature tabs (línea 330) — subtítulos de las pestañas
- Todos los demás `font-display` del landing

No hay que tocar `Index.tsx` — solo cambiar qué fuente carga esa clase.

## Impacto visual
- Solo afecta la landing page (los headings dentro de la app siguen en Inter)
- Carga instantánea con `display=swap` de Google Fonts
- Sin cambios de layout ni de spacing
