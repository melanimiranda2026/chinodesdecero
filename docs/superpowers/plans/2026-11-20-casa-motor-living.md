# Casa: motor de cuartos, entrada y living (etapas 0 y 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La web abre con la casa entera en isometría; la vaca entra al living, que se juega por acciones (tocar todo, sentarse, ver la tele) con fichas de mahjong giratorias y reloj solar; para pasar a la cocina hay que haberlo hecho todo y dejar el correo.

**Architecture:** Un motor chico y puro (`components/casa/motor/`) lee la ficha de datos de un cuarto (objetos, acciones, horas) y calcula progreso, fichas, lo que falta y la hora del reloj solar. Un componente genérico `CuartoMotor` dibuja cualquier cuarto definido así. El living se reescribe como la primera ficha de datos; la cocina sigue con su código actual hasta la etapa 2. Regla: el motor solo trae lo que piden el living y la entrada; nada "por si acaso".

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Vitest + Testing Library, Playwright, Supabase (avance), arte SVG generado en `scripts/arte-iso.ts`.

**Spec:** `docs/superpowers/specs/2026-11-20-proyecto-chino-con-la-vaca-design.md` (secciones 2, 3, 4.1-4.3, 6, 9 y 10, etapas 0 y 1).

**Rama:** `feat/casa-motor` desde `main` (feat/living ya está fusionada en main).

## Global Constraints

- Marca única: "chino con la vaca". Método Jìn solo como nombre del método (/sobre).
- Dentro de la casa no hay español (excepciones existentes: la ficha de la mesa y las tarjetas superpuestas). Etiquetas accesibles en hanzi.
- Colores de tono solo desde `lib/tonos.ts` (`COLOR_TONO`). Pinyin con marcas de tono, sandhi como bloque fijo.
- La vaca no hace la acción mientras suena el tono: primero el audio de la frase, después la pose.
- Efectos (`sfx`) nunca encima del mandarín (mismo patrón que `efectoYLuegoVoz`).
- Se gana siempre: nunca un estado sin salida; siempre se ve qué falta.
- `prefers-reduced-motion`: sin giro, sin caminata ni zoom (fundido), igual que la casa hoy.
- Zonas tocables ≥ 44 px a 360 px de ancho.
- Audio nuevo: voz Yating Lin (`5eoK8NqMBsMdqUmImHNs`), medido con `../video/scripts/medir-tono.mjs`, listado en `docs/audios.md` con "? nativo" (revisión de nativo pendiente antes de publicar).
- Arte: solo generado en código (`scripts/arte-iso.ts`) o retocado en Krita; nada de redes.
- Textos de página: segunda persona, cercano; "reconoces", nunca "entiendes".

## Review Focus

1. **Avance antiguo** (sin `cuartos`/`fichas`, con o sin `correo`): carga sin romperse; quien ya dejó el correo no lo vuelve a ver; quien jugaba la cocina entra igual por la casa y el living. → Task 2 y Task 7.
2. **Cambio de pestaña o de cuarto a mitad de una acción**: la voz se corta, la vaca no queda "ocupada" ni sentada para siempre, el logro no se pierde ni se duplica. → Task 5.
3. **Doble toque rápido / tocar durante la caminata**: una sola acción en curso, un solo logro, una sola ficha. → Task 5.
4. **Correo enviado pero enlace mágico sin confirmar**: puede seguir a la cocina (el correo queda guardado en el navegador). → Task 7.
5. **Celular de 360 px**: el reloj solar y la bandeja no tapan zonas de objetos, la puerta ni el minimapa. → Task 4 y Task 9 (e2e).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `components/casa/motor/tipos.ts` (nuevo) | Tipos de la ficha de datos de un cuarto y del progreso. |
| `components/casa/motor/progreso.ts` (nuevo) | Lógica pura: tocar, lograr, fichas, lo que falta, completo, hora. |
| `components/casa/living/cuarto.ts` (nuevo) | La ficha de datos del living. |
| `components/casa/avance-validar.ts` (mod.) | `Avance` gana `cuartos` y `fichas`; validación. |
| `components/casa/avance.ts` (mod.) | `fusionar` une `cuartos` y `fichas`. |
| `components/casa/RelojSolar.tsx` + `.module.css` (nuevo) | Reloj solar de abajo. |
| `components/casa/motor/FichaGanada.tsx`, `Bandeja.tsx`, `Motor.module.css` (nuevos) | Ficha que gira y bandeja de fichas (ganadas y siluetas). |
| `components/casa/motor/useCuarto.ts`, `CuartoMotor.tsx` (nuevos) | Hook y vista genérica de un cuarto de datos. |
| `components/casa/living/Living.tsx` (reescrito) | Living sobre `CuartoMotor` + la mesa de siempre. |
| `components/casa/EntradaCasa.tsx` + `.module.css` (nuevo) | Casa entera, la vaca entra, zoom al living. |
| `scripts/arte-iso.ts` (mod.) | Genera `public/arte/casa/casa_entera.svg`. |
| `components/casa/arte/registro.ts` (mod.) | `FONDO_CASA`. |
| `components/casa/Casa.tsx`, `Minimapa.tsx`, `Tarjetas.tsx` (mod.) | Orden entrada → living → cocina, puerta con correo, reloj en todos los cuartos. |
| `lib/eventos-nombres.ts` (mod.) | Eventos nuevos. |
| `components/pagina/Portada.tsx`, `portada.module.css`, `contenido.ts` (mod.) | Juego grande al centro; marca; sin pestañas. |
| `scripts/lista-audios.ts`, `docs/audios.md` (mod.) | Audios nuevos del living. |

---

### Task 1: Motor puro y ficha de datos del living

**Files:**
- Create: `components/casa/motor/tipos.ts`, `components/casa/motor/progreso.ts`, `components/casa/living/cuarto.ts`
- Test: `tests/casa/motor.test.ts`, `tests/casa/living-cuarto.test.ts`

**Interfaces:**
- Produces (`tipos.ts`):
  ```ts
  export type CuartoId = "living" | "cocina" | "bano" | "dormitorio";
  export type Pose = "sentada" | "mira";
  export type Zona = { x: number; y: number; w: number; h: number };   // unidades del cuarto 0-1000
  export interface DefObjeto { id: string; nombre: Silaba[]; zona: Zona; pie: Punto; acciones: string[]; abre?: "mesa" }
  export interface DefAccion { id: string; verbo: Silaba[]; frase: Silaba[]; icono: string; pose: Pose }
  export interface DefCuarto { id: CuartoId; hora: [number, number]; objetos: DefObjeto[]; acciones: DefAccion[]; salida: CuartoId }
  export interface ProgresoCuarto { tocados: string[]; logros: string[] }   // logro = `${accionId}@${objetoId}`
  ```
- Produces (`progreso.ts`):
  - `progresoVacio(): ProgresoCuarto`
  - `tocar(p: ProgresoCuarto, objetoId: string): ProgresoCuarto` (idempotente)
  - `lograr(p: ProgresoCuarto, accionId: string, objetoId: string): ProgresoCuarto` (idempotente)
  - `fichaId(s: Silaba[]): string` = `idAudio(s)`
  - `fichasDe(def: DefCuarto, p: ProgresoCuarto): string[]`: sustantivo de cada objeto tocado + verbo de cada acción lograda **en todos los objetos que la ofrecen**; orden de `def`.
  - `todasLasFichas(def: DefCuarto): string[]`
  - `falta(def, p): { objetos: string[]; logros: string[] }`
  - `completo(def, p): boolean`
  - `horaDe(def, p): number` = `hora[0] + (hora[1]-hora[0]) * hechos/total`, donde total = objetos + logros posibles.
- Produces (`living/cuarto.ts`): `export const LIVING: DefCuarto`.

Contenido de `LIVING` (zonas y `pie` calculados con `proyectar` desde `MUEBLES_LIVING` en `living/lugares.ts`, como `MESA_LIVING`; silla = la de adelante de la mesa, lado `v+`):

| objeto | nombre | acciones |
|---|---|---|
| `shafa` | 沙发 shā fā "11" | `zuo` |
| `yizi` | 椅子 yǐ zi "35" | `zuo` |
| `dianshi` | 电视 diàn shì "44" | `kan` |
| `zhuozi` | 桌子 zhuō zi "15" | — (`abre: "mesa"`) |

| acción | verbo | frase | icono | pose |
|---|---|---|---|---|
| `zuo` | 坐 zuò "4" | 我坐下 wǒ zuò xià "344" | 🪑 | `sentada` |
| `kan` | 看 kàn "4" | 我看电视 wǒ kàn diàn shì "3444" | 📺 | `mira` |

`hora: [7, 11]`, `salida: "cocina"`.

- [ ] **Step 1: Write failing tests** (`tests/casa/motor.test.ts`, con un cuarto de prueba de 2 objetos que comparten la acción `zuo` y 1 con `kan`):
  - `tocar` dos veces el mismo objeto deja `tocados.length === 1`.
  - `fichasDe` tras tocar `a`: `[fichaId(a.nombre)]`; tras `lograr("zuo","a")` sin `b`: el verbo 坐 **no** está; tras `lograr("zuo","b")`: sí está.
  - `falta` del progreso vacío lista los 3 objetos y los 3 logros; `completo` es `true` solo con todo.
  - `horaDe` vacío = `hora[0]`; completo = `hora[1]`; a mitad, valor intermedio.
- [ ] **Step 2: Run** `npx vitest run tests/casa/motor.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3: Implement** `tipos.ts` y `progreso.ts` con las firmas de arriba (funciones puras, sin React).
- [ ] **Step 4: Write failing tests** (`tests/casa/living-cuarto.test.ts`):
  - cada id de `acciones` de cada objeto existe en `LIVING.acciones`; ids de objetos únicos.
  - cada zona mide `w >= 60 && h >= 60` unidades (≥ 44 px a 360 px de ancho con el encuadre vertical).
  - las zonas no se pisan entre sí (intersección de rectángulos vacía).
  - cada `pie` cae en el piso libre (`limitarVaca(pie)` devuelve el mismo punto).
  - cada audio que el living dice existe en disco: para cada `nombre`, `frase` y `zhe4_shi4_<id>`: `fs.existsSync("public/audio/cocina/<id>.mp3")`. (Falla hasta el Step 6.)
- [ ] **Step 5: Implement** `living/cuarto.ts`.
- [ ] **Step 6: Audios del living.** Copiar `public/audio/palabras/sha1_fa1.mp3` y `dian4_shi4.mp3` a `public/audio/cocina/`. Generar con ElevenLabs (voz Yating, mismo modelo que `scripts/lista-audios.ts` declara para la cocina): `kan4`, `wo3_kan4_dian4_shi4`, `zhe4_shi4_sha1_fa1`, `zhe4_shi4_dian4_shi4`. Medir cada toma con `node ../video/scripts/medir-tono.mjs <archivo>` y repetir la que no dé el tono. Agregar las seis a `scripts/lista-audios.ts` con nota "? nativo: nueva (20 nov. 2026)" y correr `npm run audios`.
- [ ] **Step 7: Run** `npx vitest run tests/casa/motor.test.ts tests/casa/living-cuarto.test.ts` → PASS.
- [ ] **Step 8: Commit** `feat(motor): ficha de datos de un cuarto y el living como primera ficha`

---

### Task 2: Avance con cuartos y fichas

**Files:**
- Modify: `components/casa/avance-validar.ts`, `components/casa/avance.ts`
- Test: `tests/casa/avance.test.ts`, `tests/api/` (si algún test fija la forma del avance)

**Interfaces:**
- Consumes: `ProgresoCuarto`, `CuartoId`, `LIVING`, `todasLasFichas`, `progresoVacio` (Task 1).
- Produces: `Avance` gana `cuartos: Partial<Record<CuartoId, ProgresoCuarto>>` y `fichas: string[]` (orden de obtención, sin repetir). `avanceInicial()` los trae vacíos (`{}` y `[]`).

Validación: un id de objeto o logro que no exista en la ficha del cuarto se descarta; un cuarto sin ficha registrada se descarta; `fichas` solo acepta ids de `todasLasFichas` de los cuartos registrados (por ahora `LIVING`). Registro de fichas por cuarto: `const DEFS: Partial<Record<CuartoId, DefCuarto>> = { living: LIVING }` en `avance-validar.ts`.

`fusionar`: por cuarto, unión de `tocados` y `logros`; `fichas` = unión en orden (remoto primero).

- [ ] **Step 1: Write failing tests:**
  - `validarAvance` de un avance antiguo `{ estado, medallas, escuchadas, palabras, correo }` devuelve `cuartos: {}`, `fichas: []` y conserva el `correo`. *(Review Focus 1)*
  - descarta `cuartos.living.tocados: ["nope"]`, `cuartos.banco: {...}` y `fichas: ["xx"]`; conserva lo válido.
  - `fusionar` une `tocados` de ambos lados sin repetir y `fichas` en orden remoto + nuevas locales.
- [ ] **Step 2: Run** `npx vitest run tests/casa/avance.test.ts` → FAIL.
- [ ] **Step 3: Implement** en `avance-validar.ts` y `avance.ts`.
- [ ] **Step 4: Run** `npm test` → PASS (incluye `tests/api/*`: el servidor usa `validarAvance`).
- [ ] **Step 5: Commit** `feat(avance): guarda el progreso de cada cuarto y las fichas ganadas`

---

### Task 3: Reloj solar

**Files:**
- Create: `components/casa/RelojSolar.tsx`, `components/casa/RelojSolar.module.css`
- Test: `tests/casa/RelojSolar.test.tsx`

**Interfaces:**
- Produces: `export function RelojSolar({ hora }: { hora: number }): JSX.Element` (hora 0-24, decimal).
- Produces: `export function posicionAstro(hora: number): { astro: "sol" | "luna"; t: number }` (t 0-1 a lo largo del arco; sol de 6 a 18, luna de 18 a 6).

Dibujo: arco bajo y ancho al pie del escenario, crayón con contorno `#4A2A1C`, sol o luna sobre el arco en `t`; el cielo del arco cambia de color (amanecer, día, tarde, noche). `role="img"` con `aria-label` en hanzi según franja: 早上 (6-11), 中午 (11-14), 下午 (14-18), 晚上 (18-6). El astro se desliza con `transition` (sin transición con movimiento reducido). `pointer-events: none`.

- [ ] **Step 1: Write failing tests:** `posicionAstro(6)` → sol, t 0; `posicionAstro(12)` → sol, t 0.5; `posicionAstro(22)` → luna; render con `hora={8}` tiene `aria-label="早上"`; con `hora={21}`, `"晚上"`; el elemento raíz tiene `pointer-events: none` en su clase *(Review Focus 5: no tapa nada)*.
- [ ] **Step 2: Run** `npx vitest run tests/casa/RelojSolar.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(casa): reloj solar`

---

### Task 4: Ficha que gira y bandeja de fichas

**Files:**
- Create: `components/casa/motor/FichaGanada.tsx`, `components/casa/motor/Bandeja.tsx`, `components/casa/motor/Motor.module.css`
- Test: `tests/casa/Bandeja.test.tsx`

**Interfaces:**
- Consumes: estilo de la ficha de mahjong de `living/Mesa.tsx` (reutilizar sus clases o extraer un `FichaMahjong` compartido si hace falta; mismo look).
- Produces:
  - `FichaGanada({ silabas, alTerminar }: { silabas: Silaba[]; alTerminar: () => void })`: aparece al centro, gira sobre Y como objeto valioso (~1,6 s, brillo), y llama `alTerminar`. Con movimiento reducido: aparece y se desvanece sin girar, misma duración.
  - `Bandeja({ fichas, todas }: { fichas: string[]; todas: { id: string; silabas: Silaba[] }[] })`: fila al pie, a la izquierda del reloj; cada ficha ganada con su hanzi coloreado por tono; las no ganadas como silueta (sin hanzi). Es el "qué falta" siempre visible.

- [ ] **Step 1: Write failing tests:** `Bandeja` con 2 de 6 ganadas muestra 2 hanzi y 4 siluetas (`data-silueta`); el color del hanzi es `COLOR_TONO[tono]`; `FichaGanada` llama `alTerminar` una vez tras avanzar los timers (`vi.useFakeTimers`); con `matchMedia('(prefers-reduced-motion: reduce)')` simulado, la ficha no lleva la clase de giro.
- [ ] **Step 2: Run** `npx vitest run tests/casa/Bandeja.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** La bandeja usa `pointer-events: none` salvo que se toque una ficha (no hace nada en esta etapa: decorativa). *(Review Focus 5)*
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(motor): ficha que gira al ganarla y bandeja con lo que falta`

---

### Task 5: Cuarto genérico (`useCuarto` + `CuartoMotor`)

**Files:**
- Create: `components/casa/motor/useCuarto.ts`, `components/casa/motor/CuartoMotor.tsx`
- Test: `tests/casa/CuartoMotor.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`DefCuarto`, funciones de progreso), Task 3 (`RelojSolar`), Task 4 (`FichaGanada`, `Bandeja`), `decir`/`callar` (`audio/voz`), `efectoYLuegoVoz`, `sfx`, `Vaca`, `FondoCuarto`, `useEscenario`, `encuadrar`, `transformCSS`, `Globo`.
- Produces:
  ```ts
  useCuarto(def: DefCuarto, opc: {
    progreso: ProgresoCuarto;
    alCambiar: (p: ProgresoCuarto, nuevas: string[]) => void;   // nuevas = fichas recién ganadas
    alEvento?: AlEvento;
    activo: boolean;
  }): {
    vaca: Punto; pose: Pose | null; globo: Silaba[] | null; ocupado: boolean;
    elegido: string | null;                 // objeto con su píldora de acción abierta
    tocarObjeto(id: string): Promise<void>;
    hacer(accionId: string, objetoId: string): Promise<void>;
    cola: Silaba[][];                       // fichas por mostrar girando, en orden
    sacarDeCola(): void;
  }
  CuartoMotor(props: {
    def: DefCuarto; progreso: ProgresoCuarto; activo: boolean;
    alCambiar: (p: ProgresoCuarto, nuevas: string[]) => void;
    alEvento?: AlEvento;
    alSalir: () => void;                    // tocar la puerta con el cuarto completo
    alAbrir?: (que: "mesa") => void;        // objeto con `abre`
    hijos?: ReactNode;                      // capas extra (la mesa a pantalla completa)
  })
  ```

Comportamiento:
- **Tocar objeto:** si `ocupado`, nada. Brillo + pop (si nada suena) + la vaca dice `这是` + nombre. Marca `tocar`; si el sustantivo es ficha nueva, va a `cola`. Si el objeto tiene acciones pendientes, queda `elegido` y aparece su píldora (icono + hanzi del verbo, sin pinyin, ≥ 44 px) junto al objeto. Si tiene `abre`, después de decir el nombre llama `alAbrir`.
- **Hacer acción:** `ocupado = true`; la vaca camina al `pie` (900 ms; 0 con movimiento reducido); dice la `frase`; **después** del audio toma la `pose` 1,5 s; `lograr`; si el verbo quedó completo, a `cola`; vuelve a pose normal; `ocupado = false`. Evento `accion_lograda { cuarto, accion, objeto }`.
- **Fichas:** se muestran de a una desde `cola` con `FichaGanada`; evento `ficha_ganada { cuarto, ficha }`.
- **Puerta:** botón 🚪 con el hanzi del cuarto de salida (`厨房`) en la pared del cuarto. Antes de `completo`: se ve cerrada y tocarla hace "boing" y hace parpadear las siluetas de la bandeja. Con `completo`: brilla; tocarla llama `alSalir`. Evento `cuarto_completo { cuarto }` una vez al completarse.
- **Reloj:** `RelojSolar hora={horaDe(def, progreso)}`; **Bandeja** con `fichasDe` y `todasLasFichas`.
- **`activo = false`** (pestaña oculta o cambio de cuarto): `callar()`, se cancelan los timers, `ocupado = false`, pose normal; el logro solo cuenta si la frase terminó antes. *(Review Focus 2)*

- [ ] **Step 1: Write failing tests** (con un `DefCuarto` de prueba, `decir` simulado que resuelve `true`, timers falsos):
  - tocar un objeto llama `alCambiar` con su id en `tocados` y la ficha del sustantivo en `nuevas`.
  - hacer `zuo` en un objeto y luego en el otro: la ficha 坐 aparece en `nuevas` solo la segunda vez.
  - la pose `sentada` aparece **después** de que resuelve `decir(frase)`, no antes.
  - dos clics seguidos en la píldora (o un toque a otro objeto durante la caminata) producen **un** solo logro y **una** sola llamada a `decir(frase)`. *(Review Focus 3)*
  - pasar `activo` a `false` a mitad de la caminata: se llama `callar`, el hook queda `ocupado: false`, la vaca sin pose y no se agrega el logro. *(Review Focus 2)*
  - la puerta antes de completar no llama `alSalir`; con progreso completo, sí; `cuarto_completo` se emite una sola vez.
- [ ] **Step 2: Run** `npx vitest run tests/casa/CuartoMotor.test.tsx` → FAIL.
- [ ] **Step 3: Implement** `useCuarto.ts` (estado y secuencias; usar `useTiempos` y `useVivo` como `useCasa`) y `CuartoMotor.tsx` (vista: mundo con `transformCSS`, `FondoCuarto cuarto={def.id}`, zonas como `<button aria-label={hanzi}>`, vaca, globo, píldora, puerta, reloj, bandeja, ficha que gira).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(motor): cuarto genérico que se arma desde su ficha de datos`

---

### Task 6: Living sobre el motor

**Files:**
- Modify: `components/casa/living/Living.tsx`, `components/casa/living/Living.module.css`
- Test: `tests/casa/Living.test.tsx` (reescribir lo que cambió; conservar los tests de la mesa)

**Interfaces:**
- Consumes: `CuartoMotor` (Task 5), `LIVING` (Task 1), `Mesa` (sin cambios).
- Produces: `Living({ abiertas, alAbrir, activo, progreso, alCambiar, alEvento, alSalir })`: mismas props que hoy + las del motor.

El living es `CuartoMotor def={LIVING}`; `alAbrir("mesa")` dispara la secuencia de siempre (la vaca camina a la mesa, zoom, `Mesa` a pantalla completa, foco al cerrar) pasada como `hijos`. Las fichas decorativas sobre la mesa se conservan. Abrir una palabra en la mesa sigue sin contar como ficha ganada.

- [ ] **Step 1: Ajustar tests** de `tests/casa/Living.test.tsx`: tocar 桌子 dice su nombre, marca `zhuozi` en `tocados` y abre la mesa; los tests de la mesa (abrir, ficha, foco al cerrar, pestaña oculta) siguen iguales; existen botones 沙发, 椅子, 电视 y la puerta 厨房.
- [ ] **Step 2: Run** `npx vitest run tests/casa/Living.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(living): el living se juega por acciones sobre el motor`

---

### Task 7: Casa entera, entrada y puerta con correo

**Files:**
- Modify: `scripts/arte-iso.ts`, `components/casa/arte/registro.ts`, `components/casa/Casa.tsx`, `components/casa/Minimapa.tsx`, `components/casa/Tarjetas.tsx`, `lib/eventos-nombres.ts`
- Create: `components/casa/EntradaCasa.tsx`, `components/casa/EntradaCasa.module.css`
- Test: `tests/casa/EntradaCasa.test.tsx`, `tests/casa/Casa.test.tsx`, `tests/casa/arte.test.tsx`

**Interfaces:**
- Consumes: Tasks 1-6; `Correo` (`components/pagina/Correo.tsx`), `EVENTO_AVANCE`.
- Produces:
  - Arte: `public/arte/casa/casa_entera.svg` (vista 1000×1000) con los cuatro cuartos en isometría 2×2: living (adelante, con la puerta de entrada), cocina, baño y dormitorio. Living y cocina reutilizan los cuerpos de `living()` y `cuarto()` escalados; baño y dormitorio son cuartos vacíos con piso y paredes de otro color (se llenan en etapas 3-4). Exporta también `CENTRO_LIVING_EN_CASA: { x: number; y: number; s: number }` (centro y zoom que encuadran el living dentro de la casa) desde un módulo compartido `components/casa/casaEntera.ts`, para que arte y cámara no se desalineen.
  - `FONDO_CASA: Capa` en `registro.ts`.
  - `EntradaCasa({ alTerminar }: { alTerminar: () => void })`: casa entera → la vaca camina hasta la puerta del living (1,2 s) → zoom a `CENTRO_LIVING_EN_CASA` (0,8 s) → `alTerminar`. Un toque la salta. Con movimiento reducido: fundido de 300 ms.
  - Eventos nuevos en `NOMBRES_EVENTO`: `accion_lograda`, `ficha_ganada`, `cuarto_completo`, `pedir_correo_salida`, `salir_cuarto`.
  - `Tarjetas`: capa nueva `"salida"` con un título corto ("Guarda tu avance para seguir a la cocina") y el formulario `Correo origen="salida_living"`.

Comportamiento en `Casa`:
- Al cargar se muestra `EntradaCasa` **siempre** (es la primera imagen) y luego el cuarto donde quedó: `living` si `!completo(LIVING, avance.cuartos.living)` o si no hay correo; si no, `cocina`. *(Review Focus 1)*
- `alSalir` del living: si hay `avance.correo` → evento `salir_cuarto`, fundido, cocina. Si no → evento `pedir_correo_salida` y capa `"salida"`. Al llegar `EVENTO_AVANCE` con correo → se cierra la capa y pasa a la cocina sin esperar la confirmación del enlace. *(Review Focus 4)*
- `Minimapa`: `abiertos` deja de ser constante: `living` siempre; `cocina` si el living está completo y hay correo. Baño y dormitorio cerrados como hoy.
- `RelojSolar` en todos los cuartos: en el living lo pone `CuartoMotor`; en la cocina, `hora={12}` fijo hasta la etapa 2.
- `alCambiar` del motor guarda en `avance.cuartos.living` y agrega `nuevas` a `avance.fichas`; marca como cambio (`marcar()`).

- [ ] **Step 1: Write failing tests:**
  - `tests/casa/arte.test.tsx`: existe `FONDO_CASA` y el archivo `public/arte/casa/casa_entera.svg`.
  - `EntradaCasa`: llama `alTerminar` una vez tras los timers; un toque la salta y lo llama una vez; con movimiento reducido, en ≤ 300 ms.
  - `Casa`: sin avance → tras la entrada se ve el living y el minimapa tiene la cocina cerrada.
  - avance antiguo con `correo` y living completo → tras la entrada, cocina. Avance antiguo con `correo` y living vacío → living; al completarlo, la puerta lleva a la cocina **sin** pedir correo. *(Review Focus 1)*
  - living completo sin correo → tocar la puerta abre la capa `"salida"`; despachar `EVENTO_AVANCE` con `{ correo }` → la capa se cierra y se ve la cocina. *(Review Focus 4)*
- [ ] **Step 2: Run** `npx vitest run tests/casa/EntradaCasa.test.tsx tests/casa/Casa.test.tsx tests/casa/arte.test.tsx` → FAIL.
- [ ] **Step 3: Implement** el arte (`npm run arte:generar`), `casaEntera.ts`, `EntradaCasa`, y los cambios en `Casa`, `Minimapa`, `Tarjetas` y `eventos-nombres`.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(casa): la casa entera abre la web y la puerta del living pide el correo`

---

### Task 8: Portada con el juego al centro (incluye etapa 0 de marca)

**Files:**
- Modify: `components/pagina/Portada.tsx`, `components/pagina/portada.module.css`, `components/pagina/contenido.ts`, `components/pagina/juego.ts` (si queda sin uso, borrarlo con sus tests)
- Test: `tests/pagina/Portada.test.tsx`, `tests/pagina/secciones.test.tsx`

**Interfaces:**
- Consumes: `Casa` (Task 7).
- Produces: `PORTADA` actualizado; `MENU` con `{ clave: "casa", icono: "🏠", texto: "Casa", href: "/" }` y el puzzle en `"/puzzle"`.

Cambios:
- Primera pantalla: marca "chino con la vaca" arriba, pequeña; la casa **grande y al centro** (en computador, la ventana ocupa la mayor parte del alto de la pantalla, centrada; en celular, a lo ancho). El h1 y la línea de confianza van debajo del juego.
- Sin pestañas cocina/puzzle dentro de la portada: la portada es la casa. El puzzle queda en su ruta y en el menú.
- `PORTADA.confianza`: "Gratis · funciona en tu celular" (ya no "sin registrarte": salir del living pide correo).
- `TIKTOK`: deja el comentario `// PENDIENTE: la dueña confirma la cuenta oficial y su @ (spec §11.1)`; no se cambia la URL hasta tener la respuesta.
- Ningún texto visible dice "chino desde cero" ni "chino comprensible" como marca (el nombre de la cuenta de TikTok solo aparece en el enlace a TikTok).

- [ ] **Step 1: Write failing tests:** la portada no tiene pestañas (`role="tab"`) ni el botón del puzzle; muestra el texto de marca antes del juego y el h1 después; `confianza` no contiene "sin registrarte"; el menú tiene "Casa" → `/` y "Puzzle" → `/puzzle`; el HTML renderizado de la portada y de /sobre no contiene "chino desde cero".
- [ ] **Step 2: Run** `npx vitest run tests/pagina` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test && npm run lint` → PASS.
- [ ] **Step 5: Commit** `feat(portada): la casa grande al centro y una sola marca`

---

### Task 9: Recorrido completo en el navegador

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Test: el mismo.

- [ ] **Step 1: Write the e2e** (viewport 360×740 y 1280×800; `/api/suscribir` interceptado con 200):
  1. Abre `/`: se ve la casa entera; tras la entrada, el living.
  2. Toca 沙发, 椅子, 电视, 桌子 (cierra la mesa); hace 坐 en el sofá y en la silla, 看 en la tele. La bandeja queda sin siluetas.
  3. Toca la puerta 厨房: aparece el formulario; envía un correo: se ve la cocina.
  4. Recarga: tras la entrada, aparece en la cocina.
  5. En 360 px: el reloj solar, la bandeja y el minimapa no se superponen con ninguna zona de objeto ni con la puerta (comparar `boundingBox`). *(Review Focus 5)*
- [ ] **Step 2: Run** `npm run e2e` → PASS (si falla, arreglar en la task dueña del código, no en el test).
- [ ] **Step 3: Commit** `test(e2e): de la casa entera a la cocina pasando por el living`

---

## Pendientes que no bloquean

- Cuenta oficial de TikTok (spec §11.1): solo cambia `TIKTOK` en `contenido.ts`.
- Revisión de un nativo de los seis audios nuevos antes de publicar (regla del canal).
