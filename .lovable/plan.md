

# Auditoria Completa de Pulcrix - Plan de Mejora y Lanzamiento

---

## A) Resumen Ejecutivo

1. **Pulcrix** es un SaaS de gestion de empresas de limpieza para el mercado australiano, con roles de Admin y Staff, construido con React + Supabase + Stripe.
2. **El flujo de invitacion de staff esta 90% completo** -- la pagina `/staff/accept-invite` existe y la logica esta bien, pero falta el secreto `APP_URL` para que el enlace del correo apunte al dominio correcto.
3. **Los correos llegan a spam** porque se envian desde `onboarding@resend.dev` (dominio compartido de Resend). Solucion: configurar un dominio verificado propio.
4. **Las notificaciones por email al asignar trabajos ya estan implementadas** en `useCreateJob.ts` -- falta verificar que funcionen end-to-end.
5. **Google Calendar** no esta implementado aun y requiere credenciales de Google Cloud Console.
6. **La landing page es profesional y bilingue** (EN/ES), con buena estructura de conversion.
7. **El flujo de suscripcion Stripe esta completo** con trial de 14 dias, checkout, webhook y portal del cliente.
8. **La seguridad es solida**: RLS bien implementado, rate limiting en login, roles con funciones SECURITY DEFINER.
9. **Inconsistencia de idioma**: la app mezcla ingles y espanol sin criterio claro -- Auth en ingles, AcceptInvite en espanol, Dashboard en ingles.
10. **Falta `APP_URL` como secreto** -- esto es un bloqueante critico para que las invitaciones funcionen en produccion.

---

## B) Mapa de Flujo Ideal del Usuario

### Admin (dueno del negocio):
```text
Landing (/) --> Signup (/signup) --> Elegir plan --> Checkout Stripe --> Onboarding Wizard --> Dashboard Admin (/admin)
```

### Staff (trabajador invitado):
```text
Recibe email de invitacion --> Click "Aceptar Invitacion" --> /staff/accept-invite (configura contrasena) --> Login --> Dashboard Staff (/staff)
```

### Flujo diario Staff:
```text
Login --> Ver trabajos del dia --> Iniciar trabajo --> Fotos antes --> Checklist --> Fotos despues --> Completar trabajo
```

---

## C) Auditoria por Areas

### C1. Onboarding y Activacion

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **BLOQUEANTE**: Falta secreto `APP_URL` | El enlace "Accept Invitation" en el correo de Supabase apunta a localhost o URL incorrecta | Agregar secreto `APP_URL` = `https://spotless-log.lovable.app` |
| 2 | **ALTA**: Email de invitacion llega a spam | Staff no encuentra la invitacion | Configurar dominio verificado en Resend y actualizar `RESEND_FROM_EMAIL` |
| 3 | **MEJORA**: Onboarding Wizard solo en ingles | Usuarios hispanohablantes no entienden | Agregar traducciones al OnboardingWizard |
| 4 | **MEJORA**: No hay email de bienvenida post-onboarding al Admin | Oportunidad perdida de engagement | Enviar email de bienvenida despues de completar onboarding |

### C2. Navegacion e IA/UX Writing

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **ALTA**: Mezcla de idiomas inconsistente | Confusion del usuario. Auth en ingles, AcceptInvite en espanol, email mixto | Unificar: usar sistema de i18n existente (`useLanguage`) en todas las paginas |
| 2 | **MEJORA**: Email de invitacion mezcla ingles y espanol | El cuerpo dice "Una vez configurada tu cuenta, podras:" seguido de features en ingles | Unificar idioma del email (detectar idioma del admin o usar espanol por defecto) |
| 3 | **MEJORA**: "Plans start at $89/month" en SubscriptionGate | El plan Starter cuesta $49, no $89 | Corregir a "$49/month" |

### C3. Diseno UI

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **MEJORA**: AcceptInvitePage no muestra branding/logo de Pulcrix | Se siente desconectado del producto | Agregar PulcrixLogo al header de la pagina |
| 2 | **MEJORA**: Dashboard mockup en landing muestra precios en USD ($2,840) | Target market es Australia, deberia ser AUD | Cambiar a AUD o formato australiano |

### C4. Funcionalidades

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **ALTA**: Notificacion email al asignar trabajo -- implementada pero no verificada | Si falla silenciosamente, staff no se entera de sus trabajos | Verificar end-to-end: crear trabajo, verificar que llega email |
| 2 | **ALTA**: AcceptInvitePage timeout usa closure stale de `isSessionReady` | El setTimeout al line 45 captura `isSessionReady` como `false` siempre (closure bug) | Usar ref para trackear el estado |
| 3 | **MEJORA**: Google Calendar -- no implementado | Feature deseada por el usuario | Implementar en fase 2 (requiere Google Cloud credentials) |
| 4 | **MEJORA**: El password reset redirect apunta a `/auth?reset=true` pero no hay logica para manejar el parametro `reset` | El usuario llega a login normal sin formulario de nueva contrasena | Agregar deteccion de `reset=true` y mostrar formulario de nueva contrasena |

### C5. Datos y Modelos

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **OK**: Esquema de DB es solido con tablas bien normalizadas | N/A | N/A |
| 2 | **MEJORA**: Tabla `login_attempts` no tiene indice en `email` + `attempted_at` | Queries de rate limiting podrian ser lentas con muchos registros | Agregar indice compuesto |
| 3 | **NOTA**: Trigger `notify_job_assignment` existe como funcion pero no hay trigger registrado en la DB | Las notificaciones in-app NO se estan generando automaticamente | Crear el trigger `AFTER INSERT OR UPDATE ON jobs` |

### C6. Integraciones

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **OK**: Stripe integrado correctamente (checkout, webhook, portal, check-subscription) | N/A | N/A |
| 2 | **ALTA**: `RESEND_FROM_EMAIL` probablemente sigue siendo `onboarding@resend.dev` | Todos los emails llegan a spam | Configurar dominio propio verificado en Resend |
| 3 | **BLOQUEANTE**: `APP_URL` no esta como secreto de Supabase | La funcion `invite-staff` usa fallback hardcodeado que puede no coincidir con el dominio real | Agregar secreto |
| 4 | **PENDIENTE**: Google Calendar requiere `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` | No se puede implementar sin credenciales | El usuario debe crear proyecto en Google Cloud Console |

### C7. Seguridad y Privacidad

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **OK**: RLS habilitado en todas las tablas con politicas granulares | N/A | N/A |
| 2 | **OK**: Funciones SECURITY DEFINER con `search_path` configurado | N/A | N/A |
| 3 | **OK**: Rate limiting en login con bloqueo temporal | N/A | N/A |
| 4 | **MEJORA**: `bootstrap-role` endpoint permite auto-asignacion de admin | Cualquier usuario sin rol puede hacerse admin | Agregar verificacion (ej: solo funciona si no hay ningun admin en el sistema) |
| 5 | **MEJORA**: `verify_jwt = false` en TODOS los edge functions | Aunque validan auth internamente, es mejor practica activar JWT donde sea posible | Activar para funciones que requieren auth |

### C8. Performance y Confiabilidad

| # | Diagnostico | Impacto | Solucion |
|---|------------|---------|----------|
| 1 | **OK**: Code splitting con lazy loading en todas las paginas | N/A | N/A |
| 2 | **OK**: React Query con staleTime y gcTime configurados | N/A | N/A |
| 3 | **OK**: Realtime subscriptions para jobs en ambos dashboards | N/A | N/A |
| 4 | **MEJORA**: PWA configurado con vite-plugin-pwa | Verificar que el service worker funciona correctamente offline | Testing manual |

---

## D) Lista Priorizada de Cambios

| Prioridad | Cambio | Motivo | Prompt para Lovable | Como Testear |
|-----------|--------|--------|---------------------|--------------|
| BLOQUEANTE | Agregar secreto `APP_URL` | Sin esto, las invitaciones no redirigen correctamente | "Agrega el secreto APP_URL con valor https://spotless-log.lovable.app" (usar herramienta add_secret) | Enviar invitacion, verificar que el link apunta al dominio correcto |
| BLOQUEANTE | Crear trigger DB para `notify_job_assignment` | La funcion existe pero no hay trigger, las notificaciones in-app no se generan | "Crea una migracion SQL que agregue un trigger AFTER INSERT OR UPDATE ON jobs que ejecute la funcion notify_job_assignment()" | Asignar un trabajo y verificar que aparece notificacion in-app |
| ALTA | Fix closure bug en AcceptInvitePage | El timeout de 10s siempre muestra error porque captura estado stale | "En AcceptInvitePage, usa useRef para trackear isSessionReady dentro del setTimeout en lugar de la variable de estado directa" | Abrir link de invitacion y esperar -- no deberia mostrar error si el token es valido |
| ALTA | Configurar dominio verificado en Resend | Emails llegan a spam | El usuario debe: 1) Ir a resend.com/domains, 2) Agregar su dominio, 3) Configurar DNS, 4) Actualizar secreto RESEND_FROM_EMAIL | Enviar email de prueba y verificar que NO llega a spam |
| ALTA | Fix password reset flow | `/auth?reset=true` no maneja el token de recovery | "En Auth.tsx, detecta el hash fragment type=recovery de Supabase y muestra un formulario para nueva contrasena en vez del login normal" | Solicitar reset, click en link del email, verificar que aparece formulario de nueva contrasena |
| ALTA | Unificar idioma en toda la app | Mezcla confusa de EN/ES | "Agrega soporte de traduccion usando el hook useLanguage existente en: AcceptInvitePage, OnboardingWizard, SubscriptionGate y TrialBanner" | Cambiar idioma y verificar que todas las pantallas cambian |
| MEDIA | Agregar logo a AcceptInvitePage | Branding consistente | "En AcceptInvitePage, agrega el componente PulcrixLogo en el header del Card, similar a como esta en Auth.tsx" | Visual: verificar que aparece el logo |
| MEDIA | Corregir precio en SubscriptionGate | Dice $89/month pero Starter es $49 | "En SubscriptionGate.tsx, cambia 'Plans start at $89/month' por 'Plans start at $49/month'" | Visual: verificar texto correcto |
| MEDIA | Proteger bootstrap-role | Riesgo de escalacion de privilegios | "En bootstrap-role, agrega verificacion de que no existe ningun admin en el sistema antes de permitir auto-asignacion" | Intentar bootstrap con admin existente -- debe fallar |
| BAJA | Google Calendar | Feature request del usuario | Implementar en fase 2 despues de que el usuario provea credenciales de Google Cloud | N/A hasta tener credenciales |

---

## E) Plan de Lanzamiento

### Checklist Pre-Lanzamiento

1. [ ] Agregar secreto `APP_URL`
2. [ ] Crear trigger `notify_job_assignment` en DB
3. [ ] Fix closure bug en AcceptInvitePage
4. [ ] Configurar dominio verificado en Resend
5. [ ] Fix password reset flow
6. [ ] Probar flujo completo: Signup Admin --> Onboarding --> Crear Staff --> Invitar --> Staff acepta --> Staff ve trabajos
7. [ ] Probar flujo de pagos: Trial --> Checkout --> Subscription activa --> Customer Portal
8. [ ] Probar en movil (Safari iOS y Chrome Android)
9. [ ] Verificar que emails no llegan a spam
10. [ ] Probar offline mode (PWA)

### Metricas Minimas

- **North Star**: Numero de trabajos completados por semana
- **Activacion**: % de admins que completan onboarding (crean primer trabajo)
- **Retencion**: % de admins activos semana 2 vs semana 1
- **Revenue**: MRR y conversion trial-to-paid
- **Staff Adoption**: % de staff invitados que aceptan invitacion en <48h
- **Engagement**: Promedio de trabajos creados por admin por semana

### Riesgos y Mitigacion

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Emails en spam | Alta (ahora) | Critico | Configurar dominio verificado ASAP |
| Staff no puede aceptar invitacion | Media | Alto | Fix APP_URL + fix closure bug |
| Password reset no funciona | Media | Alto | Implementar recovery flow en Auth.tsx |
| Bootstrap-role explotado | Baja | Alto | Agregar check de admin existente |

### Plan de Iteracion

**Dias 1-7 (Semana 1 - Fixes Criticos)**:
- Dia 1-2: APP_URL + trigger + closure bug fix
- Dia 3-4: Dominio Resend + password reset flow
- Dia 5-7: Testing end-to-end de todos los flujos, unificacion de idioma

**Dias 8-30 (Semana 2-4 - Mejoras y Growth)**:
- Semana 2: Google Calendar integration (si hay credenciales)
- Semana 3: Metricas y analytics, email de bienvenida post-onboarding
- Semana 4: Optimizaciones basadas en feedback de primeros usuarios

