

# Plan para Resolver Temas Críticos del Proyecto

## Resumen Ejecutivo

Se identificaron **3 temas críticos** que requieren acción inmediata para producción:

| Prioridad | Problema | Impacto |
|-----------|----------|---------|
| 🔴 Alta | Manifest PWA generado en build pero no en source | PWA instalable pero configuración fragmentada |
| 🟠 Media | package.json con nombre genérico | Dificulta identificación en logs/monitores |
| 🟡 Baja | Variables de entorno faltantes para producción | Emails desde dominio de prueba, crons sin autenticar |

---

## FASE 1: Branding del Proyecto

### 1.1 Actualizar package.json

**Archivo**: `package.json`

**Cambios**:
```json
{
  "name": "pulcrix",
  "description": "All-in-one management platform for commercial cleaning businesses",
  "version": "1.0.0",
  ...
}
```

**Por qué es importante**:
- Identifica correctamente el proyecto en logs de errores (Sentry)
- Mejora la experiencia en herramientas de monitoreo
- Profesionaliza el proyecto

### 1.2 PWA Manifest (Ya Configurado ✅)

**Estado actual**: El manifest PWA se genera correctamente via `vite-plugin-pwa` en `vite.config.ts`:
- Nombre: "Pulcrix - Clean Living. Pure Solutions."
- Nombre corto: "Pulcrix"  
- Colores de marca: #0D9488 (teal)
- Iconos: 8 tamaños configurados (72x72 a 512x512)

**No se requiere acción**: El manifest se genera automáticamente durante el build.

---

## FASE 2: Variables de Entorno para Producción

### 2.1 Secrets Actuales

| Secret | Estado | Uso |
|--------|--------|-----|
| LOVABLE_API_KEY | ✅ Configurado | Sistema |
| RESEND_API_KEY | ✅ Configurado | Envío de emails |
| STRIPE_SECRET_KEY | ✅ Configurado | Pagos |
| STRIPE_WEBHOOK_SECRET | ✅ Configurado | Webhooks de Stripe |

### 2.2 Secrets Faltantes para Producción

| Secret | Propósito | Archivos Afectados |
|--------|-----------|-------------------|
| `APP_URL` | URL base de la aplicación | `create-checkout`, `send-trial-email`, `invite-staff` |
| `CRON_SECRET` | Autenticación para tareas programadas | `check-late-arrivals`, `generate-recurring-jobs` |
| `RESEND_FROM_EMAIL` | Dominio verificado para emails | 4 edge functions de email |

### 2.3 Impacto si NO se configuran:

1. **APP_URL**: URLs en emails apuntan a `https://pulcrix.com` (fallback correcto, pero hardcodeado)
2. **CRON_SECRET**: Las tareas programadas solo funcionan con autenticación de usuario, no automáticamente
3. **RESEND_FROM_EMAIL**: Todos los emails salen desde `onboarding@resend.dev` (dominio de prueba de Resend) - **los emails pueden ir a spam**

---

## FASE 3: Actualizar .env.example

El archivo `.env.example` actual solo documenta variables de frontend. Se debe actualizar para incluir documentación de todos los secrets necesarios.

**Archivo**: `.env.example`

**Contenido propuesto**:
```bash
# ═══════════════════════════════════════════════════════════
# PULCRIX - Environment Variables
# ═══════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────
# FRONTEND (Vite) - Required
# ─────────────────────────────────────────────────────────────
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-public-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# Optional: Analytics
VITE_ENABLE_ANALYTICS="false"

# Optional: Sentry Error Tracking
VITE_SENTRY_DSN="your-sentry-dsn"

# ─────────────────────────────────────────────────────────────
# BACKEND (Edge Functions) - Configure via Lovable Cloud
# ─────────────────────────────────────────────────────────────
# These are configured as secrets in Lovable Cloud, not in .env

# Stripe (Payments)
# STRIPE_SECRET_KEY="sk_live_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."

# Resend (Emails)
# RESEND_API_KEY="re_..."
# RESEND_FROM_EMAIL="Pulcrix <noreply@pulcrix.com>"

# Application URLs
# APP_URL="https://pulcrix.com"

# Cron Job Authentication
# CRON_SECRET="your-secure-random-string"
```

---

## Acciones a Ejecutar

### Paso 1: Actualizar package.json
Cambiar nombre de `vite_react_shadcn_ts` a `pulcrix` y agregar descripción.

### Paso 2: Actualizar .env.example
Documentar todas las variables necesarias para que futuros desarrolladores sepan qué configurar.

### Paso 3: Configurar Secrets de Producción (Manual)
Estos deben configurarse a través de la interfaz de Lovable Cloud cuando esté listo para producción:

1. **APP_URL** = `https://spotless-log.lovable.app` (o dominio custom)
2. **CRON_SECRET** = Generar string aleatorio seguro (32+ caracteres)
3. **RESEND_FROM_EMAIL** = `Pulcrix <noreply@tu-dominio-verificado.com>` 
   - Requiere verificar dominio en https://resend.com/domains primero

---

## Notas Técnicas

### Sobre el Manifest PWA
El proyecto usa `vite-plugin-pwa` que genera el manifest dinámicamente durante el build. Esto es **la forma recomendada** ya que:
- Evita duplicación de configuración
- El manifest se genera con cache busting automático
- Se integra con el service worker de Workbox

### Sobre los Fallbacks en Edge Functions
Los fallbacks actuales (`https://pulcrix.com`) son correctos para producción final, pero durante desarrollo/staging se debe configurar `APP_URL` para evitar URLs incorrectas en emails.

---

## Resumen de Cambios

| Archivo | Acción |
|---------|--------|
| `package.json` | Actualizar nombre y descripción |
| `.env.example` | Documentar variables de backend |

**Secrets a configurar manualmente**: `APP_URL`, `CRON_SECRET`, `RESEND_FROM_EMAIL`

