
# Plan: Flujo Completo del Staff Panel para Gestión de Trabajos

## Resumen Ejecutivo

Implementar un flujo de trabajo paso a paso para que los trabajadores de limpieza gestionen sus trabajos de manera guiada, desde la llegada hasta la finalización, con captura de fotos, checklist y reporte final.

## Arquitectura Propuesta

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUJO DEL STAFF                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Dashboard ──► /job/:id/start ──► /job/:id/photos-before ──►      │
│                      │                     │                        │
│               Confirmar llegada      Fotos del ANTES                │
│               Capturar GPS           (mín. 3 fotos)                 │
│                      │                     │                        │
│                      ▼                     ▼                        │
│              /job/:id/checklist ──► /job/:id/photos-after ──►      │
│                      │                     │                        │
│               Tareas por área        Fotos del DESPUÉS              │
│               (80% para avanzar)     (comparación lado a lado)      │
│                      │                     │                        │
│                      ▼                     ▼                        │
│                              /job/:id/complete                      │
│                                    │                                │
│                             Resumen final                           │
│                             Notas y problemas                       │
│                             Enviar reporte                          │
│                                    │                                │
│                                    ▼                                │
│                              Dashboard ✓                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Alcance de Primera Iteración (Según instrucciones del usuario)

Como el usuario solicitó NO implementar todo de una vez, comenzaremos con:

1. Página `/staff/job/:id/start` - Confirmación de llegada
2. Componente `JobTimer` - Timer de tiempo transcurrido
3. Modificaciones a la base de datos necesarias

## Fase 1: Modificaciones a la Base de Datos

### Campos Faltantes en tabla `jobs`

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `staff_notes` | `text` | Notas del staff al completar |
| `issue_reported` | `text` | Tipo de problema reportado |
| `actual_duration_minutes` | `integer` | Duración real calculada |

### Campos Faltantes en tabla `job_photos`

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `area` | `text` | Área fotografiada (Sala, Cocina, etc.) |
| `taken_at` | `timestamptz` | Momento exacto de la foto |

**Nota**: La tabla `checklist_items` ya tiene todos los campos necesarios.

### Migración SQL

```sql
-- Agregar campos faltantes a jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS staff_notes text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS issue_reported text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;

-- Agregar campos faltantes a job_photos
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS taken_at timestamptz DEFAULT now();

-- Crear índice para búsqueda por área
CREATE INDEX IF NOT EXISTS idx_job_photos_area ON public.job_photos(job_id, area);
```

## Fase 2: Componente JobTimer

### Archivo: `src/components/staff/JobTimer.tsx`

**Características:**
- Recibe `startedAt: Date` como prop
- Actualiza cada segundo mostrando HH:MM:SS
- Cambia de color según tiempo estimado:
  - Verde: Dentro del tiempo estimado
  - Amarillo: Pasado el tiempo estimado
- Versión compacta para headers

**Props:**
```typescript
interface JobTimerProps {
  startedAt: Date;
  estimatedHours?: number;
  compact?: boolean;
}
```

## Fase 3: Página de Inicio de Trabajo

### Archivo: `src/pages/staff/JobStartPage.tsx`

**Características:**
- Recibe `jobId` desde la URL (`/staff/job/:id/start`)
- Muestra resumen del trabajo:
  - Nombre del cliente
  - Dirección con botón de Maps
  - Hora programada
  - Notas del cliente y del servicio
  - Detalles de la propiedad (habitaciones, baños, mascotas)
  - Instrucciones especiales
- Botón grande "COMENZAR TRABAJO" que:
  1. Registra `start_time` = timestamp actual
  2. Solicita permiso de GPS y captura ubicación
  3. Guarda `checkin_lat/lng` en la base de datos
  4. Cambia status a 'in_progress'
  5. Redirige a `/staff/job/:id/photos-before`

**Estructura:**
```tsx
export default function JobStartPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Fetch job data
  // Handle GPS capture
  // Handle start job
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header con botón volver */}
      {/* Card de resumen */}
      {/* Card de ubicación con Maps */}
      {/* Card de propiedad (si existe) */}
      {/* Card de instrucciones especiales */}
      {/* Botón grande COMENZAR */}
    </div>
  );
}
```

## Fase 4: Nuevas Rutas en App.tsx

### Rutas a agregar:

```tsx
// Flujo de trabajo del staff
<Route 
  path="/staff/job/:id/start"
  element={
    <ProtectedRoute allowedRoles={["staff"]}>
      <JobStartPage />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/staff/job/:id/photos-before"
  element={
    <ProtectedRoute allowedRoles={["staff"]}>
      <JobPhotosBeforePage />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/staff/job/:id/checklist"
  element={
    <ProtectedRoute allowedRoles={["staff"]}>
      <JobChecklistPage />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/staff/job/:id/photos-after"
  element={
    <ProtectedRoute allowedRoles={["staff"]}>
      <JobPhotosAfterPage />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/staff/job/:id/complete"
  element={
    <ProtectedRoute allowedRoles={["staff"]}>
      <JobCompletePage />
    </ProtectedRoute>
  } 
/>
```

## Fase 5: Traducciones Nuevas

### Agregar a `src/lib/translations/staff.ts`:

```typescript
// Job Start Page
job_start_title: "Confirm Arrival",
ready_to_start: "Ready to start?",
confirm_location: "You're at the right location",
begin_work: "BEGIN WORK",
starting_job: "Starting job...",
client_notes: "Client Notes",
service_notes: "Service Notes",

// Timer
time_elapsed: "Time Elapsed",
on_track: "On Track",
over_time: "Over Time",

// Photos Before
photos_before_title: "Before Photos",
capture_before_state: "Capture the current state before cleaning",
minimum_photos: "Minimum 3 photos required",
photos_progress: "photos",
continue_to_checklist: "Continue to Checklist",
take_photo: "Take Photo",
retake: "Retake",

// Photos After  
photos_after_title: "After Photos",
capture_after_state: "Capture the result after cleaning",
compare_with_before: "Compare with before photo",
finish_job: "Finish Job",

// Completion
great_work: "Great Work!",
job_summary: "Job Summary",
total_time: "Total Time",
tasks_completed: "Tasks Completed",
photos_taken: "Photos Taken",
additional_notes: "Additional Notes (optional)",
report_issues: "Report Issues",
no_issues: "No Issues",
missing_supplies: "Missing Supplies",
property_damage: "Property Damage Found",
access_issues: "Access Issues",
other_issue: "Other",
confirm_and_send: "CONFIRM & SEND REPORT",
sending_report: "Sending report...",
```

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/pages/staff/JobStartPage.tsx` | Pantalla de inicio de trabajo |
| `src/components/staff/JobTimer.tsx` | Componente de timer |
| `src/hooks/useJobWorkflow.ts` | Hook para manejar el flujo de trabajo |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar nuevas rutas del flujo |
| `src/lib/translations/staff.ts` | Agregar traducciones EN/ES |
| `src/components/staff/NextJobCard.tsx` | Cambiar botón "Start" para navegar a `/staff/job/:id/start` |

## Consideraciones de UX

1. **Mobile-first**: Botones grandes (min 48px altura), táctiles
2. **Colores de marca**: Verde #0FA573 para acciones principales (como en el sistema existente usa `bg-success`)
3. **Feedback visual**: Animaciones sutiles al completar acciones
4. **i18n**: Todo el texto usa el sistema existente `useLanguage()`
5. **Offline-friendly**: Guardar estado local en caso de pérdida de conexión (futuro)

## Próximos Pasos (Fases Siguientes)

Una vez confirmado que la primera iteración funciona:

1. **Fase 2**: Página `/photos-before` con grid de áreas
2. **Fase 3**: Página `/checklist` con tareas agrupadas
3. **Fase 4**: Página `/photos-after` con comparación lado a lado
4. **Fase 5**: Página `/complete` con resumen y envío
5. **Fase 6**: Panel Admin - Vista de reporte completado

## Estimación de Complejidad

| Componente | Complejidad | Tiempo Estimado |
|------------|-------------|-----------------|
| Migración DB | Baja | 5 min |
| JobTimer | Baja | 15 min |
| JobStartPage | Media | 30 min |
| Rutas + Traducciones | Baja | 15 min |
| **Total Fase 1** | | **~1 hora** |
