# Minijuego "El puzzle" (primera iteración)

Fecha: 16 nov. 2026 · Estado: aprobado en conversación ("hazlo, no me preguntes más")

## Para qué es

La página pasa a ser un **centro de minijuegos para aprender chino**. La cocina es el primero; el puzzle es el segundo. El puzzle toma la serie de TikTok "El chino es un puzzle" y la vuelve jugable: la persona **ordena las piezas de la frase** (arrastrando con mouse o dedo, o tocando). Practica el orden de la frase, las preguntas con palabra de pregunta, las de sí o no (吗), el pasado (了 / 过), el 没 y el futuro (明天).

La razón de la dueña para los vasos: **que la gente tenga motivos para volver** (además sirve al repaso espaciado del método).

## Metas, no-metas, anti-metas

**Metas**
- Página propia `/puzzle` (link directo desde TikTok) y una sección "Minijuegos" en la portada con dos tarjetas: cocina y puzzle.
- 6 temas × 3 etapas = 18 niveles, de 3 a 4 frases cada uno.
- El español se retira: etapa ① con español, ② menos, ③ cero.
- Vasos de leche como energía diaria.

**No-metas (después)**
- Rediseño completo del centro de minijuegos (cuando haya más juegos).
- Sincronizar el avance del puzzle con la cuenta (Supabase). En esta iteración vive en el navegador.
- Comprar vasos con plata (queda el lugar pensado).
- Piezas trampa (distractores) y audio lento.

**Anti-metas**
- Que se vea difícil. Como en los videos: "el chino es lógico, por eso es fácil". Sin "la trampa", sin errores grabados en audio.
- Que quedarse sin vasos se sienta como perder: nunca aparece "perdiste".
- Español en la etapa ③.
- Imágenes sacadas de redes.

## Decisiones de la dueña

- **Mecánica:** la persona ordena el puzzle moviendo las piezas.
- **Vasos (opción C):** energía diaria. **El error gasta un vaso.** **Dejar el correo llena todos los vasos** (una vez).
- **Temas, en este orden:** orden → preguntas (谁 / 什么时候 / 在哪里 / 什么) → 吗 → pasado (了 / 过) → 没 → futuro (明天).
- **Etapas:** con español → menos → cero. En la etapa sin español, la vaca dice la frase y un dibujo la muestra.
- **Arquitectura A:** cada juego con su dirección; la portada enlaza.

## Approaches

- **A. Cada juego con su propia dirección (elegida).** `/puzzle` como página propia, comparte vaca, tonos, sonidos y guardado. Link directo desde TikTok, carga liviana, cada juego nuevo es una página más.
- **B. Todo en la ventana de la portada, con pestañas.** Una sola página, pero no se puede enlazar directo y la portada carga todo.
- **C. Motor genérico de minijuegos primero.** Construye para juegos que no existen; mejor que la base común salga del segundo juego real.

## Cómo funciona

### Ronda
- La fila tiene un hueco por pieza. Las piezas aparecen desordenadas abajo.
- **Arrastrar** una pieza a un hueco, o **tocarla** (va al primer hueco libre desde la izquierda; sirve también con teclado).
- Si la pieza va ahí (según algún orden válido de la frase), encaja con un pop. Si no, rebota a su lugar, la vaca pone cara de sorpresa y **se vacía un vaso**.
- Algunas frases aceptan dos órdenes (今天我… y 我今天…): ambos valen.
- Al completar: la vaca dice la frase (audio natural del banco), la fila brilla y aparece el botón para seguir. En 吗 la vaca además responde (喝！ / 不喝！ / 吃！).

### Etapas
| Etapa | Antes de armar | Bajo cada pieza | Al terminar |
|---|---|---|---|
| ① Con español | Nota del tema (una regla, en español) al entrar al nivel. La frase en español como pista. | Rol (quién, cuándo…) + traducción | La vaca dice la frase |
| ② Menos español | Dibujo de la escena + la vaca dice la frase | Solo el rol | La vaca la dice; aparece la traducción |
| ③ Solo chino | Dibujo + la vaca dice la frase | Nada (hanzi y pinyin) | La vaca la dice. Sin español en el juego |

El pinyin va siempre, con los colores de tono fijos.

### Desbloqueo
- Dentro de un tema, las etapas se abren en orden.
- Un tema se abre al ganar la etapa ① del anterior (para que quien llega del video del 没 no tenga que pasar 15 niveles).
- Repetir un nivel ya ganado **no gasta vasos** (repaso libre).

### Vasos de leche
- 5 vasos. Cada error vacía uno. Se recarga 1 cada 4 horas.
- Un nivel sin errores devuelve 1 vaso (hasta 5).
- Sin vasos, a mitad de un nivel: la vaca se toma el último vaso, aparece la cuenta regresiva y lo que no gasta vasos: repasar niveles ganados, ir a la cocina, y (una vez) dejar el correo para llenarlos todos.

## Contenido

Audios del banco del proyecto padre (`video/public/audio/banco/`), copiados a `public/audio/puzzle/`. Nuevos (ElevenLabs, Yating Lin, medidos con `medir-tono.mjs`): 我没喝咖啡, 我没吃苹果, 我明天吃苹果, 我明天喝咖啡, 你明天吃什么. Se agregan a `docs/audios.md` para la revisión de un nativo (regla del canal).

| Tema | Frases |
|---|---|
| Orden | 我吃苹果 · 我喝咖啡 · 我今天在家吃苹果 · 我今天在家喝咖啡 |
| Preguntas | 谁今天在家吃苹果？ · 你什么时候在家吃苹果？ · 你今天在哪里吃苹果？ · 你今天在家吃什么？ |
| 吗 | 你喝咖啡吗？ · 你喝牛奶吗？ · 你吃苹果吗？ |
| Pasado | 我吃了 · 你吃了吗？ · 我吃过汉堡 · 我吃过披萨 |
| 没 | 我没吃 · 我没喝咖啡 · 我没吃苹果 |
| Futuro | 我明天吃苹果 · 我明天喝咖啡 · 你明天吃什么？ |

## Mis decisiones (para revisar)

- Tocar una pieza la manda al primer hueco libre: el dedo y el teclado juegan sin arrastrar.
- Repasar niveles ganados no gasta vasos.
- Si ya dejó el correo antes (en la cocina), el panel sin vasos ofrece llenarlos con ese correo, una sola vez.
- Avance del puzzle en el navegador (`cdc.puzzle.v1`); la sincronía con la cuenta queda para después.
- Eventos nuevos: `abrir_minijuego`, `puzzle_nivel_inicio`, `puzzle_nivel_completo`, `puzzle_sin_vasos`, `puzzle_vasos_correo`.
- Música: la de la cocina, baja bajo el mandarín como siempre.
