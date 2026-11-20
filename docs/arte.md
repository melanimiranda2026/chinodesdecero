# Cómo editar el arte de la casa

La cocina y el living son isométricos. Todo el dibujo lo genera el código (`scripts/arte-iso.ts`) como archivos SVG en `public/arte/cocina/` y `public/arte/living/`: uno por cuarto y uno por capa de cada objeto. Puedes repintar cualquiera en Krita: si guardas un PNG o WebP con **el mismo nombre** al lado del SVG, el juego usa tu dibujo en vez del generado. No hay que tocar código.

## Pintar en Krita con capas (lo recomendado)

Si abres un SVG directo en Krita, todo queda en **una sola capa vectorial**: no se separa y los pinceles no pintan ahí. Por eso hay archivos listos para Krita en `arte-krita/`:

- Un `.ora` por objeto (`guo.ora`, `bingxiang.ora`, …), con sus capas ya separadas y con nombre (`olla`, `arroz`, `mugre`), alineadas y de 1024 × 1024 px.
- `cuarto_cocina.ora` (2000 × 2000 px), con el cuarto partido en capas: `piso`, `paredes`, `ventana`, `repisa_izq`, `pared_der`, `sombras`, `meson_izq`, `meson_der`, `mesa` y `planta`.
- `cuarto_living.ora` (2000 × 2000 px), igual para el living: `piso`, `paredes`, `alfombra`, `sombras`, `tele`, `sofa`, `sillas` (las dos de atrás), `mesa` (con las fichas de colores), `sillas_frente` y `planta`.

Algunas capas vienen ocultas porque no se ven a la vez en el juego (las mitades de la manzana, el té del vaso). Préndelas con el ojito del panel Capas.

### Paso a paso

1. Si no está la carpeta `arte-krita/`, o quieres los archivos nuevos: `npm run arte:krita`. No pisa un `.ora` que ya exista. Para rehacerlo desde cero, `npm run arte:krita -- --forzar` (se pierde lo que pintaste en ese archivo).
2. En Krita: Archivo → Abrir → `arte-krita/guo.ora`. En el panel Capas ves `olla`, `arroz`, `mugre`.
3. Pinta con la tableta **dentro de la capa** que quieres cambiar. Si prefieres pintar en capas nuevas, mételas en un **grupo con el nombre de la capa**: crea un grupo, ponle `arroz` y deja adentro la capa original y tus capas nuevas.
4. Guarda con **Ctrl + S**, en el mismo `.ora`. Si Krita avisa que el formato puede perder cosas, acepta. No guardes como `.kra`: ese no se puede leer.
5. Corre `npm run arte:krita-importar`. Deja en `public/arte/cocina/` (o `living/`, para `cuarto_living.ora`) un PNG por cada capa que cambiaste (las demás no las toca) y actualiza el manifiesto.
6. Reinicia `npm run dev` y recarga.

Cómo se lee lo que guardas:

- **Objetos:** cada capa (o grupo) de arriba se exporta por su nombre, **aunque esté oculta**: el juego decide cuándo se ve. Dentro de un grupo, lo oculto no entra. Una capa con otro nombre (por ejemplo "Capa 3") se ignora con un aviso.
- **Cuarto:** se exporta **todo lo visible junto** como `cuarto_cocina.png` (o `cuarto_living.png`). Si ocultas una capa, desaparece del juego.
- Solo se usa la mezcla normal: los modos de fusión (multiplicar, etc.) no se aplican en los objetos. En el cuarto sí, porque se usa la imagen final que guarda Krita.
- No cambies el tamaño del lienzo: si no es 1024 (objetos) o 2000 (cuarto), el archivo no se importa.

Los `.ora` son tu trabajo: súbelos a GitHub cuando quieras guardarlos. La carpeta `arte-krita/fuentes/` se rehace sola y no se sube.

## Paso a paso en Krita, con el SVG suelto

Sirve para retocar un solo archivo sin el `.ora`.

1. Abre el SVG en Krita (Archivo → Abrir), por ejemplo `public/arte/cocina/guo_olla.svg`. Revisa que el lienzo quede del tamaño del archivo (Imagen → Propiedades): 1024 × 1024 px los objetos, 2000 × 2000 px el cuarto. Si Krita pregunta la resolución al importar, deja la que propone y corrige el tamaño a esos px.
2. El SVG queda como capa vectorial, donde no se puede pintar. Crea una capa de pintura nueva (tecla `Insert`) y pinta ahí, o convierte la del SVG: clic derecho → Convertir → Convertir en capa de pintura.
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

## El living comedor (客厅)

Mismo cuarto, misma proyección y misma paleta que la cocina. Archivos en `public/arte/living/` (o tu `.png` / `.webp` con el mismo nombre):

| Archivo | Qué muestra |
|---|---|
| `cuarto_living` | El cuarto entero (1000 × 1000 unidades, 2000 × 2000 px): piso, paredes con friso de salvia, ventana redonda, cuadro de bambú, reloj, alfombra, mueble con la tele (电视), sofá (沙发), la mesa de comedor con 4 sillas al centro y la planta. Sobre la mesa van fichas de colores **sin letras**: los hanzi los pone el juego encima |
| `mesa_arriba` | La mesa vista desde arriba (cuadrado de 1000 × 1000): tablero de madera con veta, nudos y canto, sin fichas. Es el fondo donde flotan las palabras |

Las medidas de los muebles están en `components/casa/living/lugares.ts` (`MUEBLES_LIVING`). De ahí salen también `MESA_LIVING` (el rectángulo del tablero en el cuadro de 1000: zona de toque y centro del zoom) y `PARADA_VACA` (dónde se para la vaca, a la izquierda de la mesa). Si mueves la mesa ahí y corres `npm run arte:generar`, el dibujo y el juego se mueven juntos. Si repintas `cuarto_living` en Krita, deja la mesa donde está.

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
| wan | `zanahoria` | Trocitos de zanahoria sobre el arroz (la receta de 米饭) | lleno |
| wan | `mugre` | Granos pegados | sucio |
| guo (olla) | `olla` | La olla con sus asas | siempre |
| guo | `arroz` | El arroz cocido asomando | cocido |
| guo | `zanahoria` | Trocitos de zanahoria en el arroz | cocido |
| guo | `mugre` | Restos pegados | sucio |
| chahu (tetera) | `tetera` | La tetera | siempre |
| kuaizi (palillos) | `palillos` | Los dos palillos | siempre |
| kafeibei (taza) | `taza` | La taza de café vacía | siempre |
| kafeibei | `cafe` | El café dentro de la taza | cafe |
| kafeibei | `mugre` | Restos de café en el fondo | sucio |
| deng (lámpara) | `lampara` | La lámpara colgando del techo | siempre |
| deng | `luz` | El brillo de la ampolleta | encendida |
| chuanghu (ventana) | `marco` | El marco de la ventana | siempre |
| chuanghu | `vidrio` | Los vidrios cerrados | cerrada |
| chuanghu | `abierta` | Las hojas abiertas hacia afuera | abierta |
| chuanghu | `pajaro` | El pájaro que entra y se posa en el marco | abierta, solo durante la animación de 打开 |
| lajitong (basurero) | `tarro` | El tarro | siempre |
| lajitong | `tapa` | La tapa (se levanta y baja al abrir) | siempre |
| yizi (silla) | `silla` | La silla junto a la mesa | siempre |
| zhuozi (mesa) | `zona` | Zona de toque invisible sobre la mesa (no se dibuja nada) | siempre |
| shouji (teléfono) | `telefono` | El teléfono, encima del refri | siempre |
| mao (gato) | `cola` | Solo la cola, asomando en su escondite (refri, mesa o ventana abierta) | escondido |
| mao | `gato` | El gato entero, con brillos, cuando lo encuentras | encontrado (`visto`) |

## El refri por dentro y la receta (primer plano)

Mismo formato que las capas (cuadrado, `public/arte/cocina/<nombre>.svg`, o tu `.png` / `.webp` con el mismo nombre). Se registran en `ARTE_REFRI`, `ARTE_REFRI_FONDO` y `ARTE_RECETA` (`components/casa/arte/registro.ts`).

| Archivo | Qué muestra |
|---|---|
| `refri_interior` | El refri abierto de frente: estantes de vidrio y abajo el cajón 水果. Las comidas se ponen encima, en tres estantes |
| `refri_<comida>` | Cada comida de frente, en su cuadro: `pingguo`, `xiangjiao`, `xigua`, `caomei`, `huluobo`, `xihongshi`, `tudou`, `xilanhua`, `mogu`, `niunai`, `jidan`, `mianbao`, `mi` |
| `refri_jarro` | El jarro de 水 de la receta (米 y 胡萝卜 usan `refri_mi` y `refri_huluobo`) |

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
