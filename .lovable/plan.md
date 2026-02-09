
# Actualizar Branding en package.json

## Cambio Requerido

Actualizar el campo `name` en `package.json` de `"vite_react_shadcn_ts"` a `"pulcrix"`.

## Archivo a Modificar

**`package.json`** - Línea 2

## Cambio Específico

```json
// Antes
{
  "name": "vite_react_shadcn_ts",
  ...
}

// Después
{
  "name": "pulcrix",
  ...
}
```

## Por qué es Importante

- Identifica correctamente el proyecto en logs de errores (Sentry)
- Mejora la experiencia en herramientas de monitoreo y npm
- Profesionaliza el proyecto con el nombre de marca correcto
- Consistencia con el branding en el resto de la aplicación (PWA manifest, index.html)

## Detalles Técnicos

El cambio es mínimo y solo afecta la línea 2 del archivo. No impacta ninguna funcionalidad ya que el campo `name` en un proyecto `"private": true` es solo para identificación interna.
