# Chino con la vaca: el proyecto (objetivo, flujos, marca, crecimiento y rentabilidad)

Fecha: 20 nov. 2026 · Estado: para aprobar

Este documento ordena la web como proyecto. Reemplaza el objetivo de la spec del 8 nov. (`2026-11-08-pagina-casa-design.md`: "la web es la vitrina del canal") y la idea de "centro de minijuegos" del 16 nov. Las decisiones de detalle de esas specs (estética, sin español dentro de la casa, se gana siempre, fichas de mahjong, etc.) siguen vigentes salvo donde este documento diga otra cosa.

Marcas: **[ella]** = decisión de la dueña. **[propuesta]** = decisión mía, corregible al leer.

---

## 1. Objetivo

**[ella]** El juego es el producto. Es un método eficaz para que una persona se familiarice con el chino y aprenda lo básico **hasta HSK 3**, más cosas que el examen no trae (jerga). La gente paga por entrar a más lugares.

**[ella]** Dos negocios posibles, en este orden:
1. **Personas** (ahora): llegan desde TikTok, juegan gratis la casa y pagan por los mundos de afuera.
2. **Empresas** (después, con datos de que funciona): por ejemplo, trabajadores de una empresa socia de una china que necesitan las primeras palabras.

**Qué es éxito en unos meses [propuesta]:** la casa completa jugable, el primer mundo pagado a la venta, y datos que muestren que la gente **reconoce** las palabras días después (no solo que hizo clic). Esos datos son el argumento de venta para las empresas.

### Metas
- La casa completa (living → cocina → baño → dormitorio) gratis, con correo para salir del living.
- El primer mundo pagado (restaurante, vaca de chef) con cobro funcionando.
- Un motor de cuartos que haga barato agregar mundos.
- Medición del embudo y de la retención de palabras.

### No-metas (por ahora)
- Empresas: ni cuentas de equipo ni panel de avance. Solo se deja el lugar pensado en los datos.
- Suscripción. Cobrar por vasos de leche o por quitar límites.
- Otros idiomas.

### Anti-metas (si pasa, falló aunque funcione)
- Que el juego frustre o se pueda perder. Se gana siempre; "hay que hacerlo todo para pasar" nunca debe sentirse como un muro: siempre hay una pista visible de qué falta.
- Español dentro de los cuartos (excepción ya aprobada: la ficha de la palabra).
- Prometer "aprende chino" o "entiendes": se dice "reconoces" (enfoque de ventas del `CLAUDE.md` padre).
- Audio en mandarín publicado sin revisión de un nativo.
- Arte, fondos o stickers sacados de redes. Recrear un juego existente.
- Pedir el correo antes de que la persona haya jugado.

---

## 2. Marca

- **[ella]** Nombre único: **chino con la vaca**. Tono familiar, cálido, de casa. Dominio `chinoconlavaca.com`, correo `niu@chinoconlavaca.com`.
- **[propuesta]** "Método Jìn 浸" queda como el nombre del método (página /sobre), no como marca aparte. "chinodesdecero" es solo el nombre del repositorio.
- **[ella]** La estética no cambia: isometría, crayón, contorno café `#4A2A1C`, colores cálidos (referencia `inspo/Design.jpeg`). Títulos nunca inclinados.
- **[ella]** El **reloj solar** aparece en todas partes (casa y mundos). Es parte de la identidad: el día de la vaca.
- **Pendiente [ella]:** la cuenta oficial de TikTok y su @. Hoy la web enlaza a "chino comprensible" y los videos se programan en "second brain". Hay que unificar a una cuenta con el nombre de la marca (o explicar por qué no).

---

## 3. Flujos

### 3.1 Entrada [ella]
Al abrir la web, la primera imagen es **la casa entera en isometría**, grande y al centro (también en computador). La vaca entra a la casa y la cámara se acerca hasta el primer cuarto, el living, que queda como límite del juego.

```
┌──────────────────────────────────────┐
│ chino con la vaca            ☰ menú  │
│                                      │
│        ╱╲  casa isométrica  ╱╲       │
│      ╱ living │ cocina │ baño ╲      │
│      ╲  dormitorio  🐄→ puerta ╱     │
│                                      │
│            ☀─────────☾  reloj solar   │
└──────────────────────────────────────┘
        ↓ la vaca entra, zoom al living
```

### 3.2 El camino de una persona
```
TikTok ─→ casa entera ─→ living (sin registro)
                            │ toca todo + logra todas las acciones
                            ▼
                     "deja tu correo para seguir"   ← [ella] registro obligatorio aquí
                            ▼
              cocina ─→ baño (noche) ─→ dormitorio
                                          │ despierta, abre el closet
                                          ▼
                              elige ropa = elige mundo
                         chef → restaurante (pago) · otros "pronto"
                                          ▼
                                  paga ─→ juega el mundo
```

- **[propuesta]** El correo usa el enlace mágico que ya existe (Supabase + Resend). Mientras confirma el correo, la persona puede seguir a la cocina; el avance se guarda en su cuenta al confirmar. Así el registro no corta el ritmo.
- **[propuesta]** Al volver otro día, entra directo al cuarto donde quedó, con un "¿te acuerdas?" de una palabra ya ganada (gancho de recuperación, igual que los videos).

---

## 4. El juego

### 4.1 Regla común a todos los cuartos [ella]
- Cada cuarto tiene objetos para tocar y **acciones** que hacer (sentarse, cocinar, lavarse los dientes…).
- Para pasar al siguiente hay que haber tocado todos los objetos y logrado todas las acciones.
- Cada palabra lograda, incluidos los verbos (坐 "sentarse" al sentarse en el sofá y luego en la silla), se **recolecta** como una ficha de mahjong que aparece girando como objeto valioso.
- **[propuesta]** Una acción se repite en distintos objetos (sentarse en el sofá, en la silla) antes de dar la ficha: así se cumplen las repeticiones en contextos distintos que pide el método.
- **[propuesta]** Indicador siempre visible de qué falta (siluetas de fichas por ganar), para que la regla de "hacerlo todo" no frustre.
- **Regla del canal:** la vaca no hace gestos que ilustren el significado *mientras* suena un tono; primero el audio con la línea de tono, después la acción.

### 4.2 El reloj solar [ella]
Abajo de la pantalla. El día avanza: mañana en el living, mediodía en la cocina, noche en el baño, medianoche en el dormitorio, amanecer al despertar.
**[propuesta]** El reloj avanza con el progreso del jugador (acciones logradas), no con la hora real.

### 4.3 Los cuartos

| Cuarto | Momento | Qué pasa | Para pasar |
|---|---|---|---|
| **Living** 客厅 | mañana | Objetos y acciones (sentarse, mirar la tele…). **[propuesta]** La mesa de 50 palabras ya construida pasa a ser **la colección de fichas** del jugador. | todo tocado y logrado + correo **[ella]** |
| **Cocina** 厨房 | mediodía | **[ella]** La vaca dice en un globo "我想吃米饭" (quiero comer arroz), así se entiende que hay que cocinar arroz. Se cocina, la vaca come, se lavan los platos y se bebe algo (té o café). | arroz → comer → lavar → beber |
| **Baño** 浴室 | noche | **[ella]** Arreglarse para dormir: ducharse, secarse el pelo, lavarse los dientes, skincare. | toda la rutina |
| **Dormitorio** 卧室 | medianoche → amanecer | **[ella]** La vaca se acuesta, despierta, se interactúa con el cuarto y con el closet; se cambia la ropa. | elegir ropa |

**[propuesta]** La cocina actual (receta 米 + 水 + 胡萝卜, taza de café, refri con frutas de los videos) se reutiliza dentro de este nuevo guion; el arroz ya está.
**[propuesta]** Cada cuarto trae ~40-50 palabras; la casa completa, ~150-200, todas de HSK 1.

### 4.4 Los mundos (lo que se paga) [ella]
La ropa de la vaca abre un lugar **fuera de la casa**. Vestida de chef va al **restaurante**, que se paga y trae más vocabulario. Los mundos siguen la misma regla (objetos, acciones, fichas, reloj solar).

**[propuesta]** Lista inicial de mundos, cada uno con su ropa:

| Ropa | Mundo | Nivel aprox. |
|---|---|---|
| chef | restaurante | HSK 1-2 |
| delantal de feria | mercado | HSK 1-2 |
| bata | hospital | HSK 2 |
| traje | oficina | HSK 2-3 |
| mochila | aeropuerto / viaje | HSK 2-3 |
| ropa de fiesta | fiesta (jerga) | fuera de HSK |

**[propuesta]** HSK queda **por dentro** como garantía: cada mundo declara qué palabras de HSK cubre y la web lo muestra como beneficio ("con la casa y el restaurante ya reconoces X palabras de HSK 1"). Confirmar cifras antes de anunciarlas: HSK 3.0 acumula ~500 / ~1.270 / ~2.245 palabras en niveles 1/2/3; el HSK antiguo, 150 / 300 / 600.

### 4.5 El puzzle [propuesta]
Se mantiene como **repaso** con las fichas recolectadas (las palabras de la casa abren niveles, como ya está decidido). Deja de ser "un minijuego más de la portada": la portada es la casa.

---

## 5. Cómo se cobra

- **[ella]** Toda la casa es gratis. Se paga al salir de la casa: **pago único por mundo**. Sin suscripción.
- **[ella]** Antes se habló de paquetes HSK 1/2/3; se reemplazó por lugares. HSK queda como etiqueta de contenido, no como producto.
- **[propuesta]** Precios de partida (validar con ventas reales):
  - un mundo: ~US$7
  - pack de 3 mundos: ~US$15
  - todos los mundos, actuales y futuros: ~US$29 (precio de lanzamiento)
- **[propuesta]** Cobro con un "comerciante registrado" (Lemon Squeezy o Paddle): cobra en toda Latinoamérica y se encarga de impuestos de cada país, a cambio de una comisión más alta (~5 % + US$0,50). Alternativa local: Mercado Pago (más barato, pero un país a la vez). Verificar condiciones antes de elegir.
- La tabla `suscriptores` ya tiene la columna `plan` reservada; se reemplaza por una tabla de compras (qué mundos tiene cada cuenta).

---

## 6. Datos que se miden

Ya existen la tabla `eventos` y la lista `lib/eventos-nombres.ts`. **[propuesta]** Se ordena en dos grupos:

**Embudo (¿dónde se cae la gente?)**
entrar → primer objeto → living completo → correo → cocina completa → baño completo → closet → ver mundo → pagar. Con `origen` (qué video de TikTok la trajo).

**Eficacia (¿aprende?)**
- Fichas ganadas por persona.
- Aciertos del "¿te acuerdas?" al volver, a 1, 3 y 7 días: es la prueba de que el método funciona y el argumento para empresas.
- Tiempo por cuarto.

---

## 7. Crecimiento

1. **TikTok → un cuarto concreto [propuesta].** Cada video termina con "esta palabra la encuentras en la cocina de la vaca" y un enlace que abre la casa en ese cuarto (`?cuarto=cocina`). Los formatos de video ya son los trucos de la ficha.
2. **Correo:** avisos de mundos nuevos ("la vaca se vistió de doctora"), y el repaso espaciado ("hoy tienes 5 fichas para repasar").
3. **Compartir [propuesta]:** imagen de la colección de fichas para subir a redes ("ya junté 87 fichas").
4. **Empresas (etapa posterior):** con los datos de eficacia, piloto con una empresa: un mundo a medida (fábrica, reunión con el socio chino) y cuentas para el equipo.
5. **Jerga:** mundo "fiesta", también útil como contenido de TikTok.

---

## 8. Rentabilidad

**Costos fijos al empezar a vender (estimados, verificar):**

| Servicio | Hoy | Al vender |
|---|---|---|
| Vercel | gratis (Hobby) | **~US$20/mes (Pro)**: el plan gratis no permite uso comercial |
| Supabase | gratis | ~US$25/mes (Pro) cuando haya usuarios; el gratis pausa proyectos inactivos |
| Resend | gratis (100 correos/día) | ~US$20/mes al pasar de 100/día |
| ElevenLabs | Starter (~US$5/mes) | Starter o Creator según cuántas palabras por mes |
| Dominio | ~US$1/mes | igual |

Total al vender: **~US$50-90 al mes.** Con ~US$6 netos por mundo vendido, **10-15 ventas al mes cubren los costos fijos.**

**Costo de cada mundo nuevo (el costo real):** arte isométrico (código + retoque en Krita), audios del banco (ElevenLabs), **revisión de un nativo** (pagada por hora; estimar y fijar tarifa) y el tiempo de armar la ficha del cuarto. El motor de cuartos (sección 9) existe para que este costo sea bajo: si un mundo cuesta X, se paga con X ÷ 6 ventas.

---

## 9. Cómo se construye

### Enfoques considerados
- **A. Motor de cuartos en la web actual (elegido, [propuesta] sin objeción de la dueña).** Cada cuarto o mundo es una ficha de datos: objetos, acciones, palabras, condiciones para pasar, ropa que lo abre, si es pago. El motor arma el cuarto con esa ficha. Agregar un mundo = escribir su ficha + dibujar su arte. Usa lo que hay: Next.js, Supabase, correo, fichas de mahjong, arte isométrico (`scripts/arte-iso.ts` + Krita).
- **B. Cuarto por cuarto a mano.** Rápido para el baño, pero cada mundo cuesta lo mismo que el primero. Descartado: hace caro el producto que se vende.
- **C. Motor de videojuegos aparte (Phaser).** Más poder de animación, pero rehacer todo y mantener dos sistemas para un juego de tocar y arrastrar. Descartado.

### Limitaciones del motor y cómo se manejan
1. **Solo hace lo que ya sabe hacer.** Una interacción nueva (cortar con el dedo, pintar) se programa una vez como pieza del motor y queda para todos los mundos.
2. **Riesgo de cuartos iguales.** Cada mundo lleva al menos un momento propio, programado aparte.
3. **Escenas únicas fuera de la lista.** Entrada a la casa, zoom, dormir/despertar y cambio de ropa son escenas programadas que el motor llama.
4. **Cuesta más al inicio.** La etapa 1 rehace living y cocina sobre el motor; la ventaja se ve desde el 3.er o 4.º cuarto.
5. **Cambiar un cuarto publicado mueve el avance guardado.** Quien ya lo terminó lo sigue teniendo terminado; se revisa en cada cambio.
6. **Un error en la ficha rompe el cuarto.** Revisión automática antes de publicar: cada palabra con audio (y visto bueno del nativo), cada objeto con dibujo.

**Regla contra la deuda técnica [ella aprobó]:** el motor se construye solo con lo que piden el living y la cocina. Cada pieza nueva entra cuando un cuarto real la necesita, nunca "por si acaso".

### Lo que ya existe y cambia
- `components/casa/` (cocina, living, primer plano, gestos, globo, vaca, minimapa): se reordena alrededor del motor. La cocina y el living se rehacen como fichas de datos; el arte y los audios se conservan.
- Portada: deja de ser "centro de minijuegos" y pasa a ser la casa isométrica entera.
- `avance` (Supabase) guarda fichas, cuarto actual y hora del reloj solar.

---

## 10. Hoja de ruta

| Etapa | Qué se entrega | Por qué en este orden |
|---|---|---|
| 0. Marca | Nombre único, cuenta de TikTok unificada, textos de la web con "chino con la vaca". | Barato y lo ve todo el que llega. |
| 1. Motor + entrada | Casa isométrica como primera imagen, vaca entrando, zoom al living. Reloj solar. Living en el motor con acciones y fichas giratorias. Correo para salir. | Es lo que ve el 100 % de la gente y donde se captura el correo. |
| 2. Cocina | Arroz pedido en globo → cocinar → comer → lavar → beber. | Reutiliza mucho de lo que ya hay. |
| 3. Baño | Rutina de noche. | |
| 4. Dormitorio | Dormir, despertar, closet, cambio de ropa, vitrina de mundos ("pronto"). | Cierra la casa y abre la puerta a vender. |
| 5. Primer mundo + pagos | Restaurante (chef) y cobro. Medición de eficacia. | Primera plata. |
| 6. Más mundos | Uno por mes, según qué pide la gente (votos en la vitrina "pronto"). | |
| 7. Empresas | Piloto con una empresa, con datos de eficacia. | Recién con pruebas. |

Cada etapa tiene su propia spec y plan antes de construirse.

---

## 11. Pendientes para la dueña
1. Cuenta oficial de TikTok y su @.
2. Precios: ¿los de la sección 5 te parecen bien para partir?
3. Lista de mundos: ¿cuál va después del restaurante?

## 12. Decisiones mías para revisar al leer
- Método Jìn queda como nombre del método, no marca.
- El reloj solar avanza con el progreso, no con la hora real.
- La mesa de 50 palabras del living pasa a ser la colección de fichas.
- Una acción se repite en varios objetos antes de dar la ficha; siempre se ve qué falta.
- Mientras confirma el correo, puede seguir a la cocina.
- El puzzle queda como repaso con las fichas.
- Cobro con comerciante registrado (Lemon Squeezy / Paddle), precios de partida.
- Etapa 0 de marca antes del motor.
