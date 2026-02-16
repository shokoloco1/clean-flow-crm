# Auditoría técnica rápida — clean-flow-crm

Fecha: 2026-02-16

## Alcance

Se revisó el proyecto en cuatro frentes:

1. **Calidad estática** (`npm run lint`).
2. **Pruebas automatizadas** (`npm run test:run`).
3. **Compilación de producción** (`npm run build`).
4. **Postura básica de seguridad/configuración** (revisión de `supabase/config.toml` y funciones edge clave).

---

## Resultado ejecutivo

- **Estado general**: **funcional pero con deuda técnica alta**.
- **Build**: ✅ compila correctamente para producción.
- **Lint**: ❌ falla con 61 errores y 13 warnings.
- **Tests**: ❌ 2 pruebas fallando (de 226).
- **Seguridad de funciones edge**: ⚠️ todas las funciones tienen `verify_jwt = false`; algunas hacen validación manual de token, pero la configuración aumenta superficie de riesgo por error humano.
- **Dependencias (audit CVEs)**: ⚠️ no se pudo completar por `403 Forbidden` del endpoint de auditoría de npm en este entorno.

---

## Hallazgos principales

### 1) Puerta de calidad rota en lint (alto impacto de mantenibilidad)

`eslint` falla con errores de tipos (`any`), bloques vacíos, comentarios `@ts-ignore`, reglas de seguridad/consistencia y otros.

Impacto:

- Reduce la capacidad de prevenir defectos antes de runtime.
- Aumenta probabilidad de regresiones.
- Complica refactors seguros.

Recomendación:

- Definir objetivo incremental para llegar a **0 errores** de lint.
- Empezar por reglas que afectan confiabilidad (`no-empty`, `no-self-assign`, `ban-ts-comment`, `no-case-declarations`) y luego por tipado estricto.

### 2) Suite de pruebas con fallos (fiabilidad de release reducida)

`vitest` reporta 2 fallos en `useRateLimit.test.ts` relacionados con expectativas de payload (`p_ip_address` esperado `null`, recibido `undefined`) y secuencia de llamadas RPC.

Impacto:

- Riesgo de comportamiento no validado en limitación de intentos de login.
- Menor confianza en despliegues automáticos.

Recomendación:

- Arreglar inmediatamente los 2 tests de rate limit y validar si el bug está en test o implementación.
- Tratar warnings de `act(...)` para reducir falsos positivos y ruido.

### 3) Configuración de funciones Edge con `verify_jwt = false` (riesgo medio-alto)

En `supabase/config.toml`, todas las funciones (`send-email`, `invite-staff`, `create-checkout`, `customer-portal`, etc.) tienen `verify_jwt = false`.

Observación:

- Algunas funciones sí validan manualmente `Authorization` (por ejemplo `send-email`), lo cual mitiga parcialmente.
- Aun así, depender de validación manual en **todas** incrementa riesgo de omisión en cambios futuros.

Recomendación:

- Activar `verify_jwt = true` en funciones que no sean webhooks públicos.
- Mantener `verify_jwt = false` solo en endpoints que realmente lo necesiten (ej. webhooks) y reforzar validación de firma/origen.

### 4) CORS permisivo en funciones (`Access-Control-Allow-Origin: *`) (riesgo medio)

Se observa política CORS abierta (`*`) en funciones revisadas.

Impacto:

- Amplía superficie de invocación desde navegadores de terceros.
- Si una validación auth falla o se relaja por error, facilita abuso.

Recomendación:

- Restringir orígenes permitidos a dominios de frontend controlados.
- Parametrizar por entorno (`dev/staging/prod`).

---

## Plan de remediación sugerido (priorizado)

### Sprint 1 (crítico)

1. Corregir 2 tests fallidos de `useRateLimit`.
2. Eliminar errores críticos de lint (`no-empty`, `no-self-assign`, `ban-ts-comment`, `no-case-declarations`).
3. Endurecer `verify_jwt` para funciones no públicas.

### Sprint 2 (importante)

1. Reducir uso de `any` en hooks y pages más críticas (auth, facturación, staff).
2. Cerrar CORS por lista blanca de orígenes.
3. Añadir workflow CI con gates mínimos: `lint`, `test:run`, `build`.

### Sprint 3 (mejora continua)

1. Incorporar escaneo de dependencias en un entorno con acceso al endpoint de advisories.
2. Definir SLO de calidad (ejemplo: 0 tests fallidos, 0 errores lint en `main`).

---

## Evidencia de comandos ejecutados

- `npm install` → dependencias al día.
- `npm run lint` → falla con 61 errores, 13 warnings.
- `npm run test:run` → 2 tests fallidos, 224 exitosos.
- `npm run build` → build de producción exitosa.
- `npm audit --audit-level=low` → fallo por `403 Forbidden` del endpoint de npm en este entorno.

