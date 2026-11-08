# Chino desde cero: página web con la casa interactiva (v1)

Fecha: 8 nov. 2026 · Estado: revisado, para aprobar

## Para qué es

La página es el punto de llegada de las redes sociales (TikTok sobre todo). Los leads que llegan desde un video deben quedarse aquí. Tiene tres trabajos, en este orden:

1. **Mostrar la metodología** (el **Método Jìn 浸**, "sumergirse") haciéndola vivir, no explicándola.
2. **Dar acceso a material** para aprender chino.
3. **Capturar el correo** de quien quiere más (más habitaciones de la casa).

La idea central es una **casa interactiva**: cuartos con objetos donde la gente aprende mandarín por interacción, inmersión e input comprensible. La vaca (mascota del canal) dice el nombre de lo que tocas y narra en chino lo que hace. Se juega con el dedo, como un juego de cocina.

La pedagogía sale de `../Cómo se aprende chino en TikTok.md` y del `CLAUDE.md` del proyecto padre (`chino tiktok/`): sonido primero, significado por la imagen, recuperación fácil de acertar, colores de tono fijos.

## Metas, no-metas y anti-metas

**Metas de la v1**
- La cocina jugable completa (demo gratis), igual en mecánica y estética al prototipo aprobado.
- Página integrada alrededor de la casa, con la misma estética.
- Captura de correo: anota a la persona para los cuartos nuevos ("pronto") y guarda su avance.
- Analítica de qué se toca y dónde se cae la gente.
- Deploy en Vercel, funcionando en celular vertical y en computador.

**No-metas (después)**
- Pagos y escenarios grandes de pago (doctor, oficina, etc.). Solo se deja el lugar pensado.
- **Dormitorio, living y baño jugables.** En la v1 solo existe la cocina (decisión de la dueña).
- Versión en otros idiomas.

**Anti-metas (si pasa esto, falló aunque funcione)**
- Español dentro de la casa. Fuera de la casa (página, tarjetas, formularios) sí hay español; **dentro, ninguna traducción**: el significado lo carga la imagen.
- Un minijuego que se pueda perder o frustre. Se gana siempre; el reloj solo decide la medalla.
- Audio en mandarín publicado sin revisión de un nativo (regla no negociable del canal).
- Imágenes, fondos o stickers sacados de TikTok, Pinterest u otras redes. Todo se dibuja en código o lo generamos nosotros.
- Recrear un juego existente (su nombre, personajes, arte o interfaz). Se toman recursos genéricos del género (primer plano, cartel de paso, barra, reloj, medalla), con identidad propia.
- Prometer "aprende chino en TikTok" o "entiendes": se dice "reconoces". Ver "Enfoque de ventas" en el `CLAUDE.md` padre.

## La referencia: el prototipo aprobado

`docs/prototipo/index.html` (prototipo desechable; ábrelo directo en el navegador). Es la referencia de **mecánica y estética**, no código a conservar: se reescribe limpio.

## Estructura de la página

Una sola página que se recorre hacia abajo:

1. **La casa (arriba, jugable de inmediato).** Al entrar aparece por un momento "Método Jìn 浸" con su línea de tono (4.º tono, azul), y un toque para entrar (también desbloquea el audio del navegador). La casa ocupa la pantalla.
2. **Cómo funciona el Método Jìn.** Breve. Tres ideas: escuchas primero, la imagen te dice qué significa, repites jugando. Con prueba atribuida si se cita un estudio ("según un estudio…" + fuente en letra chica).
3. **Material gratis.** Hoy no hay material descargable: la sección muestra tarjetas "pronto" (mazos de Anki por bloque de videos) y pide el correo. Pensada para que agregar material después sea solo agregar una tarjeta.
4. **Síguenos.** Cuenta de TikTok **"chino comprensible"** (confirmar el @ exacto al construir). Miniaturas de videos que abren TikTok, no videos incrustados (pesan en el celular).
5. **Pie con el correo** para desbloquear la casa.

Toda la página usa la estética de la casa: crayón, contorno café `#4A2A1C`, papel mural con lunares, colores cálidos, sombras suaves. Los botones y el minimapa conservan un toque pixel (fuente tipo Silkscreen).

## La casa

### Cuartos
- **Cocina**: demo gratis, completa en la v1.
- **Dormitorio, living y baño**: aparecen en el minimapa con candado. Tocarlos muestra "pronto" y pide el correo para avisar cuando abran. Con correo, el candado cambia a "pronto" (ya está anotada).

### Vista y navegación
- Vista en tres cuartos (3/4): los muebles muestran cara de arriba y de adelante, con volumen y sombras; cada rincón tiene algo (repisas, frascos, plantas, alfombras), luz cálida desde la ventana. **Sin pixel art en el cuarto.**
- Minimapa chico en una esquina (2×2, íconos), cuarto actual destacado.
- Cámara con zoom: primer plano al elegir un objeto, más cerca durante la acción; botón ⤢ o tocar el piso para ver todo.

### Interacción (mecánica aprobada)
| Gesto | Qué pasa |
|---|---|
| Tocar un objeto | La vaca dice su nombre (杯子 bēizi). Globo con hanzi + pinyin en colores de tono. |
| Arrastrar la vaca al objeto, o el objeto a la vaca | 这是杯子 zhè shì bēizi + opciones de acción flotando (inspiración Life is Strange): ícono + hanzi + pinyin, sin español. |
| Elegir una acción | La vaca camina al lugar lógico. Si la acción tiene gesto, se abre el **primer plano**; si no, se anima en la casa. La vaca dice la frase (我喝水). |
| Después de la acción | Aparecen solas las opciones nuevas del objeto (comer → lavar…). |

**Las acciones son lógicas con el estado y el lugar.** Cada objeto tiene un estado y las opciones salen de él. Lavar ocurre en el lavaplatos, llenar en la llave, cocinar en el fogón. Ciclos de la cocina (los del prototipo):
- 盘子: con 饺子 → 吃饺子 → sucio → 洗 (lavaplatos) → limpio → en el 冰箱 abierto aparece 拿饺子.
- 苹果: sucia → 洗 → limpia → 吃 o 切 → cortada → 吃 → desaparece → en el 冰箱 aparece 拿苹果.
- 杯子: vacío → 倒水 (llave) o 倒茶 (茶壶) → 喝 → sucio → 洗.
- 锅 → 做饭 → con arroz → 盛饭 llena el 碗 → 吃饭 → 碗 y 锅 sucios → 洗.
- 冰箱: 打开 / 关上. 筷子: 拿.

### Primer plano: un gesto por verbo
Transición circular a pantalla completa, fondo con patrón según el lugar, cartel con el verbo, barra de avance, reloj, mano que enseña el gesto, vaca chica en la esquina que reacciona.

| Verbo | Gesto |
|---|---|
| 切 | deslizar 3 veces a través |
| 洗 | frotar en círculos (espuma, la mugre se borra) |
| 倒水 / 倒茶 | mantener apretado y soltar entre las líneas; si rebalsa, reintenta |
| 喝 | mantener apretado mientras la vaca toma |
| 做饭 | revolver en círculos, 3 vueltas |
| 吃 | tocar para dar mordiscos |

Al final: medalla según el tiempo (oro / plata / bronce) y la vaca dice 太棒了 tài bàng le / 很好 hén hǎo / 好 hǎo. No se puede perder.

### Minijuego de la cocina (quiz)
Botón 玩 wán. La vaca pide 给我 + objeto (el globo muestra solo "给我 ?": se reconoce de oído) y el jugador le arrastra el objeto. 4 rondas, fáciles. Al terminar, tarjeta breve en español sobre el Método Jìn ("lo acabas de hacer…") y luego la invitación a dejar el correo para abrir los otros cuartos.

### Texto en pantalla
- Hanzi + pinyin con marcas de tono, colores fijos de `video/src/tonos.ts` del proyecto padre (1 rojo `#E0473C`, 2 naranja `#E8930C`, 3 verde `#2E9B57`, 4 azul `#3A6FD6`, neutro gris `#8C8C8C`).
- Sandhi se muestra como bloque fijo donde el canal ya lo hace (你好 = ní hǎo, 很好 = hén hǎo).

## Audio

- **Voz de la vaca:** Yating Lin (ElevenLabs, ID `5eoK8NqMBsMdqUmImHNs`), la misma de los videos. El prototipo usa la voz del navegador solo como relleno; la v1 usa mp3 reales.
- Un mp3 por palabra y por frase de la cocina (nombres, 这是 + nombre, frases de acción, 给我 + nombre, 对 / 不对, 太棒了 / 很好 / 好, 你好). Antes de generar, buscar en el banco del proyecto padre (`video/public/audio/banco/`) y reutilizar. Lo nuevo se genera siguiendo `flujo-de-video.md` §14 y se mide con `video/scripts/medir-tono.mjs`.
- Vigilar erhua, sandhi del 3.er tono, 一 / 不, tono neutro.
- **Revisión del audio:** la regla del canal es que un nativo revise el mandarín antes de publicar. Para la v1 la dueña dio los audios por aprobados (8 nov. 2026); no se construye un bloqueo técnico. Se deja una lista de los audios usados (archivo, texto, pinyin) para que la revisión sea fácil cuando se haga.
- La vaca se anima solo por código (deslizarse, brincar, ojos, boca, orejas), como en el prototipo: no hay capas de caminar, comer ni beber. Poses nuevas, más adelante.
- La boca de la vaca se mueve al ritmo del audio (volumen medido, como en los videos).
- **Música por lugar y por acción**: generada con ElevenLabs como la de los videos (`compose_music`). En la v1: un tema para la cocina y uno corto por cada tipo de gesto del primer plano (6). Baja casi a cero mientras suena mandarín. Efectos de `video/public/sfx/`, nunca encima del mandarín.

## Correo y cuentas

- **Un solo paso:** al escribir el correo queda anotada al tiro (la página la reconoce en ese navegador). No se la manda a la bandeja de entrada para seguir: muchas llegan desde el navegador interno de TikTok, donde ese salto se pierde.
- Después llega un enlace mágico (sin contraseña) que sirve para recuperar el avance en otro dispositivo. Avance: estados de objetos, medallas, palabras escuchadas.
- **Consentimiento:** se usarán los correos para enviar novedades (cuartos nuevos, material, ofertas). El formulario lleva una casilla clara de consentimiento, no marcada por defecto, y cada correo un enlace para darse de baja (ley chilena 19.628 y buenas prácticas de LatAm). Sin consentimiento igual se guarda el avance, pero no se le envían novedades.
- Sin cuenta, el avance de la cocina se guarda en el navegador.
- Lugar pensado para pagos más adelante (un campo de "plan" en la cuenta), sin implementarlo.

## Analítica

Vercel Analytics para visitas (plan gratis). Los eventos propios se guardan en una tabla de Supabase para poder ver dónde se cae la gente: entrar a la casa, tocar objeto (cuál), abrir acciones, completar gesto (cuál, medalla), completar quiz, ver tarjeta del método, tocar cuarto bloqueado, dejar correo, clic a TikTok, descarga de material.

## Restricciones

- Deploy fácil en Vercel, repo `chinodesdecero`.
- Celular vertical primero (la mayoría llega desde TikTok) y computador. Sin scroll horizontal; zonas táctiles cómodas para el dedo.
- Todo el arte se dibuja en código (SVG a crayón, filtros `crayon` y `crayon-relleno` de `video/src/Texto.tsx`) o viene de `mascota/` (capas de la vaca, borde blanco de sticker por código). Los assets se copian al repo de la web; no se enlazan al proyecto padre.
- Fuentes: ZCOOL KuaiLe (hanzi), Nunito (texto y pinyin), Silkscreen (detalles pixel de la interfaz).

## Decisiones mías (para revisar)

- **Stack:** Next.js (App Router) + TypeScript en Vercel. La casa es un componente cliente; la página que la rodea, estática.
- **Cuentas y correo:** Supabase (enlace mágico + tabla de avance). Es lo más simple que cubre a la vez la captura de correo y el guardado de avance, con plan gratis.
- **Pixel art fuera del cuarto:** solo en botones y minimapa.
- **Desbloqueo inmediato al escribir el correo**, enlace mágico solo para cambiar de dispositivo.
- **Eventos en Supabase** (no en Vercel Analytics, cuyos eventos propios son de pago).
- **Música con ElevenLabs:** una por cuarto y una por tipo de gesto.
- **Vaca animada solo por código** en la v1.
- **TikTok con miniaturas**, no incrustado.
- **En el celular vertical** la cocina se encuadra con la cámara (más zoom y paneo) en vez de achicarse entera; el primer plano ya ocupa toda la pantalla.

## Queda en manos de quien construye

- Arquitectura interna del juego (motor de estados, componentes, si usa SVG, canvas o mezcla).
- Diseño exacto de cada sección de la página dentro de la estética definida.
- Detalle visual de cada gesto y animación, mientras respete la tabla de gestos.
- Herramientas de prueba y estructura de carpetas.
