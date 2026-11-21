# Menú, juegos listos arriba y piezas con forma de puzzle

Fecha: 16 nov. 2026 · Estado: borrador para aprobar

## Para qué

Que quien llega desde TikTok **juegue en el primer segundo**, sin botones de por medio, y que pueda moverse por la web con un menú. Hoy la cocina está tapada por una tarjeta "▶ Jugar", el puzzle vive solo en `/puzzle` y no hay menú.

## Lo que pidió la dueña

1. Menú arriba con botones (Casa, Sobre nosotros, etc.).
2. La casa jugable de inmediato, sin apretar "Jugar".
3. El puzzle también arriba y listo para jugar, con piezas que parezcan de puzzle (con la forma).
4. Cómo conviven los dos juegos: **pestañas en la misma ventana** (opción A, elegida).

## Enfoques considerados (para los dos juegos arriba)

- **A. Pestañas en la ventana** (elegida): limpio en celular, un juego a la vez, la ventana no crece.
- B. Lado a lado / uno bajo otro: en celular el puzzle queda fuera de la primera pantalla.
- C. Un juego según el día o el video de origen: impredecible; la persona no elige.

## Diseño

**Menú (todas las páginas: portada, `/puzzle`, `/sobre`)** — mi propuesta
- Barra arriba, fija al hacer scroll, con la marca a la izquierda ("chino con la vaca" + vaca chica) y los enlaces: **Cocina · Puzzle · Método · Sobre nosotros**.
- Cocina y Puzzle abren la pestaña correspondiente en la ventana de la portada (`/?juego=cocina`, `/?juego=puzzle`) y bajan hasta ella. Método baja a `#metodo`.
- En celular: los cuatro enlaces en una fila con íconos y texto corto, sin menú hamburguesa (un toque menos). Debe caber a 360 px.

**Sobre nosotros (`/sobre`)** — mi propuesta
- Página corta: qué es el canal, el Método Jìn, la promesa honesta ("ser tus primeras 0-50 horas", nunca "aprende chino en TikTok"), la vaca, contacto niu@chinoconlavaca.com y enlace a TikTok.
- Texto escrito por mí siguiendo el enfoque de ventas de CLAUDE.md; la dueña lo corrige.

**Pestañas en la ventana**
- La barra de la ventana pasa a tener dos pestañas: `🍳 厨房 chú fáng` y `🧩 拼图 pīn tú` (sin español dentro de la ventana, como hoy). Se mantiene el botón 全屏.
- Pestaña por defecto: cocina. `?juego=puzzle` abre el puzzle. Se recuerda la última pestaña del visitante (localStorage, con try/catch).
- `/puzzle` sigue existiendo como página propia (enlace directo desde TikTok), ahora con el menú.
- La sección "Elige tu juego" se queda; sus botones cambian de pestaña y suben a la ventana en vez de navegar.

**La casa sin "Jugar"**
- Se quita la tarjeta de entrada. La cocina se ve y responde desde el inicio.
- El primer toque en la ventana hace lo que hacía "Jugar" (desbloquea el audio de iOS, música, la vaca saluda con 你好) **y además** la acción tocada (tocar un objeto lo nombra). Los navegadores no dejan sonar audio antes de un toque: no hay forma de evitarlo.
- El botón "Jugar ahora" del texto de la portada queda, pero solo baja a la ventana.
- Eventos: `entrar` se registra en ese primer toque.

**El puzzle listo para jugar**
- En la pestaña (y en `/puzzle`) abre directo en el **siguiente nivel pendiente** (el primero para quien llega nuevo), no en el mapa. El mapa queda a un botón.
- El primer toque desbloquea el audio igual que en la cocina.
- Vasos de leche, etapas y temas: sin cambios.

**Piezas con forma de puzzle**
- Cada pieza tiene una pestaña redonda a la derecha y un hueco a la izquierda; la primera de la frase tiene el borde izquierdo liso y la última el derecho, así al ordenarlas **encajan visualmente**.
- Los espacios vacíos de la frase muestran el contorno con la misma forma.
- Se mantienen: color por rol, pinyin con color de tono, tamaños de toque, arrastrar y tocar.
- Forma dibujada en código (SVG o máscara CSS); sin imágenes externas.

## Metas, no-metas, anti-metas

- Metas: jugar en el primer toque; menú en todas las páginas; piezas que encajan.
- No-metas: rediseñar la portada entera; nuevas secciones aparte de `/sobre`; cambiar la economía del puzzle.
- Anti-metas: que el menú tape la ventana del juego en celular; español dentro de la ventana; que la primera pantalla en celular deje de mostrar el juego.

## Lo que queda al constructor

- Cómo se dibuja la forma (SVG por pieza vs. máscara CSS) y cómo se adapta al ancho variable de cada pieza.
- Cómo el Puzzle se ajusta al tamaño de la ventana (hoy es una página completa).
- Íconos exactos del menú.
