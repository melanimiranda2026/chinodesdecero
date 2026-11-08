# Supabase: configuración necesaria

## Variables de entorno

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (ver `.env.example`). Nunca se suben al repo.

## Base de datos

Aplicar `supabase/migrations/0001_inicial.sql` (SQL editor o `supabase db push`).

## Enlace mágico entre dispositivos

El enlace del correo tiene que abrir en cualquier dispositivo (la persona deja el correo en el navegador de TikTok y lo abre desde Gmail). Por eso no usamos PKCE: el servidor envía el enlace con un cliente `flowType: "implicit"` y `/auth/callback` valida el `token_hash` con `verifyOtp`.

**Cambio obligatorio en la plantilla de correo** (Authentication → Email Templates → Magic Link). El enlace debe ser exactamente:

```html
<h2>Tu enlace para volver a la casa</h2>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Entrar</a></p>
```

Si se deja la plantilla por defecto (`{{ .ConfirmationURL }}`), el enlace no funciona en otro dispositivo.

## URLs de Auth

Authentication → URL Configuration:

- **Site URL**: el valor de `NEXT_PUBLIC_SITE_URL` (dominio de producción).
- **Redirect URLs**: `<NEXT_PUBLIC_SITE_URL>/auth/callback` y, para desarrollo, `http://localhost:3000/auth/callback`.

## Correo en producción

El correo integrado de Supabase tiene un límite muy bajo y solo sirve para pruebas. Para producción hay que configurar un **SMTP propio** (Authentication → SMTP Settings) con un proveedor de envío, y ajustar los límites de envío por hora.
