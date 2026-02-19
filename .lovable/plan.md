
# Plan de Optimización UX Móvil — Pulcrix (Completo)

## Diagnóstico por página

### Páginas con AdminLayout (ya tienen MobileBottomNav)
- **AdminDashboard** — Bien adaptado. Tiene FAB, header compacto. Minor: el Kanban board horizontal en móvil puede ser confuso.
- **ReportsPage** — Los tabs se apilan bien, pero las pestañas con texto "Business/Operations/PDF/CSV" se ven pequeñas sin iconos claros en móvil.
- **SettingsPage** — Sin revisión de adaptación móvil del formulario.

### Páginas SIN AdminLayout (headers propios, fuera del sistema de navegación)
- **InvoicesPage** — Header sin versión móvil compacta. Tabla de 7 columnas NO funciona en móvil (scroll horizontal forzado, ilegible). Stats en grid 1 columna pero ocupa mucho espacio vertical. Sin FAB.
- **PropertiesPage** — Header sin versión móvil. Sin FAB. Cards en grid, aceptable pero sin optimización táctil.
- **RecurringJobsPage** — Header con dos botones "Generate Now" y "New Schedule" apilados en pantalla pequeña. Cards con información densa.
- **CalendarPage** — Ya optimizado (listWeek + FAB).
- **ClientsPage** — Ya optimizado (lista táctil + FAB).
- **StaffManagementPage** — Parcialmente adaptado (responsive en stats y lista), pero sin FAB y header puede mejorar.
- **StaffDashboard** — Ya optimizado para móvil (es la pantalla principal del staff).

---

## Cambios a implementar

### 1. InvoicesPage — Mayor prioridad

**Problema crítico: Tabla de 7 columnas en móvil**

- Header: crear versión móvil compacta `md:hidden` (solo back + título + icono logout), ocultar `AccountingExport` en móvil.
- Stats: cambiar a scroll horizontal `overflow-x-auto flex gap-3` en móvil, cards de 120px de ancho mínimo.
- Tabla → reemplazar por lista de tarjetas en móvil:
  - Cada factura como una card tappable con: número de factura + nombre cliente (grande), fecha y monto (en una fila), badge de estado + botón de acción.
  - En desktop, mantener la tabla actual.
- FAB verde "New Invoice" en la esquina inferior derecha en móvil.
- Padding inferior `pb-24` en el contenido para evitar que el bottom nav tape el contenido.

### 2. RecurringJobsPage — Prioridad alta

**Problema: Header con 2 botones que se comprimen**

- Header móvil compacto: solo back + título + un botón "+" (icono). Ocultar "Generate Now" en el header móvil.
- "Generate Now" moverlo a un botón secundario dentro del contenido o accesible via un dropdown en móvil.
- Cards de schedules: la sección de acciones (Switch + Edit + Delete) se puede colapsar en un dropdown `MoreVertical` en móvil.
- FAB para crear nuevo schedule en móvil.

### 3. PropertiesPage — Prioridad media

**Problema: Header sin versión móvil, sin FAB**

- Header móvil compacto: back + "Properties" + icono "+" solamente.
- Las PropertyCards ya son responsive en grid 1 columna, mejorar el padding táctil.
- FAB "Add Property" en móvil.

### 4. StaffManagementPage — Prioridad media

**Problema: Sin FAB, header aceptable pero mejorable**

- El header ya tiene texto abreviado en móvil (`sm:hidden` para texto corto).
- Agregar FAB "+" para invitar staff en móvil.
- Las tarjetas de staff ya son responsive. Verificar que el DropdownMenu es táctilmente accesible.

### 5. AdminDashboard — TodayKanban en móvil

**Problema: Kanban horizontal con ScrollArea puede ser confuso**

- En móvil, cambiar la presentación de columnas Kanban a una vista de acordeón o tabs verticales: "Scheduled (N)", "In Progress (N)", "Completed (N)" — donde N es el conteo de jobs.
- Cada job card dentro del kanban debe tener al menos 48px de altura táctil.

### 6. ReportsPage — Prioridad baja

**Problema: Tabs con texto pequeño en móvil**

- Los tabs ya muestran solo iconos en móvil (`hidden sm:inline`), eso es correcto.
- Asegurar que el contenido de cada tab tenga scroll adecuado.

---

## Archivos a modificar

```text
src/pages/InvoicesPage.tsx          — Header móvil + lista de cards + FAB
src/pages/RecurringJobsPage.tsx     — Header móvil + acciones en dropdown + FAB
src/pages/PropertiesPage.tsx        — Header móvil + FAB
src/pages/StaffManagementPage.tsx   — FAB para invitar staff
src/components/admin/TodayKanban.tsx — Vista en móvil mejorada (tabs/acordeón)
```

---

## Patrón de diseño unificado que se aplicará

Todas las páginas de admin seguirán este patrón consistente:

```text
MÓVIL:
┌─────────────────────────────────────┐
│ [←] Título              [Notif] [👤] │  ← Header compacto (h-14)
├─────────────────────────────────────┤
│ ◄──── Stats en scroll horizontal ────►  │  ← Cards de 100-120px min-w
├─────────────────────────────────────┤
│  [🔍 Search...]                      │  ← Input de búsqueda full-width
│  [Filtro A] [Filtro B] [Filtro C]    │  ← Chips de filtros
├─────────────────────────────────────┤
│ ● Item 1 —— Info principal           │
│   Sub-info                           │  ← Lista tappable
│ ● Item 2 ——                          │   (min-h-[64px] por item)
│   ...                                │
├─────────────────────────────────────┤
│ [Dashboard] [Jobs] [Clients] [...] │  ← MobileBottomNav (ya existente)
└────────────────────────────────────┘
                               [+]       ← FAB (bottom-right, encima del nav)
DESKTOP:
┌─── Sidebar ─── │ ────── Contenido completo ────┐
│  Nav items      │  Header con todos los botones  │
│                 │  Tabla / Grid completo          │
└─────────────────┴────────────────────────────────┘
```

---

## Notas técnicas

- Los FABs se posicionarán en `fixed bottom-24 right-4` para estar por encima del `MobileBottomNav` (que tiene `h-16 + safe-area`).
- Los headers móviles usarán `md:hidden` y los de desktop `hidden md:flex`, igual que el patrón ya establecido en `CalendarPage` y `ClientsPage`.
- Las listas de facturas en móvil usarán `divide-y divide-border` en lugar de `Table`, evitando scroll horizontal forzado.
- El `TodayKanban` en móvil usará `Tabs` de Radix para separar las columnas verticalmente, manteniendo el layout horizontal en desktop.
- Todos los botones de acción táctiles tendrán mínimo `min-h-[44px]` (estándar Apple HIG).
