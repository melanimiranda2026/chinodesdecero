# Living comedor y "Tus primeras palabras" — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir el 客厅 en el minimapa: un living isométrico donde la vaca camina a la mesa, la cámara entra a la mesa vista desde arriba con 50 palabras flotando, y cada palabra abre una ficha con su técnica para recordarla.

**Architecture:** El living es un componente propio (`components/casa/living/`) que `CasaVista` muestra en lugar del mundo de la cocina cuando `cuarto === "living"`. No se generaliza `useCasa` (que sigue siendo de la cocina): el living tiene su propio estado chico (dónde está la vaca, mesa abierta, ficha abierta). Las palabras abiertas viven en el avance (`palabras: string[]`) y las guarda `Casa`, igual que `escuchadas`.

**Tech Stack:** Next 15, React 19, TypeScript, CSS modules, Vitest + Testing Library, Playwright (smoke), arte SVG generado por `scripts/arte-iso.ts`.

**Spec:** `docs/superpowers/specs/2026-11-19-living-primeras-palabras-design.md`

## Global Constraints

- Celular primero: todo debe verse y tocarse a **360 px** de ancho sin scroll horizontal de la página.
- Colores de tono solo desde `lib/tonos.ts` (`COLOR_TONO`).
- Español **solo** dentro de la mesa y la ficha; el living (cuarto, botones, aria-labels) va en chino o íconos, como la cocina.
- La vaca siempre dice la palabra al abrirla (lenta y luego natural cuando hay toma lenta). Sin voz (mudo o error) la ficha se abre igual.
- Audio solo de tomas existentes: nada se genera en ElevenLabs.
- Arte generado por código, una capa por archivo, sin `transform-origin` en los SVG; un PNG/WebP con el mismo nombre gana (manifiesto).
- Nunca imágenes descargadas.
- El living se abre gratis, sin correo. Dormitorio y baño siguen cerrados (🔒/⏳ como hoy).
- Abrir una palabra en la mesa **no** cuenta como palabra ganada del puzzle.
- Nada de "inventa tu historia".

## Review Focus

1. **50 fichas a 360 px:** la mesa no tapa nada y cada ficha se puede tocar (mín. 44 px); si no caben, la mesa se desplaza en vertical dentro de su caja → test en Task 6 (las 50 están en el DOM y son botones) + smoke e2e a 360 px en Task 9.
2. **Avance viejo sin `palabras`:** carga sin perder nada y `palabras` queda `[]`; ids desconocidos se descartan → test en Task 2.
3. **Pestaña oculta con la mesa o la ficha abiertas** (portada cambia a 🧩): la ficha se cierra y no suena nada → test en Task 8.
4. **Tocar otra ficha mientras la vaca habla:** la voz anterior se corta (`decir` ya corta) y la ficha nueva reemplaza a la vieja, sin dos fichas → test en Task 6.
5. **Lámpara de la cocina apagada:** el living no hereda la oscuridad ni el botón 玩 / ⤢ de la cocina → test en Task 8.

---

### Task 1: Las 50 palabras y sus audios

**Files:**
- Create: `components/casa/living/palabras.ts`
- Create: `public/audio/palabras/*.mp3`
- Modify: `docs/audios.md` (sección "Mesa de palabras": cada archivo, de dónde se copió, estado `? nativo` o el que ya tenía)
- Test: `tests/casa/palabras.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Tecnica = "dibujo" | "radical" | "suma" | "literal" | "gratis" | "haoMas" | "partes" | "igual";
  export const SELLO: Record<Tecnica, string>; // "Es un dibujo", "El radical da la pista", "Chino es fácil", "Literalmente", "Palabra gratis", "好 + algo", "Por partes", "Suenan igual"
  export type Pieza = { hz: string; es: string }; // en "dibujo", hz puede ser un emoji (💧 → 水)
  export interface Palabra {
    id: string;            // = idAudio(s), p. ej. "xi1_hong2_shi4"
    s: Silaba[];           // con S(...) de lib/silabas
    es: string;            // significado
    tecnica: Tecnica;
    piezas: Pieza[];       // lo que se arma en la ficha
    frase: string;         // el truco en una línea
    lento: boolean;        // hay public/audio/palabras/<id>_lento.mp3
    nota?: string;         // micro-nota de sonido (una sola)
    audio?: string;        // archivo a usar si no es <id> (solo 她: id "ta1_ella", audio "ta1", la misma toma que 他)
  }
  export const PALABRAS: readonly Palabra[]; // 50, en el orden de la tabla del spec
  export const srcPalabra: (p: Palabra, lento?: boolean) => string; // "/audio/palabras/<id>[_lento].mp3"
  ```

- [ ] **Step 1: Write the failing test** `tests/casa/palabras.test.ts`

```ts
it("son 50, con ids únicos que coinciden con su audio", () => {
  expect(PALABRAS).toHaveLength(50);
  expect(new Set(PALABRAS.map((p) => p.id)).size).toBe(50);
  for (const p of PALABRAS) expect(p.audio ?? p.id).toBe(idAudio(p.s));
  expect(PALABRAS.filter((p) => p.audio).map((p) => p.id)).toEqual(["ta1_ella"]);
});
it("cada palabra tiene su mp3 (y el lento si lo declara)", () => {
  for (const p of PALABRAS) {
    expect(existsSync(join("public", srcPalabra(p)))).toBe(true);
    if (p.lento) expect(existsSync(join("public", srcPalabra(p, true)))).toBe(true);
  }
});
it("usa las 8 técnicas con las cantidades del spec", () => {
  const n = (t: Tecnica) => PALABRAS.filter((p) => p.tecnica === t).length;
  expect([n("dibujo"), n("radical"), n("suma"), n("literal"), n("gratis"), n("haoMas"), n("partes"), n("igual")])
    .toEqual([4, 9, 9, 9, 8, 5, 4, 2]);
});
it("suma, literal, 好+algo y por partes traen al menos 2 piezas; radical y dibujo al menos 1", () => {
  const min: Record<Tecnica, number> = { suma: 2, literal: 2, haoMas: 2, partes: 2, radical: 1, dibujo: 1, gratis: 0, igual: 0 };
  for (const p of PALABRAS) expect(p.piezas.length).toBeGreaterThanOrEqual(min[p.tecnica]);
});
it("ninguna frase invita a inventar una historia", () => {
  for (const p of PALABRAS) expect(p.frase.toLowerCase()).not.toContain("inventa");
});
it("ejemplos fijos del spec", () => {
  const xhs = PALABRAS.find((p) => textoHanzi(p.s) === "西红柿")!;
  expect(xhs.tecnica).toBe("literal");
  expect(xhs.piezas.map((x) => x.es)).toEqual(["oeste", "rojo", "kaki"]);
  expect(xhs.frase).toContain("kaki rojo del oeste");
  expect(PALABRAS.find((p) => textoHanzi(p.s) === "好")!.piezas.map((x) => x.hz)).toEqual(["女", "子"]);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/casa/palabras.test.ts` — Expected: FAIL (módulo no existe).

- [ ] **Step 3: Write `palabras.ts`** con las 50 filas de la tabla del spec (palabra, pinyin, significado, técnica, truco → `piezas` + `frase`). Tonos de las sílabas: los de la pronunciación real que usa el audio (你好 = `S("你好", "ní hǎo", "23")`, como `ni2_hao3` de la cocina; neutros como `5`: 子, 话 en 笑话, 卜, 菇). Notas de sonido del spec en `nota`.

- [ ] **Step 4: Copy the audios** a `public/audio/palabras/<id>.mp3` (y `<id>_lento.mp3`). Fuentes, en este orden: `public/audio/cocina/<id>.mp3` (ya con el nombre correcto); `../video/public/audio/banco/<pinyin sin tonos>.mp3` y `_lento`; carpetas `facil-*`, `literal-*`, `gratis-*`, `hao-*`, `pron-*`, `radical-*`. 他 y 她 usan la misma toma (`pron-1/ta.mp3` y `ta_lento.mp3`) → un solo `ta1.mp3` (+ lento); 他 tiene id `ta1` y 她 id `ta1_ella` con `audio: "ta1"` (`srcPalabra` usa `p.audio ?? p.id`). Anota cada copia en `docs/audios.md`.

- [ ] **Step 5: Run** el test — Expected: PASS.

- [ ] **Step 6: Commit** `feat(living): las 50 primeras palabras y sus audios`

---

### Task 2: Palabras abiertas en el avance

**Files:**
- Modify: `components/casa/avance-validar.ts`, `components/casa/avance.ts` (fusión con el servidor, ~línea 139)
- Test: `tests/casa/avance.test.ts`

**Interfaces:**
- Produces: `Avance.palabras: string[]` (ids de `PALABRAS`, sin repetir, en el orden en que se abrieron).

- [ ] **Step 1: Failing tests** en `tests/casa/avance.test.ts`:
  - `validarAvance({ estado: {}, medallas: {}, escuchadas: [] }).palabras` → `[]` (avance viejo).
  - `validarAvance({ ..., palabras: ["xi1_hong2_shi4", "no_existe", "xi1_hong2_shi4", 3] }).palabras` → `["xi1_hong2_shi4"]`.
  - `avanceInicial().palabras` → `[]`.
  - La fusión local+remoto une las palabras de ambos sin repetir.
- [ ] **Step 2: Run** `npx vitest run tests/casa/avance.test.ts` — FAIL.
- [ ] **Step 3: Implement**: `palabras` en `Avance`, `avanceInicial` y `validarAvance` (filtra contra los ids de `PALABRAS`); unión en la fusión de `avance.ts`. `tests/api/avance.test.ts` debe seguir en verde (el servidor usa la misma validación).
- [ ] **Step 4: Run** `npx vitest run tests/casa/avance.test.ts tests/api/avance.test.ts` — PASS.
- [ ] **Step 5: Commit** `feat(living): el avance guarda las palabras abiertas`

---

### Task 3: Arte del living y de la mesa desde arriba

**Files:**
- Modify: `scripts/arte-iso.ts` (cuarto del living y mesa vista desde arriba; salida en `public/arte/living/`)
- Modify: `scripts/arte-krita.ts` (el cuarto del living también se parte en capas `.ora`)
- Modify: `components/casa/arte/registro.ts` (`FONDO_CUARTO.living`, `ARTE_MESA`)
- Modify: `docs/arte.md`
- Create (generados): `public/arte/living/cuarto_living.svg`, `public/arte/living/mesa_arriba.svg`
- Test: `tests/casa/arte.test.tsx`

**Interfaces:**
- Produces: `FONDO_CUARTO.living: Capa` (1000×1000, como la cocina); `ARTE_MESA: Capa` (madera vista desde arriba, 1000×1000); constante `MESA_LIVING = { x: number; y: number; w: number; h: number }` en `components/casa/living/lugares.ts` con el rectángulo de la mesa en unidades del cuarto (lo usan la zona de toque y el paso de la vaca); `PARADA_VACA: { x: number; y: number }` (al lado de la mesa, en el piso).

- [ ] **Step 1: Failing test**: `FONDO_CUARTO.living` y `ARTE_MESA` existen y vienen del manifiesto (`/arte/living/...`); `MESA_LIVING` cae dentro de 0-1000 y `PARADA_VACA` fuera del rectángulo de la mesa.
- [ ] **Step 2: Run** `npx vitest run tests/casa/arte.test.tsx` — FAIL.
- [ ] **Step 3: Draw** en `arte-iso.ts`, mismo estilo que `cuarto()` (salvia, crema, madera, contorno café; mismo `ISO`): piso, paredes, alfombra, **mesa de comedor con 4 sillas al centro**, sofá (沙发) y tele (电视) sobre un mueble, todo dentro del cuarto (decoración en esta entrega). Marcas `parte("…")` para Krita (piso, paredes, alfombra, mesa, sillas, sofa, tele, sombras). Sobre la mesa del cuarto, fichas de colores chicas sin texto (las letras las pone el componente). Aparte, `mesa_arriba.svg`: tablero de madera visto desde arriba con veta y borde, sin fichas.
- [ ] **Step 4: Run** `npm run arte:generar` y el test — PASS. Abrir los dos SVG y mirarlos.
- [ ] **Step 5: Commit** `feat(arte): living comedor y mesa vista desde arriba`

---

### Task 4: Minimapa con cuartos abiertos

**Files:**
- Modify: `components/casa/Minimapa.tsx`
- Test: `tests/casa/Casa.test.tsx` (o `tests/casa/Minimapa.test.tsx` nuevo)

**Interfaces:**
- Produces: `Minimapa({ cuartoActual, abiertos, anotado, alCambiar, alTocarBloqueado })` con `abiertos: readonly Cuarto[]` y `alCambiar: (c: Cuarto) => void`. `export const CUARTOS_ABIERTOS: readonly Cuarto[] = ["cocina", "living"]`.

- [ ] **Step 1: Failing tests**: con `cuartoActual="cocina"`, el botón `客厅` no tiene `data-bloqueado` ni 🔒 en su aria-label, y tocarlo llama `alCambiar("living")` (no `alTocarBloqueado`); `卧室` sigue llamando `alTocarBloqueado`; en el living, `厨房` llama `alCambiar("cocina")`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** El sfx del abierto es `pop` (el `boing` queda para los cerrados).
- [ ] **Step 4: Run** `npx vitest run tests/casa` — PASS.
- [ ] **Step 5: Commit** `feat(casa): el 客厅 se abre en el minimapa`

---

### Task 5: Ficha de una palabra y línea de tono

**Files:**
- Create: `components/casa/living/Ficha.tsx`, `components/casa/living/LineaTono.tsx`, `components/casa/living/Living.module.css`
- Test: `tests/casa/Ficha.test.tsx`

**Interfaces:**
- Consumes: `Palabra`, `SELLO` (Task 1).
- Produces: `Ficha({ palabra, hablando, alRepetir, alCerrar }: { palabra: Palabra; hablando: boolean; alRepetir: () => void; alCerrar: () => void })` con `role="dialog"` y `aria-label` = hanzi; `LineaTono({ s, activa }: { s: Silaba[]; activa: boolean })`: un SVG con un trazo por sílaba en su color de tono (1 plano alto, 2 sube, 3 baja y sube, 4 baja, 5 punto corto), que se dibuja (stroke-dashoffset) mientras `activa`.

- [ ] **Step 1: Failing tests**:
  - Muestra el sello (`SELLO[tecnica]`), el hanzi, el pinyin con cada sílaba en `COLOR_TONO[t]`, el significado y la `frase`.
  - Cada técnica muestra sus piezas: en "suma" y "haoMas" con `+` entre piezas y `=` antes del significado; en "literal" las piezas separadas por `·` y luego la frase; en "dibujo" las piezas en fila con `→` y el hanzi al final.
  - `LineaTono` dibuja un trazo por sílaba (`[data-tono]`), con su color; para 你好 dos trazos (2 y 3).
  - 🔊 llama `alRepetir`; ✕ y Escape llaman `alCerrar`.
  - Con `nota`, se ve una línea de nota; sin `nota`, nada.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Cuerpo animado por técnica con CSS (piezas que entran una tras otra con `animation-delay`); respeta `prefers-reduced-motion`. Hanzi con la fuente del sitio (`app/fuentes`). Ancho máx. de la ficha: 100% − 32 px a 360 px.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(living): ficha de la palabra con su técnica y línea de tono`

---

### Task 6: La mesa vista desde arriba

**Files:**
- Create: `components/casa/living/Mesa.tsx`
- Modify: `components/casa/living/Living.module.css`
- Test: `tests/casa/Mesa.test.tsx`

**Interfaces:**
- Consumes: `PALABRAS`, `srcPalabra` (Task 1), `ARTE_MESA` (Task 3), `Ficha` (Task 5), `decir`/`callar` de `components/casa/audio/voz`.
- Produces: `Mesa({ abiertas, alAbrir, alCerrar }: { abiertas: readonly string[]; alAbrir: (id: string) => void; alCerrar: () => void })` con `data-testid="mesa"`, dentro del mismo contenedor de pantalla completa que el refri (`pp.pp` de `PrimerPlano.module.css`).

- [ ] **Step 1: Failing tests** (con `decir` mockeado como en `Refri.test.tsx`):
  - Hay 50 botones `[data-palabra]`, cada uno con hanzi y pinyin; el aria-label es el hanzi.
  - Las de `abiertas` llevan `data-abierta="true"`; el contador dice `⭐ 2/50` con dos abiertas.
  - Tocar 西红柿 abre la ficha, llama `alAbrir("xi1_hong2_shi4")` y llama `decir` primero con `src` lento y luego con el natural; una palabra con `lento: false` llama `decir` una sola vez.
  - Tocar otra ficha mientras suena: llama `callar`, hay **una** sola `[role=dialog]` y es la nueva.
  - `decir` que resuelve `false` (mudo): la ficha se abre igual.
  - ← (`aria-label="返回"`) llama `alCerrar`; con una ficha abierta, ✕ cierra solo la ficha.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Fichas repartidas en una cuadrícula suelta (posición fija por índice con un pequeño desfase pseudoaleatorio determinista, sin `Math.random` en render), con deriva suave en CSS (`translate` de pocos px, `animation-delay` negativo por índice) y sombra. A 360 px: 4 columnas, la caja se desplaza en vertical; botones de al menos 44 px. `juego: "cocina"` en cada `decir`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(living): la mesa con las 50 palabras flotando`

---

### Task 7: El living: la vaca va a la mesa y entra el zoom

**Files:**
- Create: `components/casa/living/Living.tsx`
- Test: `tests/casa/Living.test.tsx`

**Interfaces:**
- Consumes: `FONDO_CUARTO.living`, `MESA_LIVING`, `PARADA_VACA` (Task 3), `Mesa` (Task 6), `Vaca` (`components/casa/Vaca.tsx`), `sfx`.
- Produces: `Living({ abiertas, alAbrir, activo }: { abiertas: readonly string[]; alAbrir: (id: string) => void; activo: boolean })`. Exporta `PASO_MS = 900` (caminata) y `ZOOM_MS = 600`.

- [ ] **Step 1: Failing tests** (timers falsos):
  - Al montar se ve el cuarto (`[data-capa="cuarto_living"]`), la vaca (`[data-vaca]`) y la zona de la mesa (`[data-mesa]`, aria-label `桌子`), con hanzi chicos de colores flotando encima (decorativos, `aria-hidden`).
  - Tocar la mesa: la vaca se mueve a `PARADA_VACA` (estilo `left/top`), orejas arriba y ojos de sorpresa al llegar; tras `PASO_MS + ZOOM_MS` aparece `[data-testid="mesa"]`. Antes no.
  - Segundo toque durante la caminata no hace nada.
  - Cerrar la mesa vuelve al cuarto con la vaca junto a la mesa.
  - `activo=false` con la mesa abierta: la mesa se cierra y se llama `callar`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** El zoom es una escala CSS del cuarto hacia el centro de `MESA_LIVING` durante `ZOOM_MS`, y luego la mesa en pantalla completa con el iris de entrada del refri. Sin español en el cuarto.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(living): la vaca camina a la mesa y la cámara entra`

---

### Task 8: Conectar el living a la casa

**Files:**
- Modify: `components/casa/Casa.tsx`
- Test: `tests/casa/Living.test.tsx` (integración con `CasaVista`), `tests/casa/Persistencia.test.tsx`

**Interfaces:**
- Consumes: `Minimapa` nuevo (Task 4), `Living` (Task 7), `Avance.palabras` (Task 2).
- Produces: `CasaVista` gana `palabras?: readonly string[]` y `alAbrirPalabra?: (id: string) => void`; estado interno `cuarto: Cuarto` (empieza en `"cocina"`; no se guarda).

- [ ] **Step 1: Failing tests**:
  - Tocar `客厅` en el minimapa muestra el living y no la cocina (`[data-objeto]` no está); `厨房` vuelve y la cocina conserva su estado.
  - En el living no están el botón `玩` ni `⤢`, y aunque `estado.deng === "apagada"` no se ve `.oscuro`.
  - Con el refri o un primer plano abiertos, el minimapa no cambia de cuarto (`ocupado`).
  - `Casa` (contenedor): abrir una palabra la agrega a `avance.palabras` y se guarda en `localStorage` (`cdc.avance.v1`); abrirla de nuevo no la repite; al recargar, la mesa la muestra marcada.
  - Pestaña oculta (`activo=false`) en el living con una ficha abierta: la ficha se cierra (Review Focus 3).
- [ ] **Step 2: Run** `npx vitest run tests/casa` — FAIL.
- [ ] **Step 3: Implement.** En `CasaVista`, si `cuarto === "living"`, el `.mundo` de la cocina no se renderiza y va `<Living>` dentro de `.escenario`; el minimapa, el globo y las tarjetas quedan como están. Al cambiar de cuarto se llama `callar()`. En `Casa`, `alAbrirPalabra` hace lo mismo que `alEscuchar` sobre `avance.current.palabras` y llama `marcar()`.
- [ ] **Step 4: Run** `npm test` — PASS (toda la suite).
- [ ] **Step 5: Commit** `feat(casa): el living comedor en la casa`

---

### Task 9: Smoke a 360 px y docs

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Modify: `docs/arte.md`, `docs/audios.md` (si faltó algo), `README.md` si lista los cuartos

- [ ] **Step 1: Add e2e** a 360×740: portada → entrar a la casa → `客厅` → tocar la mesa → esperar `[data-testid="mesa"]` → las 50 `[data-palabra]` visibles al desplazar, ninguna con ancho < 44 px → tocar 咖啡 → `[role=dialog]` con "Palabra gratis" y "café" → sin scroll horizontal (`document.documentElement.scrollWidth <= 360`).
- [ ] **Step 2: Run** `npm run e2e` — PASS.
- [ ] **Step 3: Run** `npm run lint` y `npm test` — sin errores.
- [ ] **Step 4: Commit** `test(living): smoke a 360 px de la mesa de palabras`
