# Escenarios desde una ficha

Un escenario (un cuarto de la casa o, más adelante, un mundo como el restaurante) se escribe como **ficha de datos** y el código lo dibuja en isometría, con la misma paleta, proyección y contorno café que la cocina y el living. Ya están hechos así el baño (`components/casa/escenarios/bano.ts`) y el dormitorio (`dormitorio.ts`), que se ven amueblados en la casa entera como adelanto, todavía sin poder entrar.

## Hacer un escenario nuevo

1. Copia `components/casa/escenarios/dormitorio.ts` con el nombre del cuarto nuevo y cambia los datos:
   - `ambiente`: piso (`tablas` o `baldosas` con su color), color de cada pared y del zócalo, y opcionalmente un `friso` (azulejos hasta cierta altura).
   - `colgados`: lo que va en las paredes (`ventana`, `cuadro`, `repisa`, `toallero`). `pared: "izq"` es la de la izquierda y `"der"` la de la derecha; `desde` y `hasta` miden a lo largo de la pared (0 = esquina del fondo, 10 = punta de adelante); `z0` y `z1` son la altura (la pared mide 6,2).
   - `muebles`: lo que va en el piso, cada uno con su `base` (el rectángulo que ocupa: `u` corre por la pared derecha, `v` por la izquierda, de 0 a 10). El `id` es el pinyin del objeto (`chuang` = chuáng, cama): será su objeto cuando el cuarto se pueda jugar.
2. Súmalo a la lista de `components/casa/escenarios/index.ts`.
3. Corre `npm run arte:generar`. Sale `public/arte/<id>/cuarto_<id>.svg` y, si el cuarto está en la casa, la casa entera se rehace con él.
4. Corre `npm test`. Si un mueble se sale del piso, dos se pisan o algo colgado se sale de la pared, la prueba (y el mismo `arte:generar`) dice cuál.

Para ver el dibujo sin abrir el juego, abre el SVG en el navegador.

## Muebles que ya existen

| `tipo` | Qué es | Notas |
|---|---|---|
| `cama` | Cama doble con cabecera, almohadas y colcha | La cabecera va contra la pared derecha (v = 0). Lleva `colcha` (3 tonos) y `almohada` |
| `velador` | Mesita de noche con cajón | `encima`: `lampara` o `despertador` |
| `closet` | Ropero alto de dos puertas, una con espejo | Contra la pared izquierda; las puertas miran hacia adelante. `alto` |
| `tina` | Tina con espuma, ducha y cortina | En la esquina del fondo. `cortina` = color |
| `lavamanos` | Mueble con lavamanos, espejo redondo y vaso con cepillos | Contra la pared izquierda |
| `inodoro` | Inodoro con estanque | Contra la pared izquierda |
| `alfombra` | Alfombra plana con borde | Puede ir debajo de otros muebles |
| `planta` | Planta alta en macetero | Solo `u` y `v` |

Un mueble que no está en la tabla (una estufa del restaurante, una camilla del hospital) se programa **una vez** en `scripts/escenarios-iso.ts` (una función más en el catálogo y su tipo en `components/casa/escenarios/tipos.ts`) y queda para todos los escenarios. Regla del proyecto: se agrega cuando un escenario real lo pide, nunca "por si acaso".

## Pintarlo en Krita

Cada escenario sale también partido en capas (`piso`, `paredes`, una por alfombra, `sombras` y una por mueble, con su `id`). `npm run arte:krita` arma `arte-krita/cuarto_<id>.ora` y `npm run arte:krita-importar` lo trae de vuelta, igual que la cocina y el living (ver `docs/arte.md`). Si guardas `cuarto_<id>.png` en `public/arte/<id>/`, el juego usa tu dibujo.

## Qué falta para jugarlo

Cuando un cuarto se juega, sus muebles grandes (los que la vaca puede rodear) van también en `piezas` de su `DefCuarto`: huella en el piso, alto y una capa propia. Así la vaca queda detrás de ellos cuando corresponde y no se para dentro. El living es el ejemplo (`PIEZAS_LIVING`; ver `docs/arte.md`).


La ficha de escenario es el dibujo. Para que se pueda entrar, el cuarto necesita además su ficha del motor (objetos, acciones y palabras, como `components/casa/living/cuarto.ts`), sus audios revisados por un nativo y su lugar en `FONDO_CUARTO` (`components/casa/arte/registro.ts`). Eso es la etapa 3 (baño) y 4 (dormitorio) de la hoja de ruta.
