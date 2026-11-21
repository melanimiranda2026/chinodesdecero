"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { decir, desbloquearAudio, callar } from "@/components/casa/audio/voz";
import { musica, sfx } from "@/components/casa/audio/sonido";
import { cargarAvance, EVENTO_AVANCE, type DetalleAvance } from "@/components/casa/avance";
import { registrar } from "@/components/casa/eventos";
import { Vaca } from "@/components/casa/Vaca";
import { TAI_BANG_LE, HEN_HAO } from "@/components/casa/cocina/frases";
import { Correo } from "@/components/pagina/Correo";
import { BotonMudo } from "@/components/pagina/BotonMudo";
import { COLOR_TONO } from "@/lib/tonos";
import { ETAPAS, idNivel, TEMAS, type Etapa } from "./datos";
import { cargarAvancePuzzle, guardarAvancePuzzle, type AvancePuzzle } from "./avance";
import { abierto, despuesDe, formatoEspera, gastar, proximoVaso, recargar, siguienteNivel, sumar, VASOS_MAX } from "./logica";
import { Candado, Check, Flecha, PiezaIcono, Reloj, VasoLeche } from "./Dibujos";
import { CaraPieza, estiloPieza } from "./Pieza";
import { Ronda } from "./Ronda";
import styles from "./Puzzle.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Pantalla =
  | { tipo: "mapa" }
  | { tipo: "nota"; tema: number }
  | { tipo: "ronda"; tema: number; etapa: Etapa; frase: number; errores: number; gratis: boolean }
  | { tipo: "fin"; tema: number; etapa: Etapa; perfecto: boolean; gratis: boolean };

/** Una ronda desde su primera frase. */
const rondaDe = (tema: number, etapa: Etapa, gratis: boolean): Pantalla => ({ tipo: "ronda", tema, etapa, frase: 0, errores: 0, gratis });

/**
 * Empieza un nivel (desde el mapa, el fin o al abrir el puzzle): registra su inicio y devuelve la pantalla.
 * Con `nota`, la etapa 1 nueva pasa antes por la regla.
 */
function abrirRonda(tema: number, etapa: Etapa, { gratis = false, nota = false }: { gratis?: boolean; nota?: boolean } = {}): Pantalla {
  registrar("puzzle_nivel_inicio", { nivel: idNivel(TEMAS[tema].id, etapa), repaso: gratis });
  return nota ? { tipo: "nota", tema } : rondaDe(tema, etapa, gratis);
}

/** Reloj que avanza cada 20 s (la cuenta regresiva de los vasos). */
function useAhora(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

export function Puzzle({ ventana = false }: { ventana?: boolean } = {}) {
  const [avance, setAvance] = useState<AvancePuzzle | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: "mapa" });
  const [correoGuardado, setCorreoGuardado] = useState(false);
  const [gasto, setGasto] = useState(0); // para animar el vaso que se vacía
  const ahora = useAhora();
  const audioListo = useRef(false);
  const raiz = useRef<HTMLDivElement>(null);

  // El avance vive en el navegador: se lee al montar (no en el render del servidor).
  useEffect(() => {
    const a = cargarAvancePuzzle();
    setAvance(a);
    // Abre listo para jugar: directo a la ronda que toca (sin la Nota); si ya ganó todo, el mapa.
    const sig = siguienteNivel(new Set(a.ganados));
    setPantalla(sig ? abrirRonda(sig.tema, sig.etapa) : { tipo: "mapa" });
    setCorreoGuardado(!!cargarAvance().correo);
  }, []);

  const cambiar = useCallback((f: (a: AvancePuzzle) => AvancePuzzle) => {
    setAvance((a) => {
      if (!a) return a;
      const nuevo = f(a);
      guardarAvancePuzzle(nuevo);
      return nuevo;
    });
  }, []);

  // Dejar el correo (aquí o en la cocina) llena los vasos una sola vez.
  useEffect(() => {
    const alAvance = (e: Event) => {
      const d = (e as CustomEvent<DetalleAvance>).detail;
      if (!d?.correo) return;
      setCorreoGuardado(true);
      cambiar((a) => {
        if (a.correoLleno) return a;
        registrar("puzzle_vasos_correo");
        return { ...a, correoLleno: true, vasos: sumar(a.vasos, VASOS_MAX, Date.now()) };
      });
    };
    window.addEventListener(EVENTO_AVANCE, alAvance);
    return () => window.removeEventListener(EVENTO_AVANCE, alAvance);
  }, [cambiar]);

  useEffect(() => () => {
    callar();
    if (!ventana) musica.parar();
  }, [ventana]);

  if (!avance) return <div className={cx(styles.cargando, !ventana && styles.enPagina)} aria-busy="true" />;

  const ganados = new Set(avance.ganados);
  const vasos = recargar(avance.vasos, ahora);
  const espera = proximoVaso(vasos, ahora);

  const entrarAudio = () => {
    if (audioListo.current) return;
    audioListo.current = true;
    desbloquearAudio();
    musica.tocar("cocina");
  };

  const jugar = (tema: number, etapa: Etapa) => {
    entrarAudio();
    const gratis = ganados.has(idNivel(TEMAS[tema].id, etapa));
    setPantalla(abrirRonda(tema, etapa, { gratis, nota: etapa === 1 && !gratis }));
    // arriba del nivel: en su página, la pantalla; en la ventana de la portada, el panel que lo envuelve
    if (!ventana) window.scrollTo?.({ top: 0 });
    else if (raiz.current?.parentElement) raiz.current.parentElement.scrollTop = 0;
  };

  const llenarConCorreo = () => {
    cambiar((a) => (a.correoLleno ? a : { ...a, correoLleno: true, vasos: sumar(a.vasos, VASOS_MAX, Date.now()) }));
    registrar("puzzle_vasos_correo");
  };

  const sigue = siguienteNivel(ganados);

  return (
    <div
      ref={raiz}
      className={cx(styles.juego, !ventana && styles.enPagina)}
      onPointerDown={entrarAudio}
      onClickCapture={entrarAudio} // teclado y switch: Enter/Espacio dan click sin pointerdown
    >
      <header className={styles.barra}>
        {!ventana && (
          <>
            <Link href="/" className={styles.volver} aria-label="Volver al inicio">
              <Flecha atras className={styles.icono} />
            </Link>
            <h1 className={styles.titulo}>
              <PiezaIcono className={styles.tituloIcono} />
              <span className={styles.tituloTexto}>El puzzle</span>
              <span className={styles.tituloZh} lang="zh">
                拼图 <span className={styles.tituloPy}>pīn tú</span>
              </span>
            </h1>
          </>
        )}
        <Vasos vasos={vasos.vasos} espera={espera} gratis={pantalla.tipo === "ronda" && pantalla.gratis} gasto={gasto} />
        {/* en la portada el 🔊 va en la barra de la ventana; en su página, aquí */}
        {!ventana && <BotonMudo />}
      </header>

      {pantalla.tipo === "mapa" && (
        <Mapa
          ganados={ganados}
          perfectos={new Set(avance.perfectos)}
          sigue={sigue}
          onJugar={jugar}
        />
      )}

      {pantalla.tipo === "nota" && (
        <Nota
          tema={pantalla.tema}
          onSeguir={() => setPantalla(rondaDe(pantalla.tema, 1, false))}
          onMapa={() => setPantalla({ tipo: "mapa" })}
        />
      )}

      {pantalla.tipo === "ronda" && (() => {
        const tema = TEMAS[pantalla.tema];
        const frase = tema.frases[pantalla.frase];
        const sinVasos = !pantalla.gratis && vasos.vasos <= 0;
        return (
          <section className={styles.ventana} aria-label={`${tema.titulo} · ${ETAPAS[pantalla.etapa - 1].nombre}`}>
            <button
              type="button"
              className={cx(styles.botonIcono, styles.salir)}
              onClick={() => {
                callar();
                setPantalla({ tipo: "mapa" });
              }}
              aria-label="Salir al mapa"
            >
              <span aria-hidden="true" className={styles.equis} />
            </button>
            <Ronda
              key={`${pantalla.tema}-${pantalla.etapa}-${pantalla.frase}`}
              frase={frase}
              etapa={pantalla.etapa}
              numero={pantalla.frase}
              total={tema.frases.length}
              pausada={sinVasos}
              onError={() => {
                setPantalla((p) => (p.tipo === "ronda" ? { ...p, errores: p.errores + 1 } : p));
                if (pantalla.gratis) return;
                setGasto((g) => g + 1);
                cambiar((a) => {
                  const v = gastar(a.vasos, Date.now());
                  if (v.vasos === 0 && a.vasos.vasos > 0) registrar("puzzle_sin_vasos", { nivel: idNivel(tema.id, pantalla.etapa) });
                  return { ...a, vasos: v };
                });
              }}
              onCompleta={() => {}}
              onSiguiente={() => {
                if (pantalla.frase + 1 < tema.frases.length) {
                  setPantalla({ ...pantalla, frase: pantalla.frase + 1 });
                  return;
                }
                const id = idNivel(tema.id, pantalla.etapa);
                const perfecto = pantalla.errores === 0;
                registrar("puzzle_nivel_completo", { nivel: id, errores: pantalla.errores, repaso: pantalla.gratis });
                cambiar((a) => ({
                  ...a,
                  ganados: a.ganados.includes(id) ? a.ganados : [...a.ganados, id],
                  perfectos: perfecto && !a.perfectos.includes(id) ? [...a.perfectos, id] : a.perfectos,
                  // un nivel sin errores devuelve un vaso (el repaso no gasta ni regala)
                  vasos: perfecto && !pantalla.gratis ? sumar(a.vasos, 1, Date.now()) : a.vasos,
                }));
                setPantalla({ tipo: "fin", tema: pantalla.tema, etapa: pantalla.etapa, perfecto, gratis: pantalla.gratis });
              }}
            />
            {sinVasos && (
              <SinVasos
                espera={espera}
                correoGuardado={correoGuardado}
                correoLleno={avance.correoLleno}
                hayGanados={ganados.size > 0}
                onLlenar={llenarConCorreo}
                onMapa={() => setPantalla({ tipo: "mapa" })}
              />
            )}
          </section>
        );
      })()}

      {pantalla.tipo === "fin" && (
        <Fin
          etapa={pantalla.etapa}
          perfecto={pantalla.perfecto}
          gratis={pantalla.gratis}
          tema={pantalla.tema}
          siguiente={despuesDe(ganados, pantalla.tema, pantalla.etapa)}
          onJugar={jugar}
          onMapa={() => setPantalla({ tipo: "mapa" })}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function Vasos({ vasos, espera, gratis, gasto }: { vasos: number; espera: number | null; gratis: boolean; gasto: number }) {
  return (
    <div
      className={cx(styles.vasos, gratis && styles.vasosGratis)}
      role="img"
      aria-label={`${vasos} de ${VASOS_MAX} vasos de leche${gratis ? ", repaso sin gasto" : ""}`}
      data-testid="vasos"
      data-vasos={vasos}
    >
      <span className={styles.vasosFila} key={gasto} data-gasto={gasto > 0 || undefined}>
        {Array.from({ length: VASOS_MAX }, (_, i) => (
          <VasoLeche key={i} id={String(i)} nivel={i < vasos ? 1 : 0} className={cx(styles.vaso, i === vasos && gasto > 0 && styles.vasoRecien)} />
        ))}
      </span>
      {espera !== null && !gratis && (
        <span className={styles.recarga}>
          <Reloj className={styles.iconoChico} />
          {relojCorto(espera)}
        </span>
      )}
    </div>
  );
}

/** "3:12" (horas:minutos): sin palabras, así sirve también en la etapa sin español. */
function relojCorto(ms: number): string {
  const min = Math.ceil(ms / 60000);
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

function Mapa({
  ganados, perfectos, sigue, onJugar,
}: {
  ganados: Set<string>;
  perfectos: Set<string>;
  sigue: { tema: number; etapa: Etapa } | null;
  onJugar: (tema: number, etapa: Etapa) => void;
}) {
  const primeraVez = ganados.size === 0;
  return (
    <div className={styles.mapa}>
      <div className={styles.portadaMapa}>
        <h2 className={styles.mapaTitulo}>{primeraVez ? "El chino es como un puzzle" : "¿Seguimos armando?"}</h2>
        <p className={styles.mapaBajada}>
          Cada pieza tiene su lugar. Ordénalas y la vaca te dice la frase. Al principio te ayudamos en español;
          al final, armas solo con el chino.
        </p>
        {sigue && (
          <button type="button" className={styles.botonJugar} onClick={() => onJugar(sigue.tema, sigue.etapa)}>
            <PiezaIcono className={styles.icono} />
            {primeraVez ? "Empezar" : `Seguir: ${TEMAS[sigue.tema].titulo} · ${sigue.etapa}`}
          </button>
        )}
        {!sigue && <p className={styles.todoListo}>¡Armaste todos los niveles! Repasa cuando quieras: repasar no gasta leche.</p>}
        <dl className={styles.leyenda}>
          {ETAPAS.map((e) => (
            <div key={e.etapa}>
              <dt>{e.etapa}</dt>
              <dd>{e.detalle}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ol className={styles.temas}>
        {TEMAS.map((t, i) => {
          const abiertoTema = abierto(ganados, i, 1);
          return (
            <li key={t.id} className={cx(styles.tema, !abiertoTema && styles.temaCerrado)} style={{ "--i": i } as CSSProperties}>
              <div className={styles.temaTexto}>
                <span className={styles.temaMuestra} lang="zh">
                  {t.muestra}
                </span>
                <h3 className={styles.temaTitulo}>{t.titulo}</h3>
              </div>
              <div className={styles.piedras}>
                {ETAPAS.map(({ etapa, nombre }) => {
                  const id = idNivel(t.id, etapa);
                  const gano = ganados.has(id);
                  const puede = abierto(ganados, i, etapa);
                  const esSigue = sigue?.tema === i && sigue.etapa === etapa;
                  return (
                    <button
                      key={etapa}
                      type="button"
                      className={cx(styles.piedra, gano && styles.piedraGanada, esSigue && styles.piedraSigue)}
                      disabled={!puede}
                      onClick={() => onJugar(i, etapa)}
                      aria-label={`${t.titulo}, ${nombre}${gano ? ", ganado" : puede ? "" : ", bloqueado"}`}
                    >
                      {!puede ? (
                        <Candado className={styles.iconoChico} />
                      ) : gano ? (
                        <Check className={styles.iconoChico} />
                      ) : (
                        <span>{etapa}</span>
                      )}
                      {perfectos.has(id) && <VasoLeche id={`p-${id}`} nivel={1} className={styles.piedraVaso} />}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      <p className={styles.notaMapa}>
        Cada pieza mal puesta vacía un vaso de leche. Se recarga uno cada 4 horas, y un nivel sin errores te devuelve uno.
      </p>
    </div>
  );
}

function Nota({ tema, onSeguir, onMapa }: { tema: number; onSeguir: () => void; onMapa: () => void }) {
  const t = TEMAS[tema];
  const ejemplo = t.frases.find((f) => f.id === t.ejemplo) ?? t.frases[0];
  const [boca, setBoca] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      void decir([], { src: `/audio/puzzle/${ejemplo.audio}.mp3`, alBoca: (a) => setBoca(a > 0.22), juego: "puzzle" });
    }, 500);
    return () => {
      clearTimeout(id);
      callar();
    };
  }, [ejemplo.audio]);
  return (
    <section className={cx(styles.ventana, styles.notaVentana)} aria-labelledby="nota-titulo">
      <div className={styles.notaVaca}>
        <Vaca ojos="abiertos" hocico={boca ? "abierta" : "sonrisa"} orejas="arriba" />
      </div>
      <h2 id="nota-titulo" className={styles.notaTitulo}>
        {t.titulo}
      </h2>
      <p className={styles.notaRegla}>{t.regla}</p>
      <div className={styles.notaEjemplo}>
        {ejemplo.piezas.map((p, i) => (
          <div key={i} className={cx(styles.pieza, styles.encajada, styles.chica, p.pregunta && styles.esPregunta)} style={{ ...estiloPieza(p), animationDelay: `${i * 70}ms` }}>
            <CaraPieza pieza={p} etapa={1} />
          </div>
        ))}
      </div>
      <p className={styles.notaEs}>«{ejemplo.espanol}»</p>
      <div className={styles.acciones}>
        <button type="button" className={styles.botonJugar} onClick={onSeguir} autoFocus>
          ¡A armar!
          <Flecha className={styles.icono} />
        </button>
        <button type="button" className={styles.botonSuave} onClick={onMapa}>
          Volver al mapa
        </button>
      </div>
    </section>
  );
}

function Fin({
  etapa, perfecto, gratis, tema, siguiente, onJugar, onMapa,
}: {
  etapa: Etapa;
  perfecto: boolean;
  gratis: boolean;
  tema: number;
  siguiente: { tema: number; etapa: Etapa } | null;
  onJugar: (tema: number, etapa: Etapa) => void;
  onMapa: () => void;
}) {
  const frase = perfecto ? TAI_BANG_LE : HEN_HAO;
  const [boca, setBoca] = useState(false);
  useEffect(() => {
    sfx("brillo", "puzzle");
    const id = setTimeout(() => void decir(frase, { alBoca: (a) => setBoca(a > 0.22), juego: "puzzle" }), 450);
    return () => {
      clearTimeout(id);
      callar();
    };
  }, [frase]);
  const t = TEMAS[tema];
  return (
    <section className={cx(styles.ventana, styles.finVentana)} aria-labelledby="fin-titulo">
      <div className={styles.finVaca}>
        <Vaca ojos="felices" hocico={boca ? "abierta" : "sonrisa"} orejas="arriba" salta />
      </div>
      <h2 id="fin-titulo" className={styles.finTitulo} lang="zh">
        {frase.map(([hz, py, tono], i) => (
          <span key={i} className={styles.sil}>
            <span className={styles.py} style={{ color: COLOR_TONO[tono] }}>
              {py}
            </span>
            <span className={styles.hz}>{hz}</span>
          </span>
        ))}
      </h2>
      {etapa < 3 && (
        <p className={styles.finTexto}>
          {gratis
            ? `Repasaste «${t.titulo}». Así se queda en la memoria.`
            : perfecto
              ? "¡Sin un solo error! Te ganaste un vaso de leche."
              : `¡Nivel completo! Ya armas «${t.titulo}».`}
        </p>
      )}
      {perfecto && !gratis && (
        <div className={styles.premio} aria-hidden="true">
          <VasoLeche id="premio" nivel={1} className={styles.premioVaso} />
          <span>+1</span>
        </div>
      )}
      <div className={styles.acciones}>
        {siguiente && (
          <button type="button" className={styles.botonJugar} onClick={() => onJugar(siguiente.tema, siguiente.etapa)} autoFocus aria-label="Siguiente nivel">
            {etapa < 3 && (
              <span aria-hidden="true">
                {TEMAS[siguiente.tema].titulo} · {siguiente.etapa}
              </span>
            )}
            <Flecha className={styles.icono} />
          </button>
        )}
        <button type="button" className={styles.botonSuave} onClick={onMapa} aria-label="Volver al mapa">
          <PiezaIcono className={styles.icono} />
          {etapa < 3 && <span aria-hidden="true">Mapa</span>}
        </button>
      </div>
    </section>
  );
}

function SinVasos({
  espera, correoGuardado, correoLleno, hayGanados, onLlenar, onMapa,
}: {
  espera: number | null;
  correoGuardado: boolean;
  correoLleno: boolean;
  hayGanados: boolean;
  onLlenar: () => void;
  onMapa: () => void;
}) {
  useEffect(() => {
    callar();
    sfx("tragos", "puzzle");
  }, []);
  return (
    <div className={styles.sinVasos} role="dialog" aria-modal="true" aria-labelledby="sin-vasos-titulo">
      <div className={styles.sinVasosTarjeta}>
        <div className={styles.sinVasosVaca}>
          <Vaca ojos="cerrados" hocico="o" orejas="normales" />
          <VasoLeche id="ultimo" nivel={0} className={styles.sinVasosVaso} />
        </div>
        <h2 id="sin-vasos-titulo" className={styles.sinVasosTitulo}>
          La vaca se tomó toda la leche
        </h2>
        <p className={styles.sinVasosTexto}>
          {espera !== null ? `Tu próximo vaso llega en ${formatoEspera(espera)}.` : "Tus vasos ya se están llenando."} Mientras,
          puedes seguir aprendiendo sin gastar nada:
        </p>
        <div className={styles.acciones}>
          {hayGanados && (
            <button type="button" className={styles.botonJugar} onClick={onMapa}>
              Repasar un nivel ganado
            </button>
          )}
          <Link href="/" className={styles.botonSuave}>
            Jugar en la cocina
          </Link>
        </div>
        {!correoLleno &&
          (correoGuardado ? (
            <div className={styles.sinVasosCorreo}>
              <p className={styles.sinVasosTexto}>Como ya dejaste tu correo, te llenamos los 5 vasos una vez.</p>
              <button type="button" className={styles.botonJugar} onClick={onLlenar}>
                <VasoLeche id="llenar" nivel={1} className={styles.icono} />
                Llenar mis vasos
              </button>
            </div>
          ) : (
            <div className={styles.sinVasosCorreo}>
              <p className={styles.sinVasosTexto}>
                <strong>Deja tu correo y te llenamos los 5 vasos ahora.</strong> También guarda tu avance.
              </p>
              <Correo origen="puzzle-vasos" boton="Llenar mis vasos" listo="¡Listo! Te llenamos los 5 vasos de leche." />
            </div>
          ))}
      </div>
    </div>
  );
}
