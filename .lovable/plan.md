

# Crear Usuarios de Prueba (Demo)

Se creara una Edge Function temporal llamada `create-demo-users` que usara el Admin API para crear dos cuentas con credenciales conocidas. Luego la invocaremos para crear los usuarios.

## Credenciales de los usuarios demo

| Rol | Email | Contrasena |
|-------|-------------------------------|-----------------|
| Admin | demo.admin@pulcrix.com | PulcrixDemo2025! |
| Staff | demo.staff@pulcrix.com | PulcrixDemo2025! |

## Implementacion

### 1. Crear Edge Function `create-demo-users`
Archivo: `supabase/functions/create-demo-users/index.ts`

- Usa el `SUPABASE_SERVICE_ROLE_KEY` para crear usuarios via `auth.admin.createUser()`
- Establece `email_confirm: true` para que no requieran verificacion de email
- Crea ambos usuarios con sus credenciales
- La funcion `handle_new_user` (trigger existente) se encargara automaticamente de:
  - Crear el perfil en `profiles`
  - Asignar rol `staff` por defecto en `user_roles`
- Despues de crear el admin, promovemos su rol a `admin` usando el service role client

### 2. Invocar la funcion
- Desplegar y ejecutar la funcion para crear los usuarios
- Verificar que ambos usuarios existan con sus roles correctos

### 3. Crear suscripciones demo
- Insertar registros en la tabla `subscriptions` para ambos usuarios (como los existentes para las cuentas de testing internas), con fecha de expiracion en 2027, para que no sean bloqueados por el `SubscriptionGate`

### 4. Limpieza
- Eliminar la Edge Function despues de usarla (es un one-time setup)

## Resultado final
El cliente potencial podra:
- Iniciar sesion como **Admin** en `/auth` y ver el dashboard completo en `/admin`
- Iniciar sesion como **Staff** en `/auth` y ver el dashboard de staff en `/staff`

