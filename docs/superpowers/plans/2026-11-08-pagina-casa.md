# Chino desde cero: página con la casa interactiva (v1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una página en Vercel cuya portada es la cocina jugable de la vaca (tocar, arrastrar, acciones con estado, primer plano con gestos, quiz), rodeada de secciones con la misma estética, con captura de correo, avance guardado y eventos.

**Architecture:** Next.js App Router. La página es estática salvo la casa, que es un componente cliente. La lógica del juego (estados, acciones, cámara, gestos, medallas, quiz) vive en módulos TypeScript puros y testeados. Los componentes React solo dibujan y conectan eventos. Supabase guarda suscriptores, eventos y avance mediante route handlers del servidor.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript, CSS Modules, Vitest + Testing Library (jsdom), Playwright (smoke), Supabase (`@supabase/supabase-js`, `@supabase/ssr`), `@vercel/analytics`, `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-11-08-pagina-casa-design.md`. El prototipo de referencia está en `docs/prototipo/index.html`: es la fuente de las formas SVG, posiciones, animaciones y tiempos. Se porta; no se inventa de nuevo.

## Global Constraints

- **Dentro de la casa no hay español.** Botones, opciones, carteles y globos llevan hanzi + pinyin + íconos. Las tarjetas, formularios y secciones de la página van en español: segunda persona, cercano.
- Colores de tono fijos: 1 `#E0473C`, 2 `#E8930C`, 3 `#2E9B57`, 4 `#3A6FD6`, 5 (neutro) `#8C8C8C`. Contorno `#4A2A1C`, papel `#FFF6E6`.
- Sandhi como bloque fijo: 你好 = `ní hǎo`, 很好 = `hén hǎo`. Las demás sílabas van con su tono de diccionario.
- Voz de la vaca: ElevenLabs Yating Lin, ID `5eoK8NqMBsMdqUmImHNs`. Sin voz del navegador en producción.
- Los minijuegos no se pierden: el reloj solo decide la medalla (oro < 5 s, plata < 9 s, bronce de ahí en adelante).
- Música casi en cero (volumen 0.03) mientras suena mandarín; los efectos nunca se superponen al mandarín.
- Todo el arte se dibuja en código (SVG con los filtros `crayon` / `crayon-relleno`) o viene de las capas de la vaca. Nada descargado de redes.
- Sin pixel art en el cuarto: la fuente Silkscreen solo en los botones de la interfaz y en el minimapa.
- Fuentes: ZCOOL KuaiLe (hanzi), Nunito 700/900 (texto y pinyin), Silkscreen (interfaz pixel).
- Copia de ventas: "reconoces", nunca "entiendes". Nunca "aprende chino en TikTok". Prueba atribuida ("según un estudio…" + fuente en letra chica).
- Celular vertical primero: a 360 px de ancho no puede haber scroll horizontal, y las zonas táctiles miden ≥ 44 px.
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`. Nunca se suben al repo (`.env.local` va en `.gitignore`).

## Review Focus

1. **Audio que falla o no avisa** (navegador interno de TikTok, mp3 que no carga, autoplay bloqueado): la casa nunca se queda pegada. Toda espera de la voz termina, a más tardar, con el tiempo estimado + 1,5 s. Lo cubre la Task 5 (`decir` resuelve ante error y timeout) y la Task 8 (acción con voz rechazada → `ocupado` vuelve a false).
2. **Gesto interrumpido** (`pointercancel`, el dedo sale de la pantalla, multitoque): el reconocedor se reinicia y el juego sigue jugable. Task 4 (`reiniciar`) y Task 9 (pointercancel a mitad de frotar → se puede completar después).
3. **Celular de 360 px**: sin scroll horizontal, y las opciones flotantes siempre quedan dentro de la pantalla. Task 3 (`ubicarOpciones` las limita entre 12 % y 88 %) y Task 13 (Playwright con viewport 360×740).
4. **`localStorage` que lanza error** (modo privado, cookies bloqueadas): el juego funciona y solo no guarda. Task 12 (`cargarAvance` / `guardarAvance` con `localStorage` que lanza).
5. **El mismo correo enviado dos veces, o doble clic**: responde ok, sin duplicar ni mostrar error. Task 11 (correo repetido → 200) y Task 12 (botón deshabilitado mientras envía).

---

## File Structure

```
app/
  layout.tsx                 fuentes, metadatos, <Analytics/>, filtros SVG globales
  page.tsx                   ensambla: <Casa/> + secciones
  globals.css                tokens (:root), papel mural, cuerpo
  api/suscribir/route.ts     POST correo + consentimiento
  api/eventos/route.ts       POST lote de eventos
  api/avance/route.ts        GET/PUT avance del usuario con sesión
  auth/callback/route.ts     canje del enlace mágico
lib/
  tonos.ts                   COLOR_TONO
  silabas.ts                 Silaba, S(), idAudio(), textoHanzi()
  supabase/servidor.ts       cliente con service role / con cookies
  supabase/navegador.ts      cliente del navegador
components/casa/
  cocina/datos.ts            OBJETOS (posiciones, nombres), ESTADO_INICIAL, FREGADERO
  cocina/acciones.ts         acciones(id, estado) → Accion[]; aplicar()
  cocina/frases.ts           frases fijas (这是, 给我, 对, 不对, medallas, 你好)
  camara.ts                  enfocar(), enPantalla(), puntoJunto(), objetoBajo(), ubicarOpciones()
  gestos/                    cortar.ts frotar.ts llenar.ts beber.ts girar.ts morder.ts medalla.ts
  quiz.ts                    crearQuiz(), responder()
  audio/voz.ts               decir(sils) con boca y timeout
  audio/manifiesto.ts        frasesUsadas()
  audio/sonido.ts            sfx(), musica
  avance.ts                  cargarAvance(), guardarAvance(), sincronizar()
  eventos.ts                 registrar(nombre, datos)
  dibujos/Filtros.tsx        <filter id="crayon">, <filter id="crayon-relleno">
  dibujos/objetos.tsx        <DibujoObjeto id estado/>
  dibujos/Cocina.tsx         fondo del cuarto en 3/4
  Vaca.tsx                   capas, ojos/hocico/orejas por props
  Globo.tsx  Opciones.tsx  Minimapa.tsx  Tarjetas.tsx
  Casa.tsx                   orquesta todo (cliente)
  useCasa.ts                 reducer + efectos de acciones
  primer-plano/PrimerPlano.tsx  (+ un componente por gesto)
components/pagina/
  Entrada.tsx Metodo.tsx Material.tsx Siguenos.tsx Correo.tsx Pie.tsx
  contenido.ts               textos, tarjetas de material, videos de TikTok
public/vaca/ public/sfx/ public/musica/ public/audio/cocina/
scripts/lista-audios.ts      escribe docs/audios.md y verifica que existan los mp3
supabase/migrations/0001_inicial.sql
tests/ (espejo de lib/ y components/), e2e/smoke.spec.ts
```

---

### Task 1: Esqueleto Next.js, estética base y sílabas

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/tonos.ts`, `lib/silabas.ts`
- Test: `tests/lib/silabas.test.ts`

**Interfaces:**
- Produces: `type Tono = 1|2|3|4|5`; `type Silaba = [hanzi: string, pinyin: string, tono: Tono]`; `S(hanzi: string, pinyin: string, tonos: string): Silaba[]`; `idAudio(s: Silaba[]): string`; `textoHanzi(s: Silaba[]): string`; `COLOR_TONO: Record<Tono, string>`. Variables CSS `--tinta --papel --t1..--t5` y la clase `.papel-mural` en `globals.css`.

- [ ] **Step 1: Crear el proyecto** con `npx create-next-app@15 . --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*"` (la carpeta ya tiene `docs/`; dejarla). Agregar `vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react` como dev y el script `"test": "vitest run"`. `vitest.config.ts`: entorno jsdom, alias `@`.
- [ ] **Step 2: Escribir el test que falla**

```ts
import { S, idAudio, textoHanzi } from "@/lib/silabas";
test("S arma una sílaba por hanzi", () => {
  expect(S("杯子", "bēi zi", "15")).toEqual([["杯", "bēi", 1], ["子", "zi", 5]]);
});
test("idAudio: pinyin sin marcas + número de tono, unido con _", () => {
  expect(idAudio(S("我喝水", "wǒ hē shuǐ", "313"))).toBe("wo3_he1_shui3");
  expect(idAudio(S("绿", "lǜ", "4"))).toBe("lv4");
});
test("textoHanzi junta los caracteres", () => {
  expect(textoHanzi(S("这是碗", "zhè shì wǎn", "443"))).toBe("这是碗");
});
test("S rechaza largo distinto", () => {
  expect(() => S("杯子", "bēi", "1")).toThrow();
});
```

- [ ] **Step 3: Correr** `npm test`. Esperado: FAIL, el módulo no existe.
- [ ] **Step 4: Implementar** `lib/silabas.ts` y `lib/tonos.ts` con los valores de Global Constraints. `idAudio` quita las marcas con `normalize("NFD")` y cambia `ü` por `v`.
- [ ] **Step 5: Base visual.** `globals.css` lleva los tokens, `body` con fondo `#2b2238` en la zona de juego y `.papel-mural`, que es el patrón de lunares y hojitas `#F8E7CC`/`#F2C9A8`/`#A9D3C2` copiado del `<pattern id="papel">` del prototipo como SVG en data URI. `layout.tsx` carga las tres fuentes con `next/font/google` en variables `--f-hanzi --f-texto --f-pixel`, `lang="es"` y título "Chino desde cero". `page.tsx` es temporal: un `<h1>` con la clase `.papel-mural`.
- [ ] **Step 6: Correr** `npm test && npm run build`. Esperado: PASS y build ok.
- [ ] **Step 7: Commit** `feat: esqueleto Next.js, tokens y sílabas`.

### Task 2: Estados y acciones de la cocina

**Files:**
- Create: `components/casa/cocina/datos.ts`, `components/casa/cocina/acciones.ts`, `components/casa/cocina/frases.ts`
- Test: `tests/casa/acciones.test.ts`

**Interfaces:**
- Consumes: `S`, `Silaba` (Task 1).
- Produces:
  - `type ObjetoId = "beizi"|"wan"|"panzi"|"kuaizi"|"pingguo"|"bingxiang"|"guo"|"chahu"`.
  - `type EstadoCocina = Record<ObjetoId, string>`; `ESTADO_INICIAL` = `{ beizi:"vacio", wan:"vacio", panzi:"lleno", kuaizi:"limpio", pingguo:"sucio", bingxiang:"cerrado", guo:"vacio", chahu:"lleno" }`.
  - `OBJETOS: Record<ObjetoId, { nombre: Silaba[]; x: number; y: number; w: number; fijo?: boolean }>`. Posiciones copiadas del prototipo: beizi 600,668,62 · wan 700,640,80 · panzi 700,730,100 · kuaizi 810,700,80 · pingguo 594,300,58 · bingxiang 100,345,210, fijo · guo 741,292,96 · chahu 310,292,84. También `FREGADERO = { x: 450, y: 318 }`.
  - `type Anim = "llenar"|"servirTe"|"beber"|"tomar"|"comer"|"lavar"|"abrir"|"cerrar"|"cortar"|"cocinar"|"servirArroz"|"sacar"`.
  - `interface Accion { verbo: Silaba[]; icono: string; frase: Silaba[]; anim: Anim; lugar?: "fregadero"; objeto?: ObjetoId; sfx: string; cambia?: Partial<EstadoCocina> }`.
  - `acciones(id: ObjetoId, e: EstadoCocina): Accion[]` y `aplicar(e: EstadoCocina, a: Accion): EstadoCocina` (inmutable).
  - `frases.ts`: `ZHE_SHI, GEI_WO, DUI, BU_DUI, TAI_BANG_LE ("太棒了","tài bàng le","445"), HEN_HAO ("很好","hén hǎo","23"), HAO ("好","hǎo","3"), NI_HAO ("你好","ní hǎo","23")`.

- [ ] **Step 1: Escribir los tests que fallan**, uno por ciclo del spec. Cada test encadena `aplicar` con la acción encontrada por su verbo (`hanzi`):

```ts
const hacer = (e, id, verbo) => {
  const a = acciones(id, e).find(x => textoHanzi(x.verbo) === verbo);
  if (!a) throw new Error(`${id} no ofrece ${verbo} en ${JSON.stringify(e)}`);
  return aplicar(e, a);
};
test("plato: 吃饺子 → sucio → solo 洗 → limpio → 冰箱 abierto ofrece 拿饺子 → lleno", ...);
test("manzana sucia solo ofrece 洗, y se lava en el fregadero", () => {
  expect(acciones("pingguo", ESTADO_INICIAL).map(a => textoHanzi(a.verbo))).toEqual(["洗"]);
  expect(acciones("pingguo", ESTADO_INICIAL)[0].lugar).toBe("fregadero");
});
test("manzana: 洗 → 切 → 吃 → nada; con 冰箱 abierto aparece 拿苹果 y vuelve sucia", ...);
test("vaso: 倒水 → 喝 → sucio → 洗 → vacío; 倒茶 desde el vaso o desde el 茶壶 → te", ...);
test("茶壶 no ofrece nada si el vaso no está vacío", ...);
test("arroz: 做饭 → 锅 cocido → 盛饭 (desde 碗 o 锅) → 碗 lleno, 锅 sucio → 吃饭 → 碗 sucio", ...);
test("冰箱: 打开 / 关上; cerrado no ofrece 拿", ...);
test("toda acción tiene frase que empieza con 我 y verbo sin español", () => {
  // recorre todos los estados alcanzables desde ESTADO_INICIAL (BFS con aplicar)
  // y revisa: frase[0][0] === "我", y que verbo/frase no contengan [a-zA-Z] fuera del pinyin
});
```

- [ ] **Step 2: Correr** `npm test -- acciones`. Esperado: FAIL.
- [ ] **Step 3: Implementar** `acciones` y `aplicar`. La tabla de verbos, frases, íconos, `sfx` y `cambia` se copia de la función `acciones()` del prototipo (`docs/prototipo/index.html`). Los tonos van tal como están ahí.
- [ ] **Step 4: Correr** `npm test`. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: estados y acciones de la cocina`.

### Task 3: Cámara y geometría

**Files:**
- Create: `components/casa/camara.ts`
- Test: `tests/casa/camara.test.ts`

**Interfaces:**
- Consumes: `OBJETOS`, `FREGADERO`, `ObjetoId`, `EstadoCocina` (Task 2).
- Produces (unidades de cuarto 0–1000; porcentajes de pantalla 0–100):
  - `type Camara = { x: number; y: number; s: number }`; `enfocar(x, y, s): Camara`, que limita el centro para no mostrar fuera del cuarto (`mitad = 500/s`).
  - `transformCSS(c: Camara): string` → `translate(tx%, ty%) scale(s)` con `tx = 50 - x*s/10`.
  - `enPantalla(c, x, y): { x: number; y: number }`.
  - `puntoJunto(id: ObjetoId | "fregadero"): { x; y }`: fregadero 450,560 · bingxiang 270,580 · objetos con y < 400 → (o.x, 560) · mesa → (430, o.y+130).
  - `limitarVaca(x, y)`: x entre 80 y 920, y entre 520 y 990.
  - `objetoBajo(vaca: {x;y}, e: EstadoCocina): ObjetoId | null`: el más cercano a (vaca.x, vaca.y-90) dentro de `w/2+70`; ignora los que están en estado `"nada"`.
  - `ubicarOpciones(c: Camara, id: ObjetoId, n: number): {x;y}[]`: abanico hacia el centro de la pantalla (55 % de alto), radio 20 %, separación 0.85 rad, limitado a x∈[16,84] e y∈[12,90] (en celular vertical, x∈[12,88]).

- [ ] **Step 1: Tests que fallan**: `enfocar(0,0,2)` da centro (250,250); `enfocar(500,500,1)` da transform `translate(0%, 0%) scale(1)`; `objetoBajo` con la vaca encima de la manzana en estado `"nada"` da `null`; `ubicarOpciones` para el refri (esquina) con zoom 1.9 devuelve 3 puntos dentro de los límites.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr**. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: cámara y geometría de la casa`.

### Task 4: Reconocedores de gestos y medalla

**Files:**
- Create: `components/casa/gestos/{tipos,cortar,frotar,llenar,beber,girar,morder,medalla}.ts`
- Test: `tests/casa/gestos.test.ts`

**Interfaces:**
- Produces (coordenadas normalizadas 0–1 dentro de la zona del gesto; tiempo en ms):
  - `interface Gesto { abajo(p: P, t: number): void; mover(p: P, t: number): void; arriba(p: P, t: number): void; tic(t: number): void; reiniciar(): void; progreso(): number; listo(): boolean }` con `type P = { u: number; v: number }`.
  - `crearCortar()`: un corte cuenta si el trazo mide > 0.22 y cruza la franja central. Hacen falta 3 cortes.
  - `crearFrotar()`: suma el recorrido dentro de [-0.1, 1.1]; meta = 5.
  - `crearLlenar()`: mientras está apretado, el nivel sube 0.32/s. Al soltar con el nivel en [0.62, 0.95] → listo. Si pasa de 1 → el nivel vuelve a 0.25 y `rebalso()` devuelve true una vez.
  - `crearBeber()`: mientras está apretado, el nivel baja 0.3/s desde 0.8; listo en ≤ 0.
  - `crearGirar()`: suma |Δángulo| alrededor de (0.5, 0.5); meta = 3 vueltas (6π).
  - `crearMorder()`: cada `abajo` dentro de [0,1] cuenta como mordisco; meta = 6.
  - `medalla(segundos: number): "oro"|"plata"|"bronce"` con < 5 oro, < 9 plata.
  - `GESTO_DE: Partial<Record<Anim, "cortar"|"frotar"|"llenar"|"beber"|"girar"|"morder">>` = cortar→cortar, lavar→frotar, llenar→llenar, servirTe→llenar, beber→beber, cocinar→girar, comer→morder.

- [ ] **Step 1: Tests que fallan.** Uno por gesto, con el camino feliz hasta `listo()`. Además:
  - Cortar: un trazo corto (0.1) no cuenta.
  - Llenar: mantener 4 s rebalsa (`rebalso()` → true y nivel 0.25). Soltar en 0.5 no completa.
  - Frotar: `reiniciar()` a mitad deja el recorrido acumulado, pero corta el trazo, así que el siguiente `mover` sin `abajo` no suma. Esto cubre el Review Focus 2.
  - Girar: ir y volver media vuelta cuenta como recorrido (suma valores absolutos).
  - `medalla(4.9) === "oro"`, `medalla(5) === "plata"`, `medalla(30) === "bronce"`.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr**. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: reconocedores de gestos y medallas`.

### Task 5: Voz de la vaca, sonido y manifiesto de audios

**Files:**
- Create: `components/casa/audio/voz.ts`, `components/casa/audio/sonido.ts`, `components/casa/audio/manifiesto.ts`, `scripts/lista-audios.ts`
- Test: `tests/casa/voz.test.ts`, `tests/casa/manifiesto.test.ts`

**Interfaces:**
- Consumes: `idAudio` (Task 1), `acciones`, `OBJETOS`, `ESTADO_INICIAL`, `frases` (Task 2).
- Produces:
  - `decir(s: Silaba[], opciones?: { alBoca?: (abierta: number) => void; lento?: boolean }): Promise<void>`. Toca `/audio/cocina/${idAudio(s)}.mp3` (si `lento`, `…_lento.mp3`). Mientras suena, llama a `alBoca` con el volumen 0–1 (WebAudio `AnalyserNode`, ~30 veces/s) y baja la música a 0.03. **Siempre resuelve**: al terminar, ante un error, si `play()` es rechazado o al pasar `500 + 380·sílabas + 1500` ms. Un `decir` nuevo corta el anterior, que también resuelve.
  - `desbloquearAudio(): void`: se llama en el primer toque (botón "Entrar") y crea/reanuda el `AudioContext`.
  - `sfx(nombre: string)` con volumen 0.55, `musica.tocar(pista)`, `musica.volumen(v)`; pistas `"cocina"` y una por gesto (`"g-cortar"`, …).
  - `frasesUsadas(): Silaba[][]`: todas las frases que la casa puede decir (nombres, 这是+nombre, 给我+nombre, frases y verbos de todas las acciones alcanzables, medallas, 对/不对, 你好), sin repetidas por `idAudio`.
  - `npm run audios`: `scripts/lista-audios.ts` escribe `docs/audios.md` (tabla: archivo, hanzi, pinyin, ¿existe?) y termina con código 1 si falta algún mp3.

- [ ] **Step 1: Tests que fallan.**
  - `voz.test.ts` con un `Audio` falso: (a) `decir` resuelve con `onended`; (b) resuelve si `play()` rechaza; (c) con timers falsos, resuelve al llegar al timeout aunque el audio nunca avise (Review Focus 1); (d) un segundo `decir` hace resolver al primero.
  - `manifiesto.test.ts`: `frasesUsadas()` incluye `wo3_he1_shui3`, `zhe4_shi4_bei1_zi5`, `gei3_wo3_wan3`, `tai4_bang4_le5`, `ni2_hao3`, y no tiene ids repetidos.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Agregar el script `"audios": "tsx scripts/lista-audios.ts"` (dev dependency `tsx`).
- [ ] **Step 4: Correr** `npm test`. Esperado: PASS. `npm run audios` debería FALLAR todavía (faltan los mp3): está bien, es lo que resuelve la Task 6.
- [ ] **Step 5: Commit** `feat: voz con boca y timeout, sonidos y manifiesto de audios`.

### Task 6: Generar audios, música y efectos

Es una tarea de assets, sin código de producto. Se apoya en el proyecto padre `../video/` y en el MCP de ElevenLabs. **Si el MCP de ElevenLabs no está conectado en la sesión, detenerse y pedirle a la dueña que lo conecte.** No usar otra voz.

**Files:**
- Create: `public/audio/cocina/*.mp3`, `public/musica/{cocina,g-cortar,g-frotar,g-llenar,g-beber,g-girar,g-morder}.mp3`, `public/sfx/*.mp3`, `docs/audios.md`

- [ ] **Step 1:** `npm run audios` para la lista de lo que falta. Por cada frase, buscar primero en `../video/public/audio/banco/` y en `../video/public/audio/comun/`; si existe la misma frase, copiarla con el nombre `idAudio`.
- [ ] **Step 2:** Generar lo que falte con `text_to_speech`, voz `5eoK8NqMBsMdqUmImHNs`, siguiendo `../flujo-de-video.md` §14 (modelos, el truco del 是 para el 2.º tono, 2–3 tomas). Medir cada toma con `node ../video/scripts/medir-tono.mjs <mp3>` y quedarse con la de contorno correcto. Vigilar erhua, sandhi del 3.er tono y tono neutro.
- [ ] **Step 3:** Agregar las tomas nuevas también a `../video/public/audio/banco/` (regla del banco: cada palabra se genera una sola vez).
- [ ] **Step 4:** Música con `compose_music`: un loop de cocina (toque chino suave como `../video/public/musica/fondo.mp3`, instrumental, ~96 BPM) y 6 loops cortos de 8–15 s, uno por gesto, más rítmicos. Copiar los efectos `pop ding boing tragos nam pop-burbuja whoosh golpe brillo` desde `../video/public/sfx/`.
- [ ] **Step 5:** `npm run audios`. Esperado: termina con código 0 y `docs/audios.md` sin faltantes.
- [ ] **Step 6: Commit** `assets: audios de la cocina, música y efectos`.

### Task 7: Arte: filtros, vaca, objetos y cocina en 3/4

**Files:**
- Create: `components/casa/dibujos/Filtros.tsx`, `components/casa/dibujos/objetos.tsx`, `components/casa/dibujos/Cocina.tsx`, `components/casa/Vaca.tsx`, `public/vaca/*.png`
- Test: `tests/casa/dibujos.test.tsx`

**Interfaces:**
- Consumes: `ObjetoId`, `OBJETOS` (Task 2).
- Produces:
  - `<Filtros/>`: SVG oculto con `#crayon` y `#crayon-relleno` (valores de `../video/src/Texto.tsx`, `scale` 4). Se monta una vez, en `layout.tsx`.
  - `<DibujoObjeto id={ObjetoId} estado={string} />`: SVG con viewBox `-60 -60 120 120`. Las partes que dependen del estado llevan `data-solo="a b"` y se muestran solo si `estado` está en la lista. El refri recibe `abierto` como clase de la puerta.
  - `<Cocina/>`: SVG del cuarto, viewBox `0 0 1000 1000`, portado de `casa()` del prototipo, con la sombra del refri en 105,462.
  - `<Vaca ojos hocico orejas salta />`: `ojos ∈ abiertos|cerrados|felices|izquierda|sorpresa`, `hocico ∈ punto|o|abierta|sonrisa|neutra`, `orejas ∈ normales|arriba`. Todas las capas montadas, cambia la opacidad. Borde blanco de sticker por `filter` (4 px). Respira por CSS. Parpadeo automático cada ~3,4 s cuando `ojos === "abiertos"`.

- [ ] **Step 1:** Copiar las capas desde `../video/public/img/`: `vaca_cuerpo.png`, `vaca_cuerpo_orejas.png`, `vaca_ojos_*.png` (5), `vaca_hocico_*.png` (5).
- [ ] **Step 2: Tests que fallan:** `DibujoObjeto` de `panzi` en `"lleno"` muestra los 饺子 (grupo `data-solo="lleno"` visible) y oculta las manchas; en `"sucio"`, al revés. `pingguo` en `"cortado"` oculta la manzana entera. `Vaca` con `ojos="felices"` deja una sola capa de ojos con opacidad 1.
- [ ] **Step 3: Correr**. Esperado: FAIL.
- [ ] **Step 4: Implementar**, portando los SVG del prototipo (`DIBUJO` y `casa()`) a JSX. Los helpers `F` (relleno con `crayon-relleno` + contorno con `crayon`) y `T` (trazo) pasan a ser componentes `<Forma d fill grosor/>` y `<Trazo d color grosor/>`.
- [ ] **Step 5: Correr**. Esperado: PASS.
- [ ] **Step 6: Commit** `feat: arte de la cocina, objetos y vaca`.

### Task 8: La casa jugable (tocar, arrastrar, acciones, cámara)

**Files:**
- Create: `components/casa/useCasa.ts`, `components/casa/Casa.tsx`, `components/casa/Casa.module.css`, `components/casa/Globo.tsx`, `components/casa/Opciones.tsx`
- Modify: `app/page.tsx` (montar `<Casa/>`)
- Test: `tests/casa/Casa.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 3, 5 y 7.
- Produces:
  - `useCasa()` → `{ estado: EstadoCocina; camara: Camara; vaca: {x;y}; cara: {ojos;hocico;orejas}; globo: Silaba[] | null; opciones: { id: ObjetoId; lista: Accion[] } | null; ocupado: boolean; primerPlano: { accion: Accion; objeto: ObjetoId } | null; tocar(id); soltarObjetoEnVaca(id); soltarVaca(x, y); elegir(id, accion); verTodo(); terminarPrimerPlano(medalla) }`.
  - `<Casa onEvento={(nombre, datos) => void} />`. Las props de eventos las usa la Task 12.
- Comportamiento (del spec y del prototipo):
  - Tocar (movimiento < 12 unidades): `decir(nombre)`, brillo y temblor, la vaca mira de reojo.
  - Arrastrar el objeto hasta < 130 unidades de (vaca.x, vaca.y-100), o la vaca sobre un objeto (`objetoBajo`): la vaca va a `puntoJunto`, la cámara hace zoom 1.9, dice 这是+nombre y aparecen las opciones.
  - Elegir una acción: camina, zoom 2.2 (al fregadero si `lugar`). Si `GESTO_DE[anim]` existe, abre `primerPlano`; si no, hace la animación en la casa (portada del `switch` de `hacer()` del prototipo). Después llama a `aplicar` y muestra las opciones siguientes del objeto (o del 杯子 / 碗 tras 倒茶 / 盛饭).
  - El refri (`fijo`) no se arrastra. Tocar el piso o ⤢ llama a `verTodo()`.
  - Mientras `ocupado`, se ignoran los arrastres y los toques sobre objetos.

- [ ] **Step 1: Tests que fallan** (Testing Library, `decir` mockeado):
  - Tocar 杯子 llama a `decir` con el nombre y el globo muestra 杯 y `bēi`.
  - `soltarObjetoEnVaca("panzi")` muestra la opción 吃饺子. Elegirla con el primer plano resuelto (`terminarPrimerPlano("oro")`) deja `panzi` en `"sucio"` y la única opción visible es 洗.
  - Con `decir` que **rechaza**, `elegir` termina con `ocupado === false` (Review Focus 1).
  - Ningún texto visible dentro de `<Casa/>` coincide con `/[áéíóúñ]|\b(el|la|de|que)\b/i` fuera del pinyin. Revisar los nodos `[data-texto]`.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar.** El `ocupado` se libera siempre en un `finally`.
- [ ] **Step 4: Correr**. Esperado: PASS. Luego `npm run dev` y probar a mano en el navegador: un ciclo completo del plato.
- [ ] **Step 5: Commit** `feat: casa jugable con acciones y cámara`.

### Task 9: Primer plano con gestos

**Files:**
- Create: `components/casa/primer-plano/PrimerPlano.tsx`, `PrimerPlano.module.css`, `Vaso.tsx`, `Olla.tsx`
- Test: `tests/casa/PrimerPlano.test.tsx`

**Interfaces:**
- Consumes: gestos (Task 4), `DibujoObjeto` (Task 7), `decir` y `musica` (Task 5).
- Produces: `<PrimerPlano accion={Accion} objeto={ObjetoId} estado={EstadoCocina} alTerminar={(m: "oro"|"plata"|"bronce") => void} />`.
- Comportamiento: transición de iris (`clip-path: circle`) de 0.5 s. Fondo por gesto: cortar → tabla (cuadrillé rojo), frotar → agua (cuadrillé azul), llenar/beber → mesa (cuadrillé verde), girar → fuego (lunares amarillos), morder → comer (lunares rosados). Cartel con ícono + verbo + pinyin en colores de tono, barra de avance, reloj, mano guía hasta el primer toque y vaca chica abajo a la izquierda que copia la cara. Al empezar, la vaca dice `accion.frase`. Al completar: medalla con rayos y confeti, la vaca dice 太棒了 / 很好 / 好 según `medalla(segundos)`, iris de salida y `alTerminar`. La pista de música es `g-<gesto>`; la de la cocina vuelve al salir. Los listeners son pointer events con `setPointerCapture`, y `pointercancel` llama a `reiniciar()`. Visuales (vaso con nivel y chorro, mugre que se borra, espuma, mordiscos con `<mask>`, trozos que giran) portados del prototipo.

- [ ] **Step 1: Tests que fallan** (eventos de puntero simulados y timers falsos):
  - Morder: 6 toques → `alTerminar` con `"oro"` si pasó < 5 s.
  - Frotar: `pointercancel` a mitad del trazo, y después un trazo nuevo que completa → `alTerminar` se llama una sola vez (Review Focus 2).
  - Llenar: mantener 4 s rebalsa y no termina; mantener ~2,3 s y soltar → termina.
  - El cartel muestra `textoHanzi(accion.verbo)` y ningún texto en español.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr**. Esperado: PASS. Probar a mano en el celular los 6 gestos (con `npm run dev -- -H 0.0.0.0` y la IP local).
- [ ] **Step 5: Commit** `feat: primer plano con gestos y medallas`.

### Task 10: Quiz, tarjeta del método y cuartos "pronto"

**Files:**
- Create: `components/casa/quiz.ts`, `components/casa/Minimapa.tsx`, `components/casa/Tarjetas.tsx`
- Modify: `components/casa/Casa.tsx`, `components/casa/useCasa.ts`
- Test: `tests/casa/quiz.test.ts`, `tests/casa/Tarjetas.test.tsx`

**Interfaces:**
- Produces:
  - `crearQuiz(e: EstadoCocina, azar: () => number): { rondas: ObjetoId[] }`: 4 objetos distintos entre `beizi wan panzi kuaizi chahu guo` + `pingguo` si no está en `"nada"`.
  - `responder(q, i: number, id: ObjetoId): "bien"|"mal"`.
  - `<Minimapa cuartoActual="cocina" alTocarBloqueado={(cuarto) => void} />`: grilla 2×2 con íconos 🍳🛏️🛋️🛁, candado en los tres de abajo; abajo a la derecha, con fuente pixel.
  - `<Tarjetas>` con tres capas en español: `entrada` (浸, línea de tono azul, "Método Jìn", "Sumérgete. Toca, arrastra, escucha.", botón "Entrar a la casa", que llama a `desbloquearAudio()` y a `decir(NI_HAO)`), `metodo` (texto del prototipo "Lo acabas de hacer…") y `pronto` ("Este cuarto abre pronto. Deja tu correo y te avisamos.", con el formulario de la Task 12; si ya dejó su correo: "Ya estás anotada/o. Te avisamos cuando abra.").
- Comportamiento: botón 玩 wán. La vaca dice 给我+nombre y el globo muestra solo `给我 ？`. Arrastrar el objeto correcto → ding, 对, siguiente ronda; uno incorrecto → boing, 不对, repite la ronda. Hay botón 🔊 para repetir. Al terminar, la tarjeta `metodo` y luego la invitación al correo.

- [ ] **Step 1: Tests que fallan:** `crearQuiz` con azar fijo da 4 ids distintos y nunca `pingguo` en `"nada"`; `responder` bien/mal; la tarjeta `pronto` muestra el texto de "ya anotada" cuando `anotado=true`.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr**. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: quiz, tarjeta del método y cuartos pronto`.

### Task 11: Supabase: tablas y rutas del servidor

**Files:**
- Create: `supabase/migrations/0001_inicial.sql`, `lib/supabase/servidor.ts`, `lib/supabase/navegador.ts`, `app/api/suscribir/route.ts`, `app/api/eventos/route.ts`, `app/api/avance/route.ts`, `app/auth/callback/route.ts`, `lib/eventos-nombres.ts`, `.env.example`
- Test: `tests/api/suscribir.test.ts`, `tests/api/eventos.test.ts`

**Interfaces:**
- Tablas:
  - `suscriptores(email text primary key, consentimiento boolean not null, origen text, creado timestamptz default now(), plan text default 'gratis')`. `plan` es el lugar para los pagos futuros.
  - `eventos(id bigserial, sesion text not null, nombre text not null, datos jsonb, creado timestamptz default now())`.
  - `avance(user_id uuid primary key references auth.users, datos jsonb not null, actualizado timestamptz default now())`, con RLS: `user_id = auth.uid()` para select, insert y update.
  - En `suscriptores` y `eventos`, RLS activado sin políticas públicas: solo el service role escribe.
- `POST /api/suscribir` `{ email, consentimiento: boolean, origen?: string }`:
  - Correo inválido → 400 `{ error: "correo" }`.
  - Ok → upsert en `suscriptores` (si ya existe, actualiza el consentimiento solo si viene en true) + `auth.signInWithOtp({ email, options: { emailRedirectTo: NEXT_PUBLIC_SITE_URL + "/auth/callback" } })` → 200 `{ ok: true }`.
  - Un correo repetido también da 200. Si falla el envío del enlace, igual da 200 (queda anotada) y se registra el error en el servidor.
- `POST /api/eventos` `{ sesion, eventos: { nombre, datos? }[] }`: máximo 50 por lote, `nombre` de la lista blanca `NOMBRES_EVENTO` de `lib/eventos-nombres.ts` (`entrar, tocar_objeto, abrir_acciones, gesto_completo, quiz_completo, ver_metodo, tocar_bloqueado, dejar_correo, clic_tiktok, descargar_material`; exporta también `type NombreEvento`) → 204. Si no cumple → 400.
- `GET/PUT /api/avance`: con sesión de Supabase (cookies por `@supabase/ssr`) lee o escribe `datos`; sin sesión → 401.
- `GET /auth/callback?code=` → `exchangeCodeForSession` y redirige a `/?bienvenida=1`.

- [ ] **Step 1: Tests que fallan** (con el cliente de Supabase mockeado): correo `"hola"` → 400; correo válido → 200 y llama a upsert y a `signInWithOtp`; el mismo correo dos veces → 200 las dos (Review Focus 5); si `signInWithOtp` lanza → 200; eventos con 51 elementos → 400; eventos con nombre fuera de la lista → 400.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar** la migración, los clientes y las rutas. `.env.example` lleva las 4 variables vacías.
- [ ] **Step 4: Correr**. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: supabase, suscripción, eventos y avance`.

### Task 12: Correo, avance y eventos en el navegador

**Files:**
- Create: `components/casa/avance.ts`, `components/casa/eventos.ts`, `components/pagina/Correo.tsx`
- Modify: `components/casa/Casa.tsx` (conectar avance y eventos), `components/casa/Tarjetas.tsx` (formulario en `pronto`)
- Test: `tests/casa/avance.test.ts`, `tests/pagina/Correo.test.tsx`

**Interfaces:**
- Produces:
  - `interface Avance { estado: EstadoCocina; medallas: Partial<Record<string, "oro"|"plata"|"bronce">>; escuchadas: string[]; correo?: string }`.
  - `cargarAvance(): Avance`, que devuelve el inicial si no hay nada o si `localStorage` lanza; `guardarAvance(a: Avance): void`, que nunca lanza. Clave `cdc.avance.v1`.
  - `sincronizar(a: Avance): Promise<void>`: si hay sesión de Supabase, hace `PUT /api/avance`; al iniciar sesión, gana el avance con más `escuchadas`.
  - `registrar(nombre: NombreEvento, datos?: object)`: junta en cola y envía cada 5 s o al `pagehide` (`navigator.sendBeacon`). `sesion` es un uuid en `sessionStorage`.
  - `NombreEvento` se importa de `lib/eventos-nombres.ts` (Task 11).
  - `<Correo origen={string} />`: campo de correo, casilla **sin marcar** "Quiero recibir novedades de Chino desde cero (cuartos nuevos, material y ofertas). Puedo darme de baja cuando quiera." y botón "Avísame". Mientras envía, el botón queda deshabilitado. Si sale bien: guarda `correo` en el avance y muestra "¡Listo! Te llegará un enlace para guardar tu avance en cualquier dispositivo." Si sale mal, muestra un error amable.
- [ ] **Step 1: Tests que fallan:** con `localStorage.getItem` que lanza → `cargarAvance()` devuelve el inicial y `guardarAvance` no lanza (Review Focus 4); doble clic en "Avísame" → un solo `fetch` (Review Focus 5); la casilla empieza sin marcar y se envía `consentimiento: false` si no se marca.
- [ ] **Step 2: Correr**. Esperado: FAIL.
- [ ] **Step 3: Implementar** y conectar en `Casa`: guardar tras cada `aplicar` y medalla, `registrar` en cada punto de la lista y restaurar el estado al cargar.
- [ ] **Step 4: Correr**. Esperado: PASS.
- [ ] **Step 5: Commit** `feat: correo con consentimiento, avance guardado y eventos`.

### Task 13: La página alrededor de la casa

**Files:**
- Create: `components/pagina/{Metodo,Material,Siguenos,Pie}.tsx`, `components/pagina/contenido.ts`, `components/pagina/pagina.module.css`, `e2e/smoke.spec.ts`, `playwright.config.ts`
- Modify: `app/page.tsx`, `app/layout.tsx` (`<Analytics/>` de `@vercel/analytics/react`)
- Test: `tests/pagina/secciones.test.tsx`, `e2e/smoke.spec.ts`

**Interfaces:**
- `contenido.ts`: `METODO` (título "Cómo funciona el Método Jìn" y tres ideas: "Escuchas primero", "La imagen te dice qué significa", "Repites jugando", cada una con una línea de texto breve; si se cita un estudio, va con su fuente en letra chica), `MATERIAL: { titulo; descripcion; estado: "pronto" | { url: string } }[]` (inicial: una tarjeta "Mazos de Anki por bloque de videos", `"pronto"`), `TIKTOK = { nombre: "chino comprensible", url: string, videos: { titulo; miniatura; url }[] }`. Confirmar el @ y la URL exacta con la dueña antes del deploy; mientras tanto, `videos: []` muestra solo el botón al perfil.
- Orden de la página: `<Casa/>` a pantalla completa (alto `100svh`) → `<Metodo/>` → `<Material/>` → `<Siguenos/>` → `<Pie/>` con `<Correo origen="pie"/>`.
- Estética: fondo `.papel-mural`, tarjetas con borde 4 px `--tinta`, radio 26 px, sombra `0 8px 0 rgba(0,0,0,.3)`; títulos en Nunito 900, hanzi en ZCOOL KuaiLe, botones con la fuente pixel. Cada sección lleva un detalle dibujado a crayón (reusar `<DibujoObjeto/>` o la vaca).
- En celular vertical, la casa se encuadra con zoom y paneo en vez de achicarse: la cámara arranca con `s` tal que el cuarto llene el alto (ver `enfocar`), y arrastrar el piso desplaza la cámara (paneo). Tocar el piso sin arrastrar sigue llamando a `verTodo()`, que en vertical vuelve a ese encuadre inicial.

- [ ] **Step 1: Tests que fallan:** las secciones renderizan sus títulos; una tarjeta de material `"pronto"` muestra "Pronto" y un `<Correo origen="material"/>`; en el texto de la página no aparece "entiendes" ni "aprende chino en TikTok".
- [ ] **Step 2: Smoke de Playwright** (`npx playwright install chromium`), con viewport 360×740 y 1280×800: entrar, tocar el 杯子 → el globo muestra 杯子; `document.documentElement.scrollWidth <= innerWidth` (Review Focus 3); bajar hasta el pie y que exista el campo de correo.
- [ ] **Step 3: Correr** `npm test` y `npx playwright test`. Esperado: FAIL.
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Correr ambos**. Esperado: PASS. Tomar capturas en los dos tamaños y revisarlas a ojo contra el prototipo.
- [ ] **Step 6: Commit** `feat: página completa alrededor de la casa`.

### Task 14: Deploy en Vercel

**Files:**
- Create: `README.md` (cómo correr, variables, migración, deploy)

- [ ] **Step 1:** `npm run build && npm test && npm run audios`. Esperado: todo ok.
- [ ] **Step 2:** Crear el proyecto de Supabase (lo hace la dueña o lo autoriza), correr `supabase/migrations/0001_inicial.sql` y configurar en Auth la URL del sitio y la redirección `/auth/callback`. Personalizar en español la plantilla del correo del enlace mágico.
- [ ] **Step 3:** Vincular el repo en Vercel, cargar las 4 variables y activar Web Analytics. **Pedir confirmación a la dueña antes de publicar.**
- [ ] **Step 4:** Probar en el preview, desde un celular, dentro del navegador de TikTok (abriendo el link desde un DM): entrar, oír la voz, completar un gesto, dejar un correo, recibir el enlace y verificar que la fila aparezca en `suscriptores` y en `eventos`.
- [ ] **Step 5: Commit** `docs: readme y deploy`.
