"use client";
import { useEffect, useState } from "react";
import { ARTE_VACA } from "./arte/registro";

export type Ojos = keyof typeof ARTE_VACA.ojos;
export type Hocico = keyof typeof ARTE_VACA.hocico;
export type Orejas = "normales" | "arriba";

const OJOS = Object.keys(ARTE_VACA.ojos) as Ojos[];
const HOCICOS = Object.keys(ARTE_VACA.hocico) as Hocico[];
/** Borde blanco de sticker en dos pasadas (antes eran cinco drop-shadow: caro de pintar en celulares). */
export const BORDE = "drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff)";
const capa = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" } as const;

/** La vaca: todas las capas montadas, solo cambia la opacidad. */
export function Vaca({
  ojos, hocico, orejas, salta = false,
}: { ojos: Ojos; hocico: Hocico; orejas: Orejas; salta?: boolean }) {
  const [parpadea, setParpadea] = useState(false);

  useEffect(() => {
    if (ojos !== "abiertos") return;
    let cierra: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setParpadea(true);
      cierra = setTimeout(() => setParpadea(false), 140);
    }, 3400);
    return () => {
      clearInterval(id);
      if (cierra) clearTimeout(cierra);
      setParpadea(false);
    };
  }, [ojos]);

  const ojosVistos: Ojos = ojos === "abiertos" && parpadea ? "cerrados" : ojos;

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
      <div
        className={salta ? "vaca-cuerpo vaca-salta" : "vaca-cuerpo"}
        style={{ position: "absolute", inset: 0, transformOrigin: "50% 96%", filter: BORDE }}
      >
        {/* eslint-disable @next/next/no-img-element */}
        <img src={ARTE_VACA.cuerpo} alt="" draggable={false} data-capa="cuerpo" style={{ ...capa, opacity: orejas === "normales" ? 1 : 0 }} />
        <img src={ARTE_VACA.orejas} alt="" draggable={false} data-capa="orejas" style={{ ...capa, opacity: orejas === "arriba" ? 1 : 0 }} />
        {OJOS.map((o) => (
          <img key={o} src={ARTE_VACA.ojos[o]} alt="" draggable={false} data-ojos={o} style={{ ...capa, opacity: o === ojosVistos ? 1 : 0 }} />
        ))}
        {HOCICOS.map((h) => (
          <img key={h} src={ARTE_VACA.hocico[h]} alt="" draggable={false} data-hocico={h} style={{ ...capa, opacity: h === hocico ? 1 : 0 }} />
        ))}
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </div>
  );
}
