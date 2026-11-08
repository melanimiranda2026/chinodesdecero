# Cómo reemplazar el arte por tus dibujos

Todo lo que se ve hoy en la cocina es un dibujo provisorio hecho en código. Cuando tengas tus dibujos, cada uno se cambia **reemplazando un archivo y una línea**. No hay que tocar nada más: las animaciones solo mueven capas por su nombre.

## Cómo se cambia un dibujo

1. Exporta el dibujo como PNG con fondo transparente (tamaños abajo).
2. Guárdalo en `public/arte/cocina/` con el nombre `<objeto>_<capa>.png`, por ejemplo `public/arte/cocina/panzi_plato.png`.
3. Abre `components/casa/arte/registro.ts`, busca el objeto y cambia la línea de esa capa:

```ts
// antes
plato: svg(P.PanziPlato),
// después
plato: { tipo: "img", src: "/arte/cocina/panzi_plato.png" },
```

Listo. Puedes cambiar una capa a la vez; las que no cambies siguen con el provisorio.

## Tamaños

- **Objetos:** 1024 x 1024 px, fondo transparente. El objeto va centrado y ocupa lo mismo que el provisorio (casi todo el cuadrado). Todas las capas de un mismo objeto usan **el mismo cuadrado y el mismo centro**, para que calcen al apilarse.
- **El cuarto:** 2000 x 2000 px, una sola imagen (sin los objetos: ellos van aparte).
- **La vaca:** igual a las capas actuales de `public/vaca/` (mismo tamaño y mismo centro que `vaca_cuerpo.png`).

## Capas de cada objeto

Archivo esperado: `public/arte/cocina/<objeto>_<capa>.png`. Las capas se apilan en el orden de la tabla (de atrás hacia adelante).

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
| wan | `mugre` | Granos pegados | sucio |
| guo (olla) | `olla` | La olla con sus asas | siempre |
| guo | `arroz` | El arroz cocido asomando | cocido |
| guo | `mugre` | Restos pegados | sucio |
| chahu (tetera) | `tetera` | La tetera | siempre |
| kuaizi (palillos) | `palillos` | Los dos palillos | siempre |

La capa **`mugre`** es siempre la que se borra al frotar. Dibújala sobre fondo transparente, solo las manchas, en el mismo lugar que irían sobre el objeto.

## Piezas de los minijuegos (primer plano)

Misma regla (cuadrado 1024 x 1024). Están en `ARTE_PRIMER_PLANO`.

| Pieza | Qué es |
|---|---|
| `vaso_grande` | El vaso grande de vidrio, **con el interior transparente** (el líquido lo dibuja el programa detrás) |
| `vaso_mascara` | La silueta del interior del vaso, de un solo color. No se ve: solo recorta el líquido |
| `olla_grande` | La olla vista desde arriba |
| `trozos` | Los trocitos que giran dentro de la olla |

El cuarto es `FONDO_CUARTO.cocina` (2000 x 2000 px).

## Importante

- Los dibujos son solo tuyos o generados por nosotros. Nada descargado de redes.
- Dentro de la casa no hay texto en español: si un dibujo lleva letras, que sean hanzi.
