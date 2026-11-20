"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { textoHanzi, type Silaba } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import { LineaTono } from "./LineaTono";
import { SELLO, type Palabra, type Pieza } from "./palabras";
import styles from "./Living.module.css";

const conRetraso = (i: number) => ({ "--i": String(i) }) as CSSProperties;

function Pinyin({ s }: { s: Silaba[] }) {
  return (
    <span className={styles.py} data-pinyin>
      {s.map(([, py, t], j) => (
        <span key={j} data-tono={t} style={{ color: COLOR_TONO[t] }}>
          {j > 0 ? " " : ""}
          {py}
        </span>
      ))}
    </span>
  );
}

/** Una pieza: el hanzi (o dibujo) grande y su significado chico debajo. */
function Trozo({ pieza, i }: { pieza: Pieza; i: number }) {
  return (
    <span className={styles.pieza} data-pieza style={conRetraso(i)}>
      <span className={styles.piezaHz}>{pieza.hz}</span> <span className={styles.piezaEs}>{pieza.es}</span>
    </span>
  );
}

/** Signo entre piezas (+, =, ·, →): entra junto con la pieza que lo sigue. */
function Signo({ children, i }: { children: ReactNode; i: number }) {
  return (
    <span className={styles.signo} style={conRetraso(i)} aria-hidden="true">
      {" "}
      {children}{" "}
    </span>
  );
}

/** Lo que cierra la cuenta: el hanzi o el significado, resaltado. */
function Final({ children, i, hanzi }: { children: ReactNode; i: number; hanzi?: boolean }) {
  return (
    <span className={hanzi ? styles.finalHz : styles.final} style={conRetraso(i)}>
      {children}
    </span>
  );
}

/** Piezas unidas por un signo; `i0` es el retraso de la primera. */
function Cadena({ piezas, signo, i0 = 0 }: { piezas: Pieza[]; signo: string; i0?: number }) {
  return (
    <>
      {piezas.map((p, k) => (
        <span key={k} className={styles.eslabon}>
          {k > 0 && <Signo i={i0 + k}>{signo}</Signo>}
          <Trozo pieza={p} i={i0 + k} />
        </span>
      ))}
    </>
  );
}

/** El cuerpo animado de cada técnica: las piezas entran una tras otra. */
function Cuerpo({ palabra }: { palabra: Palabra }) {
  const { tecnica, piezas, es, s } = palabra;
  const hz = textoHanzi(s);
  const n = piezas.length;
  switch (tecnica) {
    case "suma":
    case "haoMas":
      // 电 + 脑 = computador
      return (
        <p className={styles.fila}>
          <Cadena piezas={piezas} signo="+" />
          <Signo i={n}>=</Signo>
          <Final i={n}>{es}</Final>
        </p>
      );
    case "literal":
      // 西 oeste · 红 rojo · 柿 kaki → "kaki rojo del oeste"
      return (
        <p className={styles.fila}>
          <Cadena piezas={piezas} signo="·" />
        </p>
      );
    case "dibujo":
    case "radical":
    case "igual":
      // 💧 → 水 · 艹 planta → 茶 · 亻 persona → 他
      return (
        <p className={styles.fila}>
          <Cadena piezas={piezas} signo="→" />
          <Signo i={n}>→</Signo>
          <Final i={n} hanzi>{hz}</Final>
        </p>
      );
    case "partes":
      // 好 = 女 mujer + 子 niño
      return (
        <p className={styles.fila}>
          <Final i={0} hanzi>{hz}</Final>
          <Signo i={1}>=</Signo>
          <Cadena piezas={piezas} signo="+" i0={1} />
        </p>
      );
    case "gratis":
      // kāfēi ≈ café
      return (
        <p className={styles.fila}>
          <span className={styles.pieza} style={conRetraso(0)}>
            <Pinyin s={s} />
          </span>
          <Signo i={1}>≈</Signo>
          <Final i={1}>{es}</Final>
        </p>
      );
  }
}

/**
 * La ficha de una palabra de la mesa: sello de la técnica, hanzi, pinyin por tono, línea de tono que se
 * dibuja mientras la vaca habla, significado y el truco en español (la mesa es la excepción al "sin español").
 */
export function Ficha({
  palabra, hablando, alRepetir, alCerrar,
}: {
  palabra: Palabra;
  /** La vaca está diciendo la palabra: la línea de tono se dibuja. */
  hablando: boolean;
  /** 🔊: que la vaca la diga otra vez. */
  alRepetir: () => void;
  /** ✕, Escape o tocar fuera. */
  alCerrar: () => void;
}) {
  const hz = textoHanzi(palabra.s);
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar.current();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  // al abrir (o cambiar de palabra) el foco entra a la ficha
  useEffect(() => {
    caja.current?.focus();
  }, [palabra.id]);

  return (
    <div className={styles.velo} onClick={alCerrar}>
      <div
        ref={caja}
        key={palabra.id}
        role="dialog"
        aria-modal="true"
        aria-label={hz}
        tabIndex={-1}
        className={styles.ficha}
        data-tecnica={palabra.tecnica}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.cabeza}>
          <span className={styles.sello}>{SELLO[palabra.tecnica]}</span>
          <button type="button" className={styles.boton} aria-label="Cerrar" onClick={alCerrar}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className={styles.palabra}>
          <span className={styles.hz} data-hanzi>{hz}</span>
          <span className={styles.sonido}>
            <Pinyin s={palabra.s} />
            <button type="button" className={styles.boton} aria-label="Escuchar otra vez" onClick={alRepetir}>
              <span aria-hidden="true">🔊</span>
            </button>
          </span>
          <LineaTono s={palabra.s} activa={hablando} />
          <span className={styles.significado} data-significado>{palabra.es}</span>
        </div>

        <div className={styles.truco} data-cuerpo={palabra.tecnica}>
          <Cuerpo palabra={palabra} />
          <p className={styles.frase} style={conRetraso(palabra.piezas.length + 1)}>
            <span aria-hidden="true">→ </span>
            {palabra.frase}
          </p>
        </div>

        {palabra.nota && (
          <p className={styles.nota} data-nota>
            <span aria-hidden="true">👂 </span>
            {palabra.nota}
          </p>
        )}
      </div>
    </div>
  );
}
