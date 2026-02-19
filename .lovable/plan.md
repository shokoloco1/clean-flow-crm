
# Diagnóstico: Invitación de Staff por Email

## Situación actual detectada

Al revisar la base de datos, los logs y el código de la función `invite-staff`, encontré lo siguiente:

**Tim Vandertop** (`pulcrix.sales@gmail.com`) fue creado en el sistema con `is_active: false`, lo que confirma que el proceso de creación del usuario SÍ funcionó (el fix de upsert fue efectivo), pero el email de invitación probablemente NO llegó.

### Causa raíz identificada: `is_active: false`

El perfil de Tim se creó con `is_active: false` porque la función hace:

```
upsert({ is_active: true, ... })
```

Pero el trigger `handle_new_user()` que se ejecuta primero crea el perfil con los valores por defecto de la columna `is_active`. Si el valor por defecto en la tabla `profiles` es `false`, el trigger lo crea como inactivo, y luego el upsert actualiza todos los campos correctamente — EXCEPTO que a veces el upsert con `onConflict` solo hace UPDATE si la fila ya existe, lo que debería funcionar.

**El problema real es distinto**: El magic link generado por `supabase.auth.admin.generateLink` con `type: "magiclink"` tiene un comportamiento distinto a una invitación real. El email se envía vía **Resend** desde el `RESEND_FROM_EMAIL` configurado. Si ese dominio no está verificado en Resend, o si el email destinatario está fuera de los permitidos en la prueba de Resend, el envío falla silenciosamente.

### Problemas identificados

1. **`is_active: false` en Tim Vandertop** — El staff creado está marcado como inactivo, lo que podría impedirle iniciar sesión en el staff dashboard.

2. **El magic link usa el dominio de Supabase directamente** — La URL generada es `supabase.co/auth/v1/verify?token=...&redirect_to=...`. Si el `redirect_to` no coincide con los dominios permitidos en las configuraciones de autenticación, el link puede redirigir incorrectamente.

3. **Resend en modo prueba** — Si `RESEND_FROM_EMAIL` usa `onboarding@resend.dev` (el dominio de prueba de Resend), solo puede enviarse a emails verificados en la cuenta de Resend. Si Tim Vandertop usa un email externo, Resend lo bloquea en modo prueba.

4. **El `redirect_to` apunta al origin de la petición** — En producción podría apuntar a la preview URL (`*.lovable.app`) en lugar de a `https://spotless-log.lovable.app` o al dominio real.

---

## Plan de corrección

### Cambio 1: Activar a Tim Vandertop inmediatamente

Hacer un fix rápido en la base de datos para poner `is_active: true` en el perfil de Tim, para que pueda usar la app cuando reciba el link.

### Cambio 2: Usar `inviteUserByEmail` en lugar de `generateLink` + Resend manual

La función actualmente hace:
1. Crea usuario con `createUser`
2. Genera un magic link con `generateLink`
3. Construye manualmente la URL del token
4. Envía via Resend con HTML personalizado

El problema es que este flujo construye la URL del token manualmente y el link puede no funcionar correctamente. 

**La solución correcta**: Usar `supabase.auth.admin.inviteUserByEmail(email, { redirectTo })` directamente, que hace TODO en un solo paso:
- Crea el usuario si no existe
- Genera el link de tipo `invite` (no magiclink)
- Lo envía via el sistema de email de Supabase/Auth automáticamente

Luego, adicionalmente, usar Resend para enviar un email de bienvenida más elaborado con HTML bonito, pero usando el link de Supabase como respaldo.

### Cambio 3: Refactorizar el flujo de invitación

Nuevo flujo simplificado:

```
1. Verificar que el caller es admin ✓
2. Verificar si el usuario ya existe
   - Si existe: actualizar perfil + reenviar invitación
   - Si no existe: usar inviteUserByEmail() → crea usuario + envía email automático
3. Crear/actualizar perfil, sensitive data, rol, y disponibilidad
4. Enviar email adicional con HTML de Pulcrix vía Resend (si RESEND_API_KEY está configurado)
5. Si Resend falla: el email de Supabase Auth ya fue enviado como respaldo
```

### Cambio 4: Asegurar `redirect_to` correcto

El `redirect_to` debe siempre apuntar a `https://spotless-log.lovable.app/auth` (la URL publicada), no al origin variable de la petición.

---

## Archivos a modificar

```text
supabase/functions/invite-staff/index.ts  — Refactorizar flujo de invitación
```

Y una corrección directa en base de datos para activar a Tim Vandertop.

---

## Beneficios del nuevo flujo

- El email de Supabase Auth llega SIEMPRE (es el sistema nativo, no depende de Resend)
- Resend se usa como capa extra con HTML bonito de Pulcrix
- Si Resend falla, el staff igual recibe la invitación
- El link de tipo `invite` permite al staff establecer su contraseña, no solo un magic link de un uso
- `is_active` siempre estará en `true` para staff recién invitado
