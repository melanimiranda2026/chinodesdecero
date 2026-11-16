# Menú, juegos listos arriba y piezas con forma de puzzle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menú en todas las páginas, cocina y puzzle jugables al instante en pestañas de la ventana de la portada, página `/sobre`, y piezas del puzzle con pestaña y hueco que encajan.

**Architecture:** Next 15 App Router + CSS Modules (lo que ya usa el repo). La forma de la pieza es un SVG medido con ResizeObserver y una función pura que arma el `path`. La pestaña activa vive en `Portada` y se cambia desde el menú y las tarjetas con un evento de ventana. La tarjeta de entrada de la casa desaparece: el primer `pointerdown` dentro de la casa llama a `entrar()`.

**Tech Stack:** Next 15.5, React 19, TypeScript, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-16-menu-pestanas-piezas-design.md`

## Global Constraints

- Dentro de la ventana del juego no hay español: pestañas `🍳 厨房 chú fáng` y `🧩 拼图 pīn tú`.
- Menú: **Cocina · Puzzle · Método · Sobre nosotros**; en celular una fila con íconos y texto corto ("Nosotros"), sin hamburguesa, cabe a 360 px, alto ≤ 48 px.
- La primera pantalla en celular debe seguir mostrando la ventana del juego.
- `/puzzle` sigue existiendo como página propia.
- localStorage siempre dentro de try/catch; la página funciona sin él.
- Sin imágenes externas: formas dibujadas en código.
- Copy en español: segunda persona, cercano; "reconoces", no "entiendes"; nunca "aprende chino en TikTok".
- Correr desde la raíz: `npx vitest run`, `npx tsc --noEmit -p .`, `npx eslint .`, `npx next build`.

## Review Focus

1. Pieza muy baja o angosta (p. ej. `.chica`, 30 px de alto): el radio de la pestaña se achica, el path nunca se cruza → test en Task 1.
2. Navegador sin ResizeObserver (jsdom, navegadores viejos): la pieza conserva el borde rectangular de hoy → test en Task 1.
3. localStorage que lanza (modo privado) o `?juego=` con valor raro: se abre la cocina, sin errores → test en Task 4.
4. Quien ya ganó los 18 niveles abre el puzzle: no hay "siguiente nivel", se muestra el mapa → test en Task 2.
5. Llega desde el correo con `?enlace=fallo` o `?bienvenida=1`: el aviso se sigue viendo aunque ya no exista la tarjeta de entrada → test en Task 3.

---

### Task 1: Forma de pieza de puzzle

**Files:**
- Create: `components/puzzle/forma.ts`, `components/puzzle/FormaPieza.tsx`
- Modify: `components/puzzle/Pieza.tsx` (CaraPieza incluye `<FormaPieza />`), `components/puzzle/Ronda.tsx:269` (el hueco vacío lleva `<FormaPieza hueco />`), `components/puzzle/Puzzle.module.css` (`.pieza`, `.hueco`, fila de huecos)
- Test: `tests/puzzle/forma.test.ts`, `tests/puzzle/Puzzle.test.tsx`

**Interfaces:**
- Produces: `caminoPieza(w: number, h: number, r?: number): string` (r por defecto 8, esquinas 10); `<FormaPieza hueco?: boolean />` (SVG `aria-hidden`, absoluto, `inset: 0`, `overflow: visible`); el elemento `.pieza` padre recibe `data-forma` cuando ya midió.

Todas las piezas iguales (mi decisión, para no delatar cuál va primera o última): **pestaña semicircular hacia afuera en el borde derecho, hueco semicircular hacia adentro en el izquierdo**, ambos centrados en vertical. Path en sentido horario desde arriba a la izquierda; pestaña derecha `A r r 0 0 1 w h/2+r`, hueco izquierdo `A r r 0 0 0 0 h/2-r`. El relleno y el borde (3 px, `var(--tinta)`, o rojo en `.esPregunta`) pasan al SVG cuando hay `data-forma`; sin `data-forma` se queda el CSS rectangular de hoy. En la fila de la frase los huecos se juntan (gap 0, solapados `r` px) para que las piezas colocadas encajen; en la bandeja el espaciado queda como está. El hueco vacío usa la misma silueta con trazo punteado.

- [ ] **Step 1: Tests de `caminoPieza`**: `caminoPieza(100, 50, 8)` empieza con `"M"`, contiene `"A 8 8 0 0 1 100 33"` y `"A 8 8 0 0 0 0 17"`; `caminoPieza(60, 24)` usa un radio ≤ (24 − 2·10)/2 = 2 (no contiene `"A 8 8"`) y no da `NaN`; `caminoPieza(0, 0)` devuelve `""`.
- [ ] **Step 2:** `npx vitest run tests/puzzle/forma.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** Implementar `caminoPieza` y `FormaPieza` (ResizeObserver sobre el SVG; si `typeof ResizeObserver === "undefined"` no pinta nada y no pone `data-forma`).
- [ ] **Step 4: Test en `Puzzle.test.tsx`** "sin ResizeObserver las piezas se ven y se pueden tocar": las piezas de la bandeja siguen con su nombre accesible (`nombrePieza`) y ninguna tiene `data-forma`.
- [ ] **Step 5:** `npx vitest run tests/puzzle` → PASS (incluidas las pruebas viejas del puzzle).
- [ ] **Step 6:** Commit `feat(puzzle): piezas con forma de puzzle que encajan`.

### Task 2: Puzzle listo para jugar y modo ventana

**Files:**
- Modify: `components/puzzle/Puzzle.tsx`, `app/puzzle/page.tsx`
- Test: `tests/puzzle/Puzzle.test.tsx`

**Interfaces:**
- Produces: `Puzzle({ ventana?: boolean })`. `ventana` = dentro de la pestaña de la portada: no muestra la flecha "volver" ni el `h1` (la pestaña ya lo dice), no llama `window.scrollTo`, y al desmontarse solo llama `callar()` (no `musica.parar()`, la música es la misma de la cocina).

Pantalla inicial (en página y ventana): si `siguienteNivel(ganados)` existe, `{ tipo: "ronda", tema, etapa, frase: 0, errores: 0, gratis: false }` directo, **sin la Nota** (la Nota sigue apareciendo al elegir un nivel desde el mapa). Si es `null`, el mapa. El primer `pointerdown` dentro del juego llama `entrarAudio()`.

- [ ] **Step 1: Tests**: "abre directo en la primera ronda" (sin avance guardado: se ven la bandeja `aria-label="Piezas"` y las piezas de `TEMAS[0].frases[0]`; no se ve el título de la Nota); "con los 18 niveles ganados abre el mapa"; "en modo ventana no hay enlace Volver al inicio".
- [ ] **Step 2:** `npx vitest run tests/puzzle/Puzzle.test.tsx` → los tres FAIL.
- [ ] **Step 3:** Implementar. Ajustar las pruebas viejas que esperaban partir en el mapa (entrar al mapa con el botón "Salir al mapa").
- [ ] **Step 4:** `npx vitest run tests/puzzle` → PASS.
- [ ] **Step 5:** Commit `feat(puzzle): abre listo para jugar y modo ventana`.

### Task 3: La casa sin tarjeta de entrada

**Files:**
- Modify: `components/casa/Casa.tsx` (quitar capa `"entrada"`, `pointerdown` en captura sobre la raíz → `entrar()`), `components/casa/Tarjetas.tsx` (quitar el bloque `capa === "entrada"` y `alEntrar`), `components/casa/Casa.module.css` (estilo del aviso)
- Test: `tests/casa/*.test.tsx`, `tests/pagina/Portada.test.tsx`

**Interfaces:**
- Consumes: `ControlCasa.entrar()` (sin cambios: sigue siendo idempotente; Portada lo sigue llamando desde "Jugar ahora").
- Produces: el aviso del enlace se muestra como `<p role="status">` arriba dentro de la casa, con botón `aria-label="Cerrar"` (✕) y se cierra solo a los 8 s. Helper de pruebas `tests/casa/entrar.ts`: `entrarCasa()` = `fireEvent.pointerDown` sobre `[data-casa]` (o el selector raíz que ya usa la casa).

`entrar()` se ejecuta en el `pointerdown` en fase de captura, así el mismo toque además llega al objeto (lo nombra) o a la vaca. `registrar("entrar")` igual que hoy.

- [ ] **Step 1: Tests**: "se puede tocar un objeto sin apretar Jugar" (no existe botón "Jugar"; un toque en un objeto lo nombra/abre como hoy tras entrar); "el primer toque desbloquea el audio y la vaca saluda" (mock de `desbloquearAudio` llamado una vez tras dos toques); "con aviso, se ve arriba y se cierra con ✕".
- [ ] **Step 2:** `npx vitest run tests/casa` → FAIL.
- [ ] **Step 3:** Implementar. Reemplazar en las pruebas existentes cada `fireEvent.click(screen.getByRole("button", { name: "Jugar" }))` por `entrarCasa()`.
- [ ] **Step 4:** `npx vitest run tests/casa tests/pagina` → PASS.
- [ ] **Step 5:** Commit `feat(casa): jugable de inmediato, sin tarjeta de entrada`.

### Task 4: Pestañas cocina / puzzle en la ventana

**Files:**
- Create: `components/pagina/juego.ts`
- Modify: `components/pagina/Portada.tsx`, `components/pagina/portada.module.css`, `components/pagina/Minijuegos.tsx`
- Test: `tests/pagina/juego.test.ts`, `tests/pagina/Portada.test.tsx`

**Interfaces:**
- Produces (`juego.ts`): `type Juego = "cocina" | "puzzle"`; `EVENTO_JUEGO = "cdc:juego"`; `CLAVE_JUEGO = "cdc:juego"`; `juegoInicial(search: string, guardado: string | null): Juego` (prioridad: `?juego=` válido → guardado válido → `"cocina"`); `elegirJuego(j: Juego): void` (guarda en localStorage con try/catch, `history.replaceState` con `?juego=j` manteniendo el hash, despacha `CustomEvent(EVENTO_JUEGO, { detail: j })`, y hace scroll suave a `#juegos`).
- Consumes: `Puzzle({ ventana: true })` (Task 2).

La ventana pasa a `id="juegos"`. La barra muestra dos pestañas (`role="tablist"`, cada una `role="tab"` con `aria-selected`) con hanzi + pinyin, y el botón 全屏. La casa queda montada y oculta (`hidden`) al ir al puzzle, para no perder su estado; el puzzle se monta al elegirlo. Al cambiar de pestaña se llama `callar()`. Las tarjetas de "Elige tu juego" llaman `elegirJuego` en vez de navegar (el puzzle conserva `href="/puzzle"` como respaldo y hace `preventDefault`).

- [ ] **Step 1: Tests de `juegoInicial`**: `("?juego=puzzle", null)` → `"puzzle"`; `("?juego=xyz", "puzzle")` → `"puzzle"`; `("", "basura")` → `"cocina"`; `("", null)` → `"cocina"`. Test de `elegirJuego` con `localStorage.setItem` que lanza: no lanza y despacha el evento.
- [ ] **Step 2: Tests en `Portada.test.tsx`**: hay un `tablist` con dos tabs y "厨房" seleccionada; clic en "拼图" muestra la bandeja del puzzle y deja la casa `hidden`; con `?juego=puzzle` en la URL arranca en el puzzle; un `CustomEvent(EVENTO_JUEGO, { detail: "puzzle" })` cambia la pestaña.
- [ ] **Step 3:** `npx vitest run tests/pagina` → FAIL.
- [ ] **Step 4:** Implementar.
- [ ] **Step 5:** `npx vitest run tests/pagina tests/puzzle tests/casa` → PASS.
- [ ] **Step 6:** Commit `feat(portada): pestañas cocina y puzzle en la ventana`.

### Task 5: Menú en todas las páginas y `/sobre`

**Files:**
- Create: `components/pagina/Menu.tsx`, `components/pagina/menu.module.css`, `app/sobre/page.tsx`, `components/pagina/Sobre.tsx`
- Modify: `app/layout.tsx` (Menu arriba de `{children}`), `components/pagina/contenido.ts` (`MENU`, `SOBRE`), `components/pagina/Pie.tsx` (enlace a `/sobre` si hay lista de enlaces)
- Test: `tests/pagina/menu.test.tsx`, `tests/pagina/secciones.test.tsx`

**Interfaces:**
- Consumes: `elegirJuego` (Task 4).
- Produces: `<Menu />` (`<nav aria-label="Principal">`), `SOBRE` en `contenido.ts`.

Menú fijo arriba (`position: sticky; top: 0`), izquierda la vaca chica (`Adorno dibujo="vaca"`) + `PORTADA.marca` enlazando a `/`. Enlaces: `🍳 Cocina` → `/?juego=cocina#juegos`, `🧩 Puzzle` → `/?juego=puzzle#juegos`, `浸 Método` → `/#metodo`, `🐄 Sobre nosotros` (en < 480 px el texto es "Nosotros") → `/sobre`. Si ya estás en `/`, Cocina y Puzzle hacen `preventDefault` + `elegirJuego`. En modo 全屏 el menú queda debajo de la ventana (z-index menor). `/puzzle` conserva su barra propia (vasos) debajo del menú.

Copy de `/sobre` (exacta; la dueña la corrige después):
- Título: "Sobre nosotros"
- "Somos un canal de TikTok que enseña chino mandarín a hispanohablantes. La profe es una vaca dibujada a crayón que solo habla chino."
- "Aprender chino es fácil si eres estratégico. Por eso usamos el **Método Jìn 浸** («sumergirse»): escuchas primero, la imagen te dice qué significa y repasas en días distintos. Aquí hacemos los repasos por ti."
- "Nuestra promesa es honesta: ser tus primeras 50 horas de chino y llevarte a practicar fuera de TikTok."
- "¿Ideas o preguntas? Escríbenos a niu@chinoconlavaca.com." (usar `CONTACTO_PRIVACIDAD` de `Correo.tsx`, enlace `mailto:`)
- Botones: "Jugar ahora" → `/#juegos`, y "Síguenos en TikTok" → `SIGUENOS.url`.
- `metadata`: título "Sobre nosotros · Chino desde cero".

- [ ] **Step 1: Tests**: el menú tiene 4 enlaces con esos `href`; en `/` (mock de `location.pathname`) clic en "Puzzle" llama `elegirJuego("puzzle")` y no navega; `Sobre` muestra el título, `niu@chinoconlavaca.com` como `mailto:` y el enlace a TikTok; el texto no contiene "aprende chino en TikTok".
- [ ] **Step 2:** `npx vitest run tests/pagina` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Verificación completa: `npx vitest run`, `npx tsc --noEmit -p .`, `npx eslint .`, `npx next build` (aparece `○ /sobre`) → todo verde.
- [ ] **Step 5:** Revisión visual con `npm run dev` a 360 px y a 1280 px: menú en una fila, ventana del juego visible en la primera pantalla del celular, piezas encajando, pestañas funcionando.
- [ ] **Step 6:** Commit `feat: menú en todas las páginas y página Sobre nosotros`.
