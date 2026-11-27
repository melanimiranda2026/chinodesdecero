"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { textoHanzi } from "@/lib/silabas";
import { callar, decir } from "../audio/voz";
import { ARTE_VACA } from "../arte/registro";
import { Globo } from "../Globo";
import { BORDE } from "../Vaca";
import pp from "../primer-plano/PrimerPlano.module.css";
import { FAMILIA, fraseDe, type Adorno, type Pariente } from "./familia";
import styles from "./Foto.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const capa: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" };

/** El adorno de cada uno, dibujado sobre la vaca (mismo cuadro de 100 x 100 que la imagen). */
function AdornoSvg({ adorno }: { adorno: Adorno }) {
  const t = { stroke: "#4a2a1c", strokeWidth: 1.6, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 100 100" style={capa} aria-hidden="true">
      {adorno === "corbata" && (
        <g {...t}>
          <path d="M50 57 l-11 -6 v12 z" fill="#e2574e" />
          <path d="M50 57 l11 -6 v12 z" fill="#e2574e" />
          <circle cx={50} cy={57} r={3.2} fill="#c2433b" />
        </g>
      )}
      {adorno === "flor" && (
        <g {...t} transform="translate(67 17)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-5.5} rx={3.6} ry={5.2} fill="#f59ac0" transform={`rotate(${a})`} />
          ))}
          <circle r={3} fill="#ffc83d" />
        </g>
      )}
      {adorno === "gorra" && (
        <g {...t}>
          <path d="M33 21 q17 -16 34 0 z" fill="#3a6fd6" />
          <path d="M60 20 q12 -1 16 4 q-8 2 -17 0 z" fill="#2e58ad" />
          <circle cx={50} cy={8.6} r={2.2} fill="#ffc83d" />
        </g>
      )}
      {adorno === "moño" && (
        <g {...t} transform="translate(36 15) rotate(-12)">
          <path d="M0 0 l-10 -6 v12 z" fill="#f59ac0" />
          <path d="M0 0 l10 -6 v12 z" fill="#f59ac0" />
          <circle r={3} fill="#e2789f" />
        </g>
      )}
    </svg>
  );
}

/**
 * La foto de la familia a pantalla completa (mismo contenedor e iris que la mesa): papá, mamá, el hermano y la
 * hermana. Tocar a uno: la vaquita dice 这是我爸爸 (globo encima) y él da un saltito. No cuenta como ficha.
 */
export function Foto({ alCerrar }: { alCerrar: () => void }) {
  const [dicho, setDicho] = useState<string | null>(null);
  const [vistos, setVistos] = useState<string[]>([]);
  /** Cada toque lleva su número: el globo de uno viejo no borra el del nuevo. */
  const turno = useRef(0);
  const suena = useRef(false);

  // al salir de la foto no queda nada sonando
  useEffect(
    () => () => {
      turno.current++;
      if (suena.current) callar();
    },
    [],
  );

  const tocar = async (p: Pariente) => {
    // la frase vieja se corta: nunca dos voces a la vez
    if (suena.current) callar();
    const mio = ++turno.current;
    setDicho(p.id);
    setVistos((v) => (v.includes(p.id) ? v : [...v, p.id]));
    suena.current = true;
    await decir(fraseDe(p), { juego: "cocina" });
    if (mio !== turno.current) return;
    suena.current = false;
    setTimeout(() => {
      if (mio === turno.current) setDicho(null);
    }, 1200);
  };

  const elegido = FAMILIA.find((p) => p.id === dicho);

  return (
    <div data-testid="foto" data-fondo="foto" className={cx(pp.pp, styles.fondo)}>
      <button type="button" className={pp.cerrar} aria-label="返回" onClick={alCerrar}>
        <span aria-hidden="true">←</span>
      </button>

      <div className={styles.marco}>
        <div className={styles.foto}>
          <div className={styles.sol} aria-hidden="true" />
          <div className={styles.colina} aria-hidden="true" />
          {FAMILIA.map((p) => (
            <button
              key={p.id}
              type="button"
              data-pariente={p.id}
              data-visto={vistos.includes(p.id) ? "true" : undefined}
              aria-label={textoHanzi(p.nombre)}
              className={cx(styles.pariente, dicho === p.id && styles.salta)}
              style={
                {
                  "--x": `${p.x}%`,
                  "--ancho": `${p.ancho}%`,
                  "--xv": `${p.vertical.x}%`,
                  "--anchov": `${p.vertical.ancho}%`,
                  "--abajov": `${p.vertical.abajo}%`,
                  zIndex: p.id === "wo" ? 4 : p.ancho < 30 ? 3 : 2,
                } as CSSProperties
              }
              onClick={() => void tocar(p)}
            >
              <span className={styles.vaca} style={{ filter: p.tono ? `${p.tono} ${BORDE}` : BORDE }}>
                {/* eslint-disable @next/next/no-img-element */}
                <img src={ARTE_VACA.cuerpo} alt="" draggable={false} style={capa} />
                <img src={ARTE_VACA.ojos.felices} alt="" draggable={false} style={capa} />
                <img src={ARTE_VACA.hocico.sonrisa} alt="" draggable={false} style={capa} />
                {/* eslint-enable @next/next/no-img-element */}
                {p.adorno && <AdornoSvg adorno={p.adorno} />}
              </span>
            </button>
          ))}
          {elegido && <Globo silabas={fraseDe(elegido)} x={Math.max(22, Math.min(78, elegido.x))} y={10} />}
        </div>
      </div>
    </div>
  );
}
