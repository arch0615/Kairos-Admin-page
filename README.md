# Kairos · Usuarios — herramienta INTERNA / LOCAL

> ⚠️ **USO LOCAL ÚNICAMENTE. NO DESPLEGAR.**
> Muestra, sin login, **todos los usuarios** y sus solicitudes/documentos
> (datos personales y financieros reales). Solo debe correr en la máquina del
> operador autorizado (`localhost`).

## Por qué es local y no se despliega

Para leer datos protegidos por RLS hace falta la **service key** (admin). Esa
llave vive **solo en el servidor de Vite** (`vite.config.js`, lado Node) y se lee
de `.env.local` con variables **sin** prefijo `VITE_`, de modo que **nunca** entra
al bundle del navegador. El API `/api/*` **solo existe en `npm run dev`**: si se
hiciera `build`/deploy, no habría API y no se filtraría la llave — pero tampoco
mostraría datos. Por diseño, es una herramienta local.

Si en el futuro se necesita acceso remoto del equipo, NO se debe exponer así:
habría que ponerle autenticación (p. ej. login de director) o una protección de
acceso (contraseña de despliegue), nunca dejarlo público con la service key.

## Uso

```bash
npm install
cp .env.example .env.local     # y completa SUPABASE_URL + SUPABASE_SERVICE_KEY
npm run dev                    # abre http://localhost:5176
```

`.env.local` está en `.gitignore` (al igual que cualquier `.env*`): la service key
**no se versiona**.

## Qué muestra

- **Lista de todos los usuarios** (de Supabase Auth) en la página principal.
- Por usuario: correo, nombre, **rol** (cliente/analista/director), fecha de alta,
  último acceso y si el correo está confirmado.
- Al hacer clic en un usuario se abre su **página de detalle** (`#u/<id>`, con
  botón "Volver", recargable y deep-linkable): datos de la cuenta + todas sus
  **solicitudes** (folio, estado, datos, monto, domicilio, etc.) y sus
  **documentos**, con botón para abrirlos vía enlace firmado temporal del bucket
  privado.
- Buscador por correo, nombre, rol o folio; y un resumen (totales).
- **Filtro por tipo de usuario** (chips: Todos / Cliente / Analista / Director /
  Sin perfil, con conteos).
- **Paginación** (tamaño de página configurable: 10/25/50/100).
- **Selección por fila (checkbox)** + "Seleccionar todo" (sobre el filtrado) y
  **Exportar CSV** de los usuarios seleccionados.

## Seguridad

- La service key es secreta: si se compartió, **rótala** en Supabase.
- Esta herramienta concentra PII real (CURP, RFC, domicilio, ingresos,
  documentos). Trátala como confidencial; no la dejes abierta en equipos
  compartidos y no la despliegues.

## Variables de entorno

| Variable               | Descripción                                            |
| ---------------------- | ------------------------------------------------------ |
| `SUPABASE_URL`         | URL del proyecto Supabase                              |
| `SUPABASE_SERVICE_KEY` | **service/secret key** (admin) — solo lado servidor    |
