
# Plan: Separar "Inactivar" y "Eliminar" Staff

## Problema actual

El botón "Delete" en `StaffManagementPage.tsx` actualmente solo hace `update({ is_active: false })`, es decir, **es exactamente lo mismo que "Deactivate"**. El usuario pide que:

- **Inactivar** = solo pone `is_active: false` (el staff no puede recibir jobs, pero sus datos quedan)
- **Eliminar** = borrado real y permanente: elimina el registro de auth, `profiles`, `user_roles`, y datos relacionados

## Solución

### 1. Nueva Edge Function: `delete-staff`

Crear `supabase/functions/delete-staff/index.ts` con permisos de service role para:
1. Verificar que el llamante es admin
2. Desasignar al staff de jobs futuros (`assigned_staff_id = null` en jobs pendientes/en progreso)
3. Eliminar el usuario de `auth.users` usando `supabase.auth.admin.deleteUser(userId)` — esto activa el CASCADE que elimina `profiles` y `user_roles` automáticamente (por la FK `ON DELETE CASCADE`)

### 2. Cambios en `StaffManagementPage.tsx`

**En el DropdownMenu de cada staff row:**

Antes (ambas acciones hacían lo mismo):
```
Edit Profile
Deactivate/Activate   ← togglea is_active
── separator ──
Delete                ← también solo ponía is_active: false ← INCORRECTO
```

Después (separación clara):
```
Edit Profile
Deactivate/Activate   ← solo togglea is_active (preserva cuenta, sin acceso a jobs)
── separator ──
Delete Permanently    ← llama delete-staff edge function → borrado real de auth + datos
```

**Diálogo de confirmación de Delete** — actualizar el texto para que sea claro:
- Título: "Permanently Delete Staff Member"
- Descripción: "This action CANNOT be undone. It will permanently delete [name]'s account, profile, and all access. Their completed job history will be preserved, but they will no longer be able to log in."
- Botón: "Yes, Delete Permanently" (en rojo destructivo)

**La función `handleDeleteStaff`** pasará a llamar la edge function `delete-staff` en lugar de hacer update.

**La función `handleQuickToggleStatus`** permanece igual — solo togglea `is_active`.

### 3. Archivos a modificar

```text
supabase/functions/delete-staff/index.ts  — NUEVO (edge function de borrado real)
src/pages/StaffManagementPage.tsx         — Actualizar handleDeleteStaff + UI del diálogo
```

### Detalles técnicos

**Edge Function `delete-staff`:**
- Recibe `{ staffUserId: string }` en el body
- Autentica al llamante y verifica rol admin via JWT
- Desasigna jobs pendientes/en progreso: `UPDATE jobs SET assigned_staff_id = NULL WHERE assigned_staff_id = staffUserId AND status IN ('pending', 'in_progress')`
- Llama `supabase.auth.admin.deleteUser(staffUserId)` — el CASCADE de FK elimina automáticamente `profiles` y `user_roles`

**Por qué se necesita una edge function:**
`supabase.auth.admin.deleteUser()` solo está disponible con el `service_role` key, que **nunca debe usarse en el cliente**. La edge function tiene acceso seguro a `SUPABASE_SERVICE_ROLE_KEY`.

**Por qué NO se borran los jobs completados:**
Los jobs completados tienen valor histórico (facturación, métricas). Solo se desasigna el staff de jobs FUTUROS que todavía no han empezado, para que no queden bloqueados sin un limpiador asignado.
