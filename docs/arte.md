# Cómo editar el arte de la cocina

La cocina es isométrica. Todo el dibujo lo genera el código (`scripts/arte-iso.ts`) como archivos SVG en `public/arte/cocina/`: uno por cuarto y uno por capa de cada objeto. Puedes repintar cualquiera en Krita: si guardas un PNG o WebP con **el mismo nombre** al lado del SVG, el juego usa tu dibujo en vez del generado. No hay que tocar código.

## Paso a paso en Krita

1. Abre el SVG en Krita (Archivo → Abrir), por ejemplo `public/arte/cocina/guo_olla.svg`. Revisa que el lienzo quede del tamaño del archivo (Imagen → Propiedades): 1024 × 1024 px los objetos, 2000 × 2000 px el cuarto. Si Krita pregunta la resolución al importar, deja la que propone y corrige el tamaño a esos px.
2. Pinta encima con la tableta, en capas nuevas. Puedes ocultar o borrar la capa del SVG si lo redibujas entero.
3. **No cambies el tamaño del lienzo ni muevas el dibujo**: cada archivo está encuadrado para caer justo en su lugar del cuarto.
4. Exporta como PNG con fondo transparente (Archivo → Exportar), con el mismo nombre: `guo_olla.png`, en la misma carpeta.
5. En tu computador: reinicia `npm run dev` y recarga. El manifiesto (`npm run arte`) corre solo al partir y elige tu PNG.
6. En la página publicada: sube el PNG a GitHub. El build de Vercel corre el manifiesto solo.

Para volver al dibujo generado, borra el PNG.

Si guardas el trabajo de Krita (`.kra`), déjalo fuera de `public/` (por ejemplo en una carpeta `arte-krita/`), para que no se publique.

## Reglas para que nada se rompa

- **Mismo encuadre**: todas las capas de un objeto comparten cuadro y se apilan. El objeto apoya en el mismo punto que el SVG (la sombrita bajo él marca el punto de apoyo).
- **La puerta del refri** (`bingxiang_puerta`) gira sobre su bisagra, al **80,4 %** del ancho del cuadro (el borde de atrás de la puerta). Si la redibujas, deja la bisagra en ese mismo borde.
- **La capa `mugre`** es la que se borra al frotar: solo las manchas, sobre fondo transparente.
- **El cuarto** (`cuarto_cocina`) no lleva los objetos de la tabla de abajo: ellos van aparte y se colocan solos. Sí lleva los muebles y la decoración.
- Dentro de la casa no hay texto en español: si un dibujo lleva letras, que sean hanzi.
- Nada descargado de redes: los dibujos son tuyos o generados por nosotros.

## Cambiar el dibujo generado

Si en vez de pintar encima prefieres cambiar el diseño (colores, muebles, posiciones), se edita `scripts/arte-iso.ts` y se corre `npm run arte:generar`. Las medidas del cuarto y de los muebles están en `components/casa/cocina/iso.ts`; dónde va cada objeto, en `components/casa/cocina/datos.ts` (`LUGARES`). Si mueves un mueble, el juego se entera solo: las posiciones salen de los mismos números.

## La vaca

Sus capas están en `public/vaca/` como WebP de 800 x 800 px y se nombran en `ARTE_VACA` (`components/casa/arte/registro.ts`): `cuerpo`, `orejas`, cinco ojos y cinco hocicos. Para cambiar una capa, reemplaza el archivo con el mismo nombre (o cambia la ruta en `ARTE_VACA`). El borde blanco de sticker lo pone el código.

Si tienes las capas en PNG, déjalas en `public/vaca/` y corre `node scripts/vaca-webp.mjs --borrar`: las convierte a WebP de 800 px de ancho (con transparencia) y borra los PNG. Si prefieres dejarlas en PNG, cambia la extensión en `ARTE_VACA`.

## Capas de cada objeto

Archivo: `public/arte/cocina/<objeto>_<capa>.svg` (o tu `.png` / `.webp` con el mismo nombre). Las capas se apilan en el orden de la tabla (de atrás hacia adelante).

| Objeto | Capa | Qué muestra | Estados en que se ve |
|---|---|---|---|
| bingxiang (refri) | `cuerpo` | La carcasa del refri | siempre |
| bingxiang | `interior` | Lo de adentro: estantes y comida | siempre (la puerta lo tapa cuando está cerrado) |
| bingxiang | `puerta` | La puerta; al abrir, gira sobre su borde | siempre |
| pingguo (manzana) | `entera` | La manzana entera | sucio, limpio |
| pingguo | `mugre` | Manchitas de tierra encima de la manzana | sucio |
| pingguo | `mitad_izq` | Mitad izquierda cortada, con semillas | cortado |
| pingguo | `mitad_der` | Mitad derecha cortada, con semillas | cortado |
| beizi (vaso) | `agua` | El agua dentro del vaso | agua |
| beizi | `te` | El té dentro del vaso | te |
| beizi | `vaso` | El vidrio, con el interior transparente | siempre |
| beizi | `mugre` | Restos en el fondo del vaso | sucio |
| panzi (plato) | `plato` | El plato vacío | siempre |
| panzi | `jiaozi` | Los dumplings sobre el plato | lleno |
| panzi | `mugre` | Salsa y migas | sucio |
| wan (bol) | `bol` | El bol vacío | siempre |
| wan | `arroz` | El arroz dentro del bol | lleno |
| wan | `mugre` | Granos pegados | sucio |
| guo (olla) | `olla` | La olla con sus asas | siempre |
| guo | `arroz` | El arroz cocido asomando | cocido |
| guo | `mugre` | Restos pegados | sucio |
| chahu (tetera) | `tetera` | La tetera | siempre |
| kuaizi (palillos) | `palillos` | Los dos palillos | siempre |

## Piezas de los minijuegos (primer plano)

Misma regla (cuadrado 1024 x 1024). Están en `ARTE_PRIMER_PLANO`.

| Pieza | Qué es |
|---|---|
| `vaso_grande` | El vaso grande de vidrio, **con el interior transparente** (el líquido lo dibuja el programa detrás) |
| `vaso_mascara` | La silueta del interior del vaso, de un solo color. No se ve: solo recorta el líquido |
| `olla_grande` | La olla vista desde arriba |
| `trozos` | Los trocitos que giran dentro de la olla |

El líquido del vaso sube desde el **97 %** del alto del cuadrado (el fondo del vaso) hasta el **12 %** (el borde), y las dos líneas verdes de "lleno" se dibujan en esa escala: dibuja `vaso_grande` y `vaso_mascara` con el interior entre esas dos alturas. La capa `trozos` gira entera sobre el centro del cuadrado.

### Cómo cambiar cada pieza de primer plano

Guarda el PNG en `public/arte/cocina/` y, en `components/casa/arte/registro.ts`, dentro de `ARTE_PRIMER_PLANO`, cambia la línea de la pieza:

| Archivo | Línea antes | Línea después |
|---|---|---|
| `public/arte/cocina/vaso_grande.png` | `vaso_grande: svg(P.VasoGrande),` | `vaso_grande: { tipo: "img", src: "/arte/cocina/vaso_grande.png" },` |
| `public/arte/cocina/vaso_mascara.png` | `vaso_mascara: svg(P.VasoMascara),` | `vaso_mascara: { tipo: "img", src: "/arte/cocina/vaso_mascara.png" },` |
| `public/arte/cocina/olla_grande.png` | `olla_grande: svg(P.OllaGrande),` | `olla_grande: { tipo: "img", src: "/arte/cocina/olla_grande.png" },` |
| `public/arte/cocina/trozos.png` | `trozos: svg(P.Trozos),` | `trozos: { tipo: "img", src: "/arte/cocina/trozos.png" },` |
