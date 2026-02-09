
# Plan: Soporte de Idioma Español para Staff

## Valor de Negocio
Este feature permite que los trabajadores hispanohablantes cambien toda la interfaz de staff a español con **un solo clic**, removiendo barreras de idioma y mejorando la experiencia del personal latino en Australia.

## Decisiones de Diseño

### Por qué NO usar react-i18next u otra librería:
1. **Simplicidad**: El proyecto eliminó previamente i18n para evitar complejidad innecesaria
2. **Foco específico**: Solo necesitamos traducir la interfaz de STAFF (no admin)
3. **Rendimiento**: Una solución con React Context puro es más ligera (~2KB vs ~40KB de i18next)
4. **Mantenibilidad**: Traducciones en un solo archivo JSON es fácil de actualizar

### Arquitectura propuesta:

```text
┌─────────────────────────────────────────────────────┐
│                    App.tsx                          │
│  ┌────────────────────────────────────────────┐    │
│  │           LanguageProvider                  │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │         AuthProvider                  │  │    │
│  │  │   ┌────────────────────────────────┐ │  │    │
│  │  │   │      StaffDashboard            │ │  │    │
│  │  │   │  useLanguage() → t("key")      │ │  │    │
│  │  │   └────────────────────────────────┘ │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Cambios a Implementar

### FASE 1: Infraestructura de Idioma

**Archivo 1: `src/lib/translations/staff.ts`**
- Diccionario de traducciones inglés/español para la interfaz de staff
- ~100 strings organizados por contexto (dashboard, jobs, checklist, photos, etc.)
- Fácil de expandir en el futuro

**Archivo 2: `src/hooks/useLanguage.tsx`**
- Context Provider para estado de idioma
- Hook `useLanguage()` que expone:
  - `language`: 'en' | 'es'
  - `setLanguage(lang)`: cambiar idioma
  - `t(key)`: función de traducción
- Persiste preferencia en localStorage
- Patrón idéntico al existente `useAuth.tsx`

### FASE 2: Selector de Idioma

**Archivo 3: `src/components/staff/LanguageSwitcher.tsx`**
- Botón compacto con banderas (🇬🇧/🇪🇸) o "EN/ES"
- Un solo tap para cambiar
- Ubicado en el header del StaffDashboard junto al botón de logout

### FASE 3: Integrar en Componentes de Staff

**Archivos a modificar** (reemplazar strings hardcodeados por `t("key")`):

| Archivo | Strings a traducir |
|---------|---------------------|
| `StaffDashboard.tsx` | ~15 (headers, estados, botones) |
| `NextJobCard.tsx` | ~10 (labels, acciones) |
| `TodayJobsList.tsx` | ~8 (estados, títulos) |
| `JobDetailView.tsx` | ~30 (secciones, botones, mensajes) |
| `BeforeAfterPhotos.tsx` | ~8 (labels, estados) |
| `AdvancedChecklist.tsx` | ~12 (títulos, botones, estados) |
| `StaffAvailabilityCalendar.tsx` | ~10 (días, labels) |

**Total**: ~93 strings traducibles

### FASE 4: Integración en App.tsx

**Modificar `App.tsx`**:
- Envolver la aplicación con `LanguageProvider`
- El provider debe estar DENTRO de `AuthProvider` para que pueda acceder al usuario si se desea guardar preferencia en DB en el futuro

## Ejemplo de Uso

```tsx
// En cualquier componente de staff:
import { useLanguage } from "@/hooks/useLanguage";

function MyComponent() {
  const { t, language } = useLanguage();
  
  return (
    <button>{t("start_job")}</button>
    // Renderiza "Start Job" o "Iniciar Trabajo" según idioma
  );
}
```

## Muestra de Traducciones

```typescript
// src/lib/translations/staff.ts
export const staffTranslations = {
  en: {
    // Dashboard
    my_jobs: "My Jobs",
    day_off: "Day Off!",
    no_jobs_scheduled: "No jobs scheduled. Enjoy your day!",
    loading_jobs: "Loading your jobs...",
    
    // Job Card
    next_job: "Next Job", 
    start_job: "Start Job",
    complete_job: "Complete Job",
    view_details: "Details",
    
    // Status
    status_pending: "Pending",
    status_active: "Active", 
    status_done: "Done",
    
    // Availability
    weekly_availability: "Weekly Availability",
    save_availability: "Save Availability",
    not_available: "Not available",
    
    // Photos
    before_after_photos: "Before & After Photos",
    take_before: "Before",
    take_after: "After",
    
    // etc...
  },
  es: {
    // Dashboard
    my_jobs: "Mis Trabajos",
    day_off: "¡Día Libre!",
    no_jobs_scheduled: "No hay trabajos programados. ¡Disfruta tu día!",
    loading_jobs: "Cargando tus trabajos...",
    
    // Job Card
    next_job: "Próximo Trabajo",
    start_job: "Iniciar",
    complete_job: "Completar",
    view_details: "Detalles",
    
    // Status
    status_pending: "Pendiente",
    status_active: "Activo",
    status_done: "Listo",
    
    // Availability
    weekly_availability: "Disponibilidad Semanal",
    save_availability: "Guardar Disponibilidad",
    not_available: "No disponible",
    
    // Photos
    before_after_photos: "Fotos Antes y Después",
    take_before: "Antes",
    take_after: "Después",
    
    // etc...
  }
};
```

## Archivos Nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/lib/translations/staff.ts` | Diccionario EN/ES |
| `src/hooks/useLanguage.tsx` | Context + Hook |
| `src/components/staff/LanguageSwitcher.tsx` | UI selector |

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/App.tsx` | Agregar LanguageProvider |
| `src/pages/StaffDashboard.tsx` | Usar t() + agregar LanguageSwitcher |
| `src/components/staff/NextJobCard.tsx` | Usar t() |
| `src/components/staff/TodayJobsList.tsx` | Usar t() |
| `src/components/JobDetailView.tsx` | Usar t() |
| `src/components/staff/BeforeAfterPhotos.tsx` | Usar t() |
| `src/components/AdvancedChecklist.tsx` | Usar t() |
| `src/components/staff/StaffAvailabilityCalendar.tsx` | Usar t() |
| `src/components/staff/QuickPhotoCapture.tsx` | Usar t() |
| `src/components/staff/AreaPhotoDocumentation.tsx` | Usar t() |

## Beneficios

1. **Cero dependencias nuevas**: Usa solo React Context (ya incluido)
2. **Cambio instantáneo**: Un tap cambia todo sin recargar página
3. **Persistente**: Recuerda preferencia del usuario en localStorage
4. **Escalable**: Fácil agregar más idiomas (portugués, etc.) en el futuro
5. **Aislado**: Solo afecta interfaz de staff, no contamina admin
6. **~3KB total**: Muy ligero comparado con librerías i18n completas

## Consideraciones Técnicas

- Los días de la semana en `StaffAvailabilityCalendar` se traducirán dinámicamente
- Las fechas (format de date-fns) usarán locale español cuando corresponda
- Los mensajes de toast también se traducirán
- Los datos de la base de datos (nombres de clientes, direcciones) NO se traducen - son datos reales
