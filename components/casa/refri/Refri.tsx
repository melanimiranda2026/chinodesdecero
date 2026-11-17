"use client";
import { useState } from "react";
import { textoHanzi, type Silaba } from "@/lib/silabas";
import { COLOR_TONO } from "@/lib/tonos";
import { SHUI_GUO } from "../cocina/frases";
import { acciones, type Accion } from "../cocina/acciones";
import { COMIDAS, NOMBRES_COMIDA, OBJETOS, type ComidaId, type EstadoCocina } from "../cocina/datos";
import { ARTE_REFRI, ARTE_REFRI_FONDO } from "../arte/registro";
import { Capa } from "../arte/Capa";
import { Vaca, type Hocico, type Ojos, type Orejas } from "../Vaca";
import pp from "../primer-plano/PrimerPlano.module.css";
import styles from "./Refri.module.css";

/** Las comidas por estante (de arriba abajo), sobre los estantes del dibujo (`refri_interior`). */
const ESTANTES: readonly (readonly ComidaId[])[] = [COMIDAS.slice(0, 5), COMIDAS.slice(5, 9), COMIDAS.slice(9)];
/** Escarcha: copos fijos por estante (posición %, retraso s), iguales en cada render. */
const COPOS = Array.from({ length: 6 }, (_, i) => ({ x: 6 + i * 17 + ((i * 7) % 5), d: (i * 1.3) % 4 }));

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

function Pinyin({ s }: { s: Silaba[] }) {
  return (
    <span className={pp.py} data-texto data-pinyin>
      {s.map(([, py, t], j) => (
        <span key={j} style={{ color: COLOR_TONO[t] }}>
          {j > 0 ? " " : ""}
          {py}
        </span>
      ))}
    </span>
  );
}

/**
 * El refri por dentro, a pantalla completa (mismo contenedor e iris que el primer plano de los gestos).
 * Tocar una comida: rebota y la vaca dice su nombre. ✋ 拿 y 👋 关上 son las acciones de siempre del refri.
 */
export function Refri({
  estado, cara, globo, alTocar, alElegir, alCerrar,
}: {
  estado: EstadoCocina;
  cara: { ojos: Ojos; hocico: Hocico; orejas: Orejas; salta: boolean };
  /** Lo que la vaca está diciendo (para el cartel). */
  globo: Silaba[] | null;
  alTocar: (id: ComidaId | "cajon") => void;
  alElegir: (a: Accion) => void;
  /** ✕: cierra el refri. */
  alCerrar: () => void;
}) {
  const [rebote, setRebote] = useState<{ id: ComidaId; n: number } | null>(null);
  const lista = acciones("bingxiang", estado);
  const sacar = lista.filter((a) => a.anim === "sacar");
  const cerrar = lista.find((a) => a.anim === "cerrar");
  const cartel = globo ?? OBJETOS.bingxiang.nombre;

  const tocar = (id: ComidaId) => {
    setRebote((r) => ({ id, n: (r?.n ?? 0) + 1 }));
    alTocar(id);
  };

  return (
    <div data-testid="refri" data-fondo="refri" className={cx(pp.pp, styles.refri)}>
      <div className={pp.cartel}>
        <span>
          <span className={pp.hz} data-texto>{textoHanzi(cartel)}</span>
          <Pinyin s={cartel} />
        </span>
      </div>

      <div className={styles.caja}>
        <Capa capa={ARTE_REFRI_FONDO} vista="0 0 1000 1000" nombre="refri_interior" />
        {/* el rótulo 水果 del cajón (dibujado en refri_interior): un botón encima */}
        <button type="button" data-cajon aria-label={textoHanzi(SHUI_GUO)} className={styles.cajon} onClick={() => alTocar("cajon")}>
          <Pinyin s={SHUI_GUO} />
        </button>
        {ESTANTES.map((fila, f) => (
          <div key={f} className={styles.estante} data-estante={f}>
            {fila.map((id) => {
              const rebota = rebote?.id === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-comida={id}
                  data-rebota={rebota ? rebote.n : undefined}
                  aria-label={textoHanzi(NOMBRES_COMIDA[id])}
                  className={styles.comida}
                  onClick={() => tocar(id)}
                >
                  {/* la clave cambia en cada toque: el rebote vuelve a empezar */}
                  <span key={rebota ? rebote.n : 0} className={cx(styles.dibujo, rebota && styles.rebota)}>
                    <Capa capa={ARTE_REFRI[id]} nombre={`refri_${id}`} />
                  </span>
                </button>
              );
            })}
            <div className={styles.escarcha} aria-hidden="true">
              {COPOS.map((c, i) => (
                <i key={i} style={{ left: `${c.x}%`, animationDelay: `${-(c.d + f)}s` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.acciones}>
        {sacar.map((a) => (
          <button key={textoHanzi(a.verbo)} type="button" className={styles.boton} aria-label={textoHanzi(a.verbo)} onClick={() => alElegir(a)}>
            <span aria-hidden="true">✋{a.icono}</span>
            <span className={styles.hz}>拿</span>
            <span className={styles.py} data-pinyin>ná</span>
          </button>
        ))}
        {cerrar && (
          <button type="button" className={styles.boton} aria-label={textoHanzi(cerrar.verbo)} onClick={() => alElegir(cerrar)}>
            <span aria-hidden="true">{cerrar.icono}</span>
            <span className={styles.hz}>{textoHanzi(cerrar.verbo)}</span>
            <Pinyin s={cerrar.verbo} />
          </button>
        )}
      </div>

      <button type="button" className={pp.cerrar} aria-label="关" data-pinyin="guān" title="关 guān" onClick={alCerrar}>
        <span aria-hidden="true">✕</span>
      </button>

      <div className={pp.vaca}>
        <Vaca ojos={cara.ojos} hocico={cara.hocico} orejas={cara.orejas} salta={cara.salta} />
      </div>
    </div>
  );
}

