# Cocina más grande (Entrega 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La cocina gana refri en primer plano con comida de los videos y del HSK 1, una receta (米 + 水 + 胡萝卜 → revolver → 我做好饭了), taza de café, lámpara, ventana, basurero, silla, teléfono, un gato escondido y frases de 热/冷, 好吃 y comidas según la hora.

**Architecture:** Todo vive en `components/casa/`. Objetos nuevos = entradas nuevas en `cocina/datos.ts` (lugar, nombre), `cocina/acciones.ts` (qué se puede hacer), `arte/registro.ts` + `scripts/arte-iso.ts` (dibujo por capas, SVG generado) y `audio/manifiesto.ts` (frases). Los objetos nuevos son **independientes**: sus acciones solo leen su propio estado, así el espacio de estados no explota; la validación del avance pasa a ser por llave. Refri y receta son pantallas a pantalla completa dentro de la ventana, del mismo tipo que `primer-plano/`.

**Tech Stack:** Next 15 App Router, React 19, CSS Modules, Vitest + jsdom, tsx scripts, ElevenLabs (MCP) para audio.

**Spec:** `docs/superpowers/specs/2026-11-16-cocina-secretos-design.md` (sección "Entrega 2").

## Global Constraints

- Dentro de la ventana del juego no hay español: solo hanzi, pinyin con tonos y dibujos (sí en `aria-label`, nunca visible).
- La vaca habla solo mandarín. Voz Yating Lin `5eoK8NqMBsMdqUmImHNs`, `eleven_v3`, `language: "zh"`, stability 0.5, speed 1.0. Antes de generar, buscar la palabra en `../video/public/audio/banco/` (nombres sin tono: `xiangjiao.mp3`) y copiarla. Toda toma nueva se mide con `node ../video/scripts/medir-tono.mjs <mp3>` y se marca `? nativo` en `REVISAR_COCINA` de `scripts/lista-audios.ts`. `npm run audios` debe terminar con "faltan 0".
- Audio de la casa: `public/audio/cocina/<idAudio>.mp3` (`idAudio` de `lib/silabas.ts`). Todo audio y sfx de la casa se pide con `juego: "cocina"`.
- Arte: dibujado en código a crayón, contorno `#6B4A35` (tinta `T` de `scripts/arte-iso.ts`), sin imágenes descargadas. Cada capa es un archivo `public/arte/cocina/<objeto>_<capa>.svg`; después de `npm run arte:generar` correr `npm run arte` (manifiesto).
- Ningún título ni texto inclinado (`rotate` en textos/carteles está prohibido; en objetos animados sí se permite).
- A 360 px de ancho, las zonas de toque de los objetos (44 px) no se pisan; nada tapa la vaca en su posición inicial (`VACA_INICIAL`, x 434 y 613).
- Pinyin: misma convención que `cocina/frases.ts` y `acciones.ts`: los bloques fijos con 很/你 + 3.er tono llevan sandhi escrito (很好 = hén hǎo, 你好 = ní hǎo); 我 + verbo se escribe sin sandhi (我洗碗 "333"), como hoy. 一/不 según el tono siguiente; tono neutro = "5".
- Hanzi nuevos: correr `npm run fuente` (el test `tests/fuente-hanzi.test.ts` falla si falta uno).
- Avance guardado de antes debe seguir valiendo (no perder escuchadas ni el estado de los 8 objetos de siempre).
- Medallas siguen como están (se quitan en la Entrega 3).
- Verificación final de cada tarea: `npx vitest run`, `npx tsc --noEmit`, `npx eslint app components tests scripts`.

## Review Focus

- Avance guardado con 8 llaves (antes de esta entrega) → se conserva el estado de esos 8 y los nuevos toman su valor inicial (no vuelve todo al inicio).
- 360 × 640 en vertical: los objetos nuevos no tapan ni pisan los de siempre; la vaca alcanza cada uno (su `pie` está en piso libre, `PISO_LIBRE`).
- Apagar la lámpara y luego abrir la receta, el refri o el 玩: la cocina oscura no deja nada ilegible (los primeros planos van a luz normal).
- Salir con ✕ de la receta a mitad (ingredientes echados) → la olla queda `vacio` y la casa libre.
- Cambiar de pestaña (puzzle) con el refri o la receta abiertos → se callan y al volver la casa no queda trabada (`ocupado` en false).

---

### Task 1: Estado de los objetos nuevos y avance compatible

**Files:**
- Modify: `components/casa/cocina/datos.ts`
- Modify: `components/casa/avance-validar.ts`
- Test: `tests/casa/avance.test.ts`, `tests/casa/acciones.test.ts`

**Interfaces:**
- Produces: `ObjetoId` suma `"kafeibei" | "deng" | "chuanghu" | "lajitong" | "yizi" | "zhuozi" | "shouji" | "mao"`.
- Produces: `ESTADO_INICIAL` suma `kafeibei: "vacio", deng: "encendida", chuanghu: "cerrada", lajitong: "cerrado", yizi: "libre", zhuozi: "fijo", shouji: "fijo", mao: "refri"`.
- Produces: `export const VALORES: Record<ObjetoId, readonly string[]>` con los estados posibles de cada objeto nuevo (`kafeibei: ["vacio","cafe","sucio"]`, `deng: ["encendida","apagada"]`, `chuanghu: ["cerrada","abierta"]`, `lajitong: ["cerrado"]`, `yizi: ["libre"]`, `zhuozi: ["fijo"]`, `shouji: ["fijo"]`, `mao: ["refri","mesa","lajitong","chuanghu"]`) y, para los 8 de siempre, los valores que salen de `estadosAlcanzables()`.
- Produces: `export const ACOPLADOS: readonly ObjetoId[]` = los 8 de siempre (los que se validan juntos).
- Produces: `NOMBRES` nuevos: 咖啡杯 kā fēi bēi "111", 灯 dēng "1", 窗户 chuāng hu "15", 垃圾桶 lā jī tǒng "113", 椅子 yǐ zi "35", 桌子 zhuō zi "15", 手机 shǒu jī "31", 猫 māo "1".
- Produces: `LUGARES` para cada uno (posiciones finales las elige el implementador cumpliendo las restricciones de 360 px; `zhuozi` es una zona sobre la mesa, `fijo: true`, sin arrastre; `chuanghu` y `deng` también `fijo: true`).

- [ ] **Step 1: Write the failing tests**

```ts
it("un avance de antes (8 llaves) conserva esos 8 y los nuevos toman el inicial", () => {
  const viejo = { beizi: "agua", wan: "vacio", panzi: "lleno", kuaizi: "limpio", pingguo: "limpio", bingxiang: "cerrado", guo: "vacio", chahu: "lleno" };
  expect(estadoValido(viejo)).toEqual({ ...ESTADO_INICIAL, beizi: "agua", pingguo: "limpio" });
});
it("un valor desconocido en un objeto nuevo vuelve a su inicial sin tocar el resto", () => {
  const e = { ...ESTADO_INICIAL, beizi: "agua", deng: "rota" };
  expect(estadoValido(e)).toEqual({ ...ESTADO_INICIAL, beizi: "agua" });
});
it("los 8 de siempre siguen validándose juntos (combinación imposible → inicial de los 8)", () => {
  const e = { ...ESTADO_INICIAL, wan: "lleno", guo: "vacio", panzi: "lleno", pingguo: "nada", deng: "apagada" };
  // wan lleno exige haber cocinado: si la combinación no es alcanzable, los 8 vuelven al inicial y deng se conserva
  expect(estadoValido(e).deng).toBe("apagada");
});
it("estadosAlcanzables no crece con los objetos nuevos", () => {
  expect(estadosAlcanzables().length).toBe(864);
});
```

(El tercer test: el implementador elige una combinación de los 8 que hoy `estadoValido` rechaza y verifica que los 8 vuelven al inicial y `deng` se conserva.)

- [ ] **Step 2: Run them and see them fail** — `npx vitest run tests/casa/avance.test.ts tests/casa/acciones.test.ts`.
- [ ] **Step 3: Implement.** `estadosAlcanzables()` hace BFS solo sobre `ACOPLADOS` (los nuevos quedan en su inicial dentro de cada estado generado). `estadoValido(v)`: toma los 8 acoplados de `v` y los valida juntos como hoy (si no, inicial de los 8); cada llave nueva vale si está en `VALORES[id]`, si no su inicial; llaves desconocidas se descartan.
- [ ] **Step 4: Run all tests** — `npx vitest run`. Arreglar lo que rompa el `ObjetoId` más ancho (tests de arte y camara pueden necesitar los objetos nuevos en `ARTE`; si `ARTE` exige capas que aún no existen, esta tarea agrega en `registro.ts` las entradas con las capas de la Task 2 y en `scripts/arte-iso.ts` un dibujo provisional simple —una caja con el contorno— por capa, que la Task 2 reemplaza).
- [ ] **Step 5: Commit** — `feat(casa): estado de los objetos nuevos y avance compatible`.

### Task 2: Arte de los objetos nuevos, la comida del refri y el arroz con zanahoria

**Files:**
- Modify: `scripts/arte-iso.ts`, `components/casa/arte/registro.ts`
- Generated: `public/arte/cocina/*.svg`, `components/casa/arte/manifiesto-arte.json`
- Test: `tests/casa/arte.test.tsx`

**Interfaces:**
- Consumes: `OBJETOS` y `LUGARES` de la Task 1.
- Produces capas (nombre → cuándo se ve):
  - `kafeibei`: `taza` (siempre), `cafe` (estado cafe), `mugre` (sucio).
  - `deng`: `lampara`, `luz` (encendida: halo amarillo).
  - `chuanghu`: `marco`, `vidrio` (cerrada), `abierta` (hojas abiertas), `pajaro` (se muestra por animación).
  - `lajitong`: `tarro`, `tapa`.
  - `yizi`: `silla`. `zhuozi`: `zona` (transparente: solo la zona de toque). `shouji`: `telefono`.
  - `mao`: `cola` (lo que asoma desde su escondite) y `gato` (entero, al encontrarlo). El dibujo del gato se ubica en cada escondite con `llevarA`, no con cuatro dibujos.
  - `guo` y `wan`: capa nueva `zanahoria` (trocitos naranja sobre el arroz), visible con `arroz`.
- Produces: `export const ARTE_REFRI: Record<ComidaId, Capa>` con `ComidaId = "pingguo" | "xiangjiao" | "xigua" | "caomei" | "huluobo" | "xihongshi" | "tudou" | "xilanhua" | "mogu" | "niunai" | "jidan" | "mianbao" | "mi"` (archivos `public/arte/cocina/refri_<id>.svg`, cuadro cuadrado, de frente, no isométrico) y `ARTE_REFRI_FONDO` (`refri_interior.svg`: estantes de frente, con una caja rotulada 水果).

- [ ] **Step 1: Test** — extender `tests/casa/arte.test.tsx`: "todos los estados alcanzables usan capas que existen" debe recorrer también `VALORES` de los objetos nuevos; nuevo test: cada `ComidaId` tiene su capa en `ARTE_REFRI` y su archivo existe en `public/`; `guo` cocido y `wan` lleno muestran `zanahoria`.
- [ ] **Step 2: Run and fail.**
- [ ] **Step 3: Dibujar** con las utilidades de `arte-iso.ts` (misma paleta `C`, mismo `trazo`). Comida de frente con la misma mano que las frutas de `../video/src/Frutas.tsx` (mirarla como referencia de forma y color; no importarla).
- [ ] **Step 4:** `npm run arte:generar && npx vitest run tests/casa/arte.test.tsx` → PASS. Revisar a ojo 3 SVG abriéndolos (están en `public/arte/cocina/`).
- [ ] **Step 5: Commit** — `feat(arte): taza, lámpara, ventana, basurero, silla, teléfono, gato y comida del refri`.

### Task 3: Acciones y frases nuevas

**Files:**
- Modify: `components/casa/cocina/acciones.ts`, `components/casa/cocina/frases.ts`, `components/casa/audio/manifiesto.ts`
- Test: `tests/casa/acciones.test.ts`, `tests/casa/pinyin.test.ts`, `tests/casa/manifiesto.test.ts`

**Interfaces:**
- Produces: `Accion.sinGesto?: true` (la acción usa la animación de la casa aunque `GESTO_DE[anim]` exista).
- Produces: `Anim` suma `"servirCafe" | "encender" | "apagar" | "abrirVentana" | "cerrarVentana" | "abrirTarro" | "sentarse" | "llamar"`.
- Produces: `acciones(id, E, hora = 12)`; `export const comidaDeLaHora = (h: number) => (h >= 5 && h < 11 ? "早饭" : h < 16 ? "午饭" : "晚饭")` con 5–10 早饭 zǎo fàn "34", 11–15 午饭 wǔ fàn "34", resto 晚饭 wǎn fàn "34".
- Produces frases en `frases.ts`: `HEN_HAO_CHI = 很好吃 hén hǎo chī "231"` (sandhi como `HEN_HAO`), `HEN_RE = 很热 hěn rè "34"`, `HEN_LENG = 很冷 hén lěng "23"`, `WEI = 喂 wéi "2"`, `MAO = 猫 māo "1"`, `WO_ZUO_HAO_FAN_LE = 我做好饭了 wǒ zuò hǎo fàn le "34345"`, `MI = 米 mǐ "3"`, `SHUI = 水 shuǐ "3"`, `HU_LUO_BO = 胡萝卜 hú luó bo "225"`.
- Acciones (verbo · frase · anim):
  - `kafeibei` vacio: 倒咖啡 dào kā fēi "411" · 我倒咖啡 "3411" · servirCafe → cafe. cafe: 喝咖啡 hē kā fēi "111" · 我喝咖啡 "3111" · beber (`sinGesto`) → sucio. sucio: 洗 · 我洗咖啡杯 "33111" · lavar (fregadero) → vacio.
  - `deng` encendida: 关灯 guān dēng "11" · 我关灯 "311" · apagar → apagada. apagada: 开灯 kāi dēng "11" · 我开灯 "311" · encender → encendida.
  - `chuanghu` cerrada: 打开 · 我打开窗户 wǒ dǎ kāi chuāng hu "33115" · abrirVentana → abierta. abierta: 关上 · 我关上窗户 "31515" · cerrarVentana → cerrada.
  - `lajitong`: 打开 · 我打开垃圾桶 "331113" · abrirTarro (sin cambio de estado).
  - `yizi`: 坐 zuò "4" · 我坐下 wǒ zuò xià "344" · sentarse.
  - `shouji`: 打电话 dǎ diàn huà "344" · 我打电话 "3344" · llamar.
  - `zhuozi`, `mao`: sin acciones (solo se tocan).
  - Comer: `wan` lleno → 吃 + `comidaDeLaHora(hora)`: frase 我吃早饭/我吃午饭/我吃晚饭 (verbo 吃饭 se queda). `panzi` lleno sigue con 我吃饺子.
- `frasesUsadas()` incluye: las tres comidas de la hora, `HEN_HAO_CHI`, `HEN_RE`, `HEN_LENG`, `WEI`, `MAO`, `WO_ZUO_HAO_FAN_LE`, `MI`, `SHUI`, `HU_LUO_BO`, los nombres de toda `ComidaId` (Task 2) y `ZHE_SHI` + nombre de los objetos nuevos. `OBJETOS_QUIZ` (玩) suma `kafeibei` y `shouji` (cosas que se pueden pasar).
- Nombres de la comida del refri (en `datos.ts`, `NOMBRES_COMIDA: Record<ComidaId, Silaba[]>`): 苹果 "23", 香蕉 xiāng jiāo "11", 西瓜 xī guā "11", 草莓 cǎo méi "32", 胡萝卜 "225", 西红柿 xī hóng shì "124", 土豆 tǔ dòu "34", 西兰花 xī lán huā "121", 蘑菇 mó gu "25", 牛奶 niú nǎi "23", 鸡蛋 jī dàn "14", 面包 miàn bāo "41", 米 mǐ "3".

- [ ] **Step 1: Tests** — en `acciones.test.ts`: cada acción nueva por estado (tabla de arriba, verbo y frase exactos con `textoHanzi`); `acciones("wan", {...lleno}, 8)` dice 我吃早饭, con 13 → 我吃午饭, con 20 → 我吃晚饭; ninguna acción de un objeto nuevo cambia otro objeto. En `pinyin.test.ts`: agregar cada frase nueva a la tabla. En `manifiesto.test.ts`: `frasesUsadas()` contiene 很好吃, 很热, 很冷, 我做好饭了 y 香蕉.
- [ ] **Step 2–4:** fallar, implementar, pasar.
- [ ] **Step 5: Commit** — `feat(casa): acciones de la taza, lámpara, ventana, basurero, silla y teléfono; comidas según la hora`.

### Task 4: Audios nuevos

**Files:**
- Create: `public/audio/cocina/*.mp3` (los que falten)
- Modify: `scripts/lista-audios.ts` (`REVISAR_COCINA`), `docs/audios.md` (generado)

- [ ] **Step 1:** `npm run audios` → lista lo que falta (exit 1).
- [ ] **Step 2:** Por cada faltante: copiar del banco si existe (palabra sola), si no generar con ElevenLabs (Global Constraints). Frases que terminan en sílaba suelta o tono 3: revisar que la última sílaba no quede cortada (energía de los últimos 50 ms) y, si se corta, generar con algo después y recortar con ffmpeg en el silencio.
- [ ] **Step 3:** Medir cada toma nueva con `medir-tono.mjs`; anotar en `REVISAR_COCINA` las dudosas con la razón y todas las nuevas con "nueva".
- [ ] **Step 4:** `npm run audios` → "faltan 0".
- [ ] **Step 5: Commit** — `feat(audio): frases nuevas de la cocina (? nativo)`.

### Task 5: Objetos nuevos en la casa (animaciones, lámpara, ventana, gato, 热/冷, 好吃)

**Files:**
- Modify: `components/casa/cocina/animar.ts`, `components/casa/useCasa.ts`, `components/casa/Casa.tsx`, `components/casa/Casa.module.css`, `components/casa/camara.ts` (si hace falta para `pie`)
- Test: `tests/casa/Casa.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `useCasa` pasa `new Date().getHours()` a `acciones` (inyectable para tests: `OpcionesCasa.hora?: () => number`).

Comportamiento:
- `servirCafe`: gotas café sobre la taza (como `llenar`), aplica. `beber` con `sinGesto`: la animación de la casa de hoy. Antes de la frase de beber té o café la vaca dice `HEN_RE` después (orden: frase de la acción → 很热).
- `apagar`/`encender`: el escenario de la casa se oscurece (capa encima del cuarto y debajo de la vaca y la UI, `rgba(20,20,50,0.55)`), la capa `luz` de la lámpara se apaga. Los primeros planos y el 玩 no se oscurecen.
- `abrirVentana`: la capa `abierta`; un pájaro (capa `pajaro`) entra volando, da una vuelta y se posa en el marco unos segundos; sfx `whoosh` antes de la voz. `cerrarVentana`: vuelve a `vidrio`.
- `abrirTarro`: la tapa se levanta y baja. Si `mao === "lajitong"`, el gato salta afuera (ver gato).
- `sentarse`: la vaca va a la silla, se achata un poco y queda sentada ~2 s (`clase` sobre la vaca o estado local), luego se para.
- `llamar`: el teléfono va a la mano (`ANCLAS.manoVaca`), la vaca dice 我打电话 y luego `WEI`, vuelve.
- Gato: se ve solo la `cola` en su escondite (`mao` = refri: encima del refri; mesa: debajo de la mesa; chuanghu: en el marco, solo si la ventana está abierta; lajitong: no se ve, sale al abrir). Tocar la cola (o abrir el tarro con el gato adentro): sale el `gato` entero con brillos, la vaca dice `MAO`, evento `encontrar_gato`, y a los 3 s el gato se va al siguiente escondite (orden refri → mesa → lajitong → chuanghu → refri; `chuanghu` se salta si la ventana está cerrada). El estado `mao` se guarda con el avance.
- 很好吃: después de toda acción `comer` (en la casa y al terminar el primer plano de morder), la vaca dice `HEN_HAO_CHI`.
- 很热: al tocar la tetera, después de su nombre.
- `zhuozi` y `shouji` al tocarlos: su nombre (como cualquier objeto).

- [ ] **Step 1: Tests** (en `Casa.test.tsx`, con los helpers que ya usan esos tests y `entrarCasa()`): apagar la lámpara agrega `data-oscura` al escenario y encender lo quita; tocar la cola del gato con `mao: "refri"` hace decir 猫 y, tras 3 s, `estado.mao` es `"mesa"`; abrir el tarro con `mao: "lajitong"` muestra el gato; comer el arroz con `hora: () => 8` dice 我吃早饭 y luego 很好吃; tocar la tetera dice 茶壶 y luego 很热.
- [ ] **Step 2–4:** fallar, implementar, pasar.
- [ ] **Step 5: Commit** — `feat(casa): lámpara, ventana con pájaro, gato escondido, silla, teléfono y taza en la cocina`.

### Task 6: Refri en primer plano

**Files:**
- Create: `components/casa/refri/Refri.tsx`, `components/casa/refri/Refri.module.css`
- Modify: `components/casa/useCasa.ts`, `components/casa/Casa.tsx`
- Test: `tests/casa/Refri.test.tsx`

**Interfaces:**
- Consumes: `ARTE_REFRI`, `ARTE_REFRI_FONDO`, `NOMBRES_COMIDA`, `HEN_LENG`.
- Produces: `CasaApi.refri: boolean` y `CasaApi.cerrarRefri(): void`. `abrir` del refri (acción 打开) aplica `bingxiang: "abierto"`, la cámara se acerca a la puerta (zoom como hoy) y luego aparece el primer plano del refri.

Comportamiento:
- A pantalla completa dentro de la ventana (mismo contenedor y entrada en iris que `PrimerPlano`), fondo `ARTE_REFRI_FONDO`, estantes con la comida de `ComidaId` (botones de 44 px mínimo, `aria-label` en hanzi). Cada estante tiene un poco de escarcha (partículas lentas) para que se lea "frío".
- Tocar una comida: rebota, la vaca (chica, abajo, como en `PrimerPlano`) dice su nombre y, una de cada tres veces, `HEN_LENG`.
- Si el estado lo permite, 苹果 y los 饺子 (cuando `panzi: "limpio"`) muestran un botón ✋ 拿 que ejecuta la acción `sacar` de siempre (sale del primer plano, la animación de la casa).
- Botón 👋 关上: ejecuta la acción `cerrar` de siempre (cierra el primer plano y la puerta). ✕ también cierra el refri.
- Mientras el refri está abierto la casa está `ocupado` (no se puede tocar otra cosa); al cambiar de pestaña (`activo` false) se cierra sin aplicar nada.

- [ ] **Step 1: Tests:** abrir el refri muestra el primer plano con las 13 comidas; tocar 香蕉 dice 香蕉; 拿 苹果 solo aparece con `pingguo: "nada"` y al tocarlo `pingguo` pasa a `sucio` y se cierra el primer plano; 关上 deja `bingxiang: "cerrado"` y `ocupado` false; sin español visible (texto del primer plano solo hanzi/pinyin/emoji).
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** — `feat(casa): el refri por dentro, en primer plano`.

### Task 7: La receta (做饭)

**Files:**
- Create: `components/casa/receta/Receta.tsx`, `components/casa/receta/Receta.module.css`, `components/casa/receta/receta.ts`
- Modify: `components/casa/useCasa.ts`, `components/casa/Casa.tsx`, `components/casa/gestos/medalla.ts` (`cocinar` deja de ir a `girar` suelto: lo maneja la receta)
- Test: `tests/casa/Receta.test.tsx`, `tests/casa/receta.test.ts`

**Interfaces:**
- Produces (puro, `receta.ts`): `type Ingrediente = "mi" | "shui" | "huluobo"`; `INGREDIENTES: readonly Ingrediente[]`; `echar(en: Set<Ingrediente>, i: Ingrediente): Set<Ingrediente>`; `lista(en: Set<Ingrediente>): boolean` (los tres).
- Consumes: `crearGirar()` para revolver, `ARTE_REFRI` (米, 胡萝卜) y un dibujo de agua (jarro) que esta tarea agrega como `ARTE_RECETA.jarro` (`refri_jarro.svg` desde `arte-iso.ts`).

Comportamiento:
- La acción 做饭 de la olla vacía abre la receta en vez del primer plano de girar.
- Arriba, la tarjeta de receta: 米 + 水 + 胡萝卜 con su dibujo y pinyin coloreado por tono (`COLOR_TONO`), sin español. Abajo, la olla grande y los tres ingredientes.
- Arrastrar (o tocar) un ingrediente lo echa a la olla: cae con un pequeño chapoteo (sfx `pop` antes de la voz), la vaca dice su nombre, en la tarjeta queda marcado ✓. Echar uno repetido no hace nada.
- Con los tres, aparece la cuchara 🥄 y el gesto de revolver (`crearGirar`, mismo indicador de mano de hoy). Al completar: la vaca festeja y dice `WO_ZUO_HAO_FAN_LE`; se cierra y `guo` queda `cocido` (con la capa `zanahoria`), vapor como hoy. Sigue el flujo de siempre (盛饭 → 吃 + comida de la hora → 很好吃).
- ✕ a mitad: nada cambia (`guo` sigue `vacio`), la casa queda libre.

- [ ] **Step 1: Tests:** `receta.test.ts`: `echar` no duplica, `lista` solo con los tres. `Receta.test.tsx`: tocar 米, 水, 胡萝卜 en cualquier orden dice cada nombre y marca ✓; antes de los tres no hay cuchara; con revolver completo se oye 我做好饭了 y `guo` queda `cocido`; ✕ deja `guo: "vacio"` y `ocupado` false.
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** — `feat(casa): receta de 米饭 con zanahoria: echar, revolver y 我做好饭了`.

### Task 8: Pulido y verificación de punta a punta

**Files:** los que toquen los hallazgos.

- [ ] **Step 1:** `npm run build` OK; `npm run audios` faltan 0; `npm run fuente` sin cambios.
- [ ] **Step 2:** Revisar los cinco puntos de **Review Focus** uno por uno con un test donde falte.
- [ ] **Step 3:** Actualizar `docs/arte.md` (capas nuevas) y `docs/audios.md` (generado).
- [ ] **Step 4: Commit** — `chore(casa): pulido de la cocina grande`.
