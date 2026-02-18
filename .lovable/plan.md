
## Mejora del Calendario en Versión Móvil

### Problemas actuales identificados

1. **Header desordenado en móvil**: El header actual muestra logo completo + título + botones "New Job" y "Sign Out" en fila, lo que se comprime mucho en pantallas pequeñas.
2. **FullCalendar sin adaptación móvil**: La barra de herramientas con `prev,next today` | `title` | `dayGridMonth,timeGridWeek,timeGridDay` se apila y queda ilegible.
3. **Vista por defecto**: Arranca en `dayGridMonth`, que en móvil tiene celdas muy pequeñas y los eventos son casi ilegibles.
4. **Sin distinción responsive**: No se adapta el `initialView` ni el `headerToolbar` según el tamaño de pantalla.
5. **Leyenda de colores**: La leyenda horizontal ocupa espacio pero no se adapta a móvil.
6. **Botones del toolbar de FullCalendar**: Los estilos actuales no aprovechan bien el diseño teal/amber del sistema.

---

### Cambios a implementar en `src/pages/CalendarPage.tsx`

**1. Header móvil compacto**
- En móvil (`md:hidden`): mostrar solo icono de regreso + título "Calendar" + botón "+" compacto.
- En desktop (`hidden md:flex`): mantener el header actual completo.

**2. Vista inicial adaptativa**
- Usar `useIsMobile()` hook (ya existe en `src/hooks/use-mobile.tsx`).
- En móvil → `initialView="listWeek"` (lista semanal, mucho más legible en pantallas pequeñas).
- En desktop → `initialView="dayGridMonth"`.

**3. Toolbar de FullCalendar adaptativo**
- En móvil: `{ left: "prev,next", center: "title", right: "listWeek,timeGridDay" }` — solo 2 vistas útiles en móvil.
- En desktop: mantener las 3 vistas actuales.

**4. Estilos mejorados del calendario**
- Añadir CSS específico para `.fc-list-*` elements para que la vista de lista respete el tema teal.
- Mejorar padding y tamaño de fuente en móvil.
- Botones del toolbar con bordes redondeados y colores de marca.
- Hacer que los eventos en lista tengan buen espaciado táctil (mínimo 44px de altura).

**5. Leyenda responsive**
- En móvil: leyenda compacta en 2 columnas o inline.
- En desktop: mantener la fila actual.

**6. Botón flotante "New Job" en móvil**
- Reemplazar el botón del header por un FAB (Floating Action Button) redondo en la esquina inferior derecha, sobre el bottom nav, para acceso táctil fácil.

---

### Technical Details

**Archivo modificado**: `src/pages/CalendarPage.tsx`

```
Imports nuevos:
- useIsMobile from "@/hooks/use-mobile"

Cambios en FullCalendar:
- initialView={isMobile ? "listWeek" : "dayGridMonth"}
- headerToolbar={isMobile ? 
    { left: "prev,next", center: "title", right: "today" } :
    { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
  }
- Agregar plugin listPlugin de @fullcalendar/list (ya instalado como parte de @fullcalendar/core)

CSS wrapper expandido:
- [&_.fc-list-event]:min-h-[44px]
- [&_.fc-list-day-cushion]:bg-primary/10
- [&_.fc-list-event-title]:text-sm
- [&_.fc-list-event-dot]:hidden
- Botones del toolbar más redondeados
```

**Nota**: `@fullcalendar/list` no está explícitamente en `package.json` pero viene incluido con `@fullcalendar/core` ^6.x. Se importará `listPlugin` desde `@fullcalendar/core/locales` — en realidad se importa de `@fullcalendar/list` que ya está disponible como dependencia transitiva.

El resultado final tendrá:
- Móvil: vista de lista semanal limpia, con cada job en una fila tappable con colores de estado, FAB para crear, header ultra-compacto.
- Desktop: sin cambios en comportamiento, solo mejoras de estilo en el tema.
