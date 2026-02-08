# Guía de Deployment a Producción - Pulcrix

## Tabla de Contenidos
1. [Pre-requisitos](#1-pre-requisitos)
2. [Variables de Entorno](#2-variables-de-entorno)
3. [Pasos de Deployment](#3-pasos-de-deployment)
4. [Verificación Post-Deployment](#4-verificación-post-deployment)
5. [Troubleshooting](#5-troubleshooting)
6. [Procedimientos de Rollback](#6-procedimientos-de-rollback)

---

## 1. Pre-requisitos

### Cuentas y Accesos Requeridos

- [ ] **Supabase** (https://supabase.com)
  - Proyecto creado (Project ID: `edeprzdcvbejtnhoqawv`)
  - Plan Pro/Team recomendado para producción
  - Región cercana a Australia para baja latencia

- [ ] **Stripe** (https://dashboard.stripe.com)
  - Cuenta en modo **Live** (no Test)
  - Productos y precios configurados:
    - Starter (monthly/annual)
    - Professional (monthly/annual)
    - Business (monthly/annual)
  - Webhook endpoint creado

- [ ] **Resend** (https://resend.com)
  - Dominio `pulcrix.com.au` verificado
  - Registros DNS configurados (SPF, DKIM, DMARC)
  - API key generada

- [ ] **Dominio** `pulcrix.com.au`
  - Acceso DNS para configuración
  - Certificado SSL (auto-provisionado por Vercel)

- [ ] **Vercel** (https://vercel.com)
  - Cuenta con integración GitHub
  - Plan Team/Pro recomendado para analytics

### Herramientas Locales

```bash
# Node.js 18+
node --version

# Supabase CLI
npm install -g supabase
supabase --version

# Vercel CLI
npm install -g vercel
vercel --version
```

### Checklist de Código

- [ ] Tests pasando: `npm run test:run`
- [ ] Build exitoso: `npm run build`
- [ ] Lint sin errores: `npm run lint`

---

## 2. Variables de Entorno

### Frontend (Configurar en Vercel Dashboard)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto Supabase | `edeprzdcvbejtnhoqawv` |
| `VITE_SUPABASE_URL` | URL de la API de Supabase | `https://edeprzdcvbejtnhoqawv.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon key) | `eyJhbGc...` |
| `VITE_SUPABASE_ANON_KEY` | Alias para publishable key | `eyJhbGc...` |
| `VITE_APP_URL` | URL de producción de la app | `https://app.pulcrix.com.au` |
| `VITE_ENABLE_ANALYTICS` | Habilitar analytics | `true` |
| `VITE_SENTRY_DSN` | DSN de Sentry para errores | `https://xxx@sentry.io/xxx` |

### Backend (Configurar en Supabase Secrets)

| Variable | Descripción | Usado Por |
|----------|-------------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin (NUNCA exponer) | Todas las funciones |
| `SUPABASE_ANON_KEY` | Clave pública | create-checkout |
| `APP_URL` | URL para redirects | create-checkout, invite-staff |
| `STRIPE_SECRET_KEY` | Clave secreta Stripe (`sk_live_...`) | Funciones de pago |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook (`whsec_...`) | stripe-webhook |
| `RESEND_API_KEY` | API key de Resend (`re_...`) | Funciones de email |
| `RESEND_FROM_EMAIL` | Email verificado de envío | Funciones de email |
| `RESEND_FROM_NAME` | Nombre del remitente | Funciones de email |
| `CLAUDE_API_KEY` | API key de Anthropic | Funciones de IA |
| `GOOGLE_VISION_API_KEY` | API key de Google Cloud Vision | analyze-photo |
| `SENDGRID_API_KEY` | API key de SendGrid (opcional) | send-smart-alert |
| `CRON_SECRET` | Secret para cron jobs | Funciones programadas |

---

## 3. Pasos de Deployment

### Paso 1: Push de Migraciones a Supabase

```bash
# Vincular al proyecto de producción
supabase link --project-ref edeprzdcvbejtnhoqawv

# Ver migraciones pendientes
supabase db diff

# Aplicar todas las migraciones
npm run db:push
```

**Verificar:** Supabase Dashboard > Database > Tables

### Paso 2: Configurar Secrets en Supabase

```bash
# Configurar todos los secrets requeridos
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set RESEND_FROM_EMAIL="Pulcrix <no-reply@pulcrix.com.au>"
supabase secrets set RESEND_FROM_NAME="Pulcrix"
supabase secrets set CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx
supabase secrets set GOOGLE_VISION_API_KEY=AIzaxxxxxxxxxxxxx
supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
supabase secrets set APP_URL=https://app.pulcrix.com.au

# Verificar secrets configurados
supabase secrets list
```

### Paso 3: Deploy de Edge Functions

```bash
# Deploy de todas las 17 funciones
npm run deploy:functions
```

**Edge Functions (17 total):**
- `analyze-photo` - Análisis de fotos con Vision AI
- `bootstrap-role` - Setup inicial de admin
- `check-late-arrivals` - Detección de llegadas tarde
- `check-subscription` - Verificar suscripción
- `create-checkout` - Crear sesión de pago
- `customer-portal` - Portal de cliente Stripe
- `detect-anomalies` - Detección de fraude
- `generate-ai-report` - Reportes con IA
- `generate-insights` - Insights semanales
- `generate-recurring-jobs` - Jobs recurrentes
- `invite-staff` - Invitar personal
- `send-email` - Emails transaccionales
- `send-invoice-email` - Envío de facturas
- `send-payment-reminder` - Recordatorios de pago
- `send-smart-alert` - Alertas inteligentes
- `send-trial-email` - Emails de trial
- `stripe-webhook` - Webhook de Stripe

### Paso 4: Configurar Stripe Webhooks

1. Ir a **Stripe Dashboard > Developers > Webhooks**
2. Agregar endpoint:
   ```
   https://edeprzdcvbejtnhoqawv.supabase.co/functions/v1/stripe-webhook
   ```
3. Seleccionar eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copiar el **Signing secret** y configurar como `STRIPE_WEBHOOK_SECRET`
5. Probar con Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Paso 5: Build y Deploy Frontend (Vercel)

```bash
# Login y vincular proyecto
vercel login
vercel link

# Configurar variables de entorno en Vercel
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env add VITE_APP_URL production
vercel env add VITE_ENABLE_ANALYTICS production

# Deploy a producción
vercel --prod
```

### Paso 6: Configurar Dominio Custom

1. **Vercel Dashboard > Project > Settings > Domains**
2. Agregar: `app.pulcrix.com.au`
3. Configurar registros DNS según instrucciones de Vercel:
   - CNAME `app` → `cname.vercel-dns.com`
4. Esperar propagación DNS (5-30 minutos)

### Paso 7: Verificar SSL

- Vercel auto-provisiona certificado Let's Encrypt
- Verificar en: https://app.pulcrix.com.au
- Confirmar certificado válido en el navegador

### Paso 8: Test E2E

```bash
# Ejecutar script de verificación
npm run verify
```

Salida esperada:
```
✅ Supabase Connection: Connected successfully
✅ Function: check-subscription: Accessible
✅ Function: create-checkout: Accessible
✅ Stripe Integration: check-subscription function accessible
✅ App URL: https://app.pulcrix.com.au is accessible
✅ SSL: HTTPS enabled

✅ All checks passed!
```

---

## 4. Verificación Post-Deployment

### Checklist de Pruebas Manuales

- [ ] Homepage carga en https://app.pulcrix.com.au
- [ ] Registro de usuario funciona
- [ ] Login/logout correcto
- [ ] Checkout de Stripe redirecciona correctamente
- [ ] Periodo de trial se activa (14 días)
- [ ] Emails de invitación se envían
- [ ] Creación y gestión de jobs funciona
- [ ] Generación de facturas funciona
- [ ] Reportes PDF se generan correctamente

### Monitoreo

- [ ] Sentry recibe eventos de error
- [ ] Logs de Edge Functions visibles en Supabase Dashboard
- [ ] Vercel Analytics activo
- [ ] Stripe Webhook Dashboard muestra entregas exitosas

---

## 5. Troubleshooting

### Edge Function retorna 500

```bash
# Ver logs de la función
supabase functions logs <nombre-función>

# Verificar secrets
supabase secrets list
```

### Stripe webhook falla la firma

- Verificar que `STRIPE_WEBHOOK_SECRET` coincide con Stripe Dashboard
- Confirmar URL del webhook (sin trailing slash)
- Revisar eventos seleccionados

### Emails no se envían

- Verificar estado del dominio en Resend
- Confirmar que `RESEND_FROM_EMAIL` coincide con dominio verificado
- Revisar logs de la función:
  ```bash
  supabase functions logs send-email
  ```

### Conexión a base de datos falla

- Verificar `SUPABASE_SERVICE_ROLE_KEY` es correcto
- Confirmar que el proyecto Supabase no está pausado
- Revisar límites del plan

---

## 6. Procedimientos de Rollback

### Rollback de Base de Datos

```bash
# Ver historial de migraciones
supabase migration list

# Para revertir, crear nueva migración con SQL inverso
supabase migration new revert_last_change
# Editar el archivo y agregar SQL de reversión
```

### Rollback de Frontend

```bash
# Rollback automático de Vercel
vercel rollback

# O deploy de commit específico
git checkout <commit-anterior>
vercel --prod
```

### Rollback de Edge Functions

```bash
# Redeploy desde commit específico
git checkout <commit-anterior>
supabase functions deploy <nombre-función>
```

---

## Referencias

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Resend Documentation](https://resend.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
