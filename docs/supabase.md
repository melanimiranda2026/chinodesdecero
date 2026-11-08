# Supabase: configuración necesaria

## Variables de entorno

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (ver `.env.example`). Nunca se suben al repo.

## Base de datos

Aplicar en orden `supabase/migrations/0001_inicial.sql` y `supabase/migrations/0002_limites_consentimiento.sql` (SQL editor o `supabase db push`).

`0002` agrega:

- **Límites de uso** (tabla `limites` + función `consumir_limite`, solo para el service role): `/api/suscribir` acepta 5 por hora por IP y 3 por hora por correo; `/api/eventos`, 120 lotes por minuto por IP. Pasado el límite responde 429. Las claves nunca guardan la IP ni el correo en claro (`ip:<hmac-sha256>`, `email:<sha256>`). Si la función no existe o falla, las rutas dejan pasar (registran el error).
- **Doble opt-in** en `suscriptores`: `consentimiento` es lo que la persona *pidió* al marcar la casilla (con `consentido_en` y `texto_consentimiento`, la versión del texto, hoy `v1-2026-11`). `consentimiento_confirmado` se pone en `true` recién cuando abre el enlace del correo (`/auth/callback`), es decir, cuando demostró que el correo es suyo.
- **Avance entre dispositivos**: el formulario manda el avance del navegador; queda en `suscriptores.avance_pendiente`. Al abrir el enlace, si la cuenta no tiene avance o tiene menos escuchadas, se copia a `avance` y se borra el pendiente. Luego el navegador lo trae con la sincronización normal.
- **Baja**: `token_baja` (uuid único por correo). `GET /baja?e=<token_baja>` pone `consentimiento` y `consentimiento_confirmado` en `false`.

## Envíos de novedades (marketing)

- **Solo a quienes tengan `consentimiento_confirmado = true`.** `consentimiento = true` sin confirmar no basta (cualquiera puede escribir un correo ajeno en el formulario).
- **Todo correo de novedades lleva el enlace de baja**: `<NEXT_PUBLIC_SITE_URL>/baja?e=<token_baja>` (el `token_baja` de esa fila).
- Para pedir que borremos un correo, la página indica un contacto: hoy es el marcador `CONFIRMAR@correo` (`components/pagina/Correo.tsx`, `CONTACTO_PRIVACIDAD`). **Cambiarlo por el correo real antes de publicar.**

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
