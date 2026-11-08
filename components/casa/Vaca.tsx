"use client";
import { useEffect, useState } from "react";

export type Ojos = "abiertos" | "cerrados" | "felices" | "izquierda" | "sorpresa";
export type Hocico = "punto" | "o" | "abierta" | "sonrisa" | "neutra";
export type Orejas = "normales" | "arriba";

const OJOS: Ojos[] = ["abiertos", "cerrados", "felices", "izquierda", "sorpresa"];
const HOCICOS: Hocico[] = ["punto", "o", "abierta", "sonrisa", "neutra"];
const BORDE =
  "drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 10px 8px rgba(40,25,10,.3))";
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
        <img src="/vaca/vaca_cuerpo.png" alt="" draggable={false} data-capa="cuerpo" style={{ ...capa, opacity: orejas === "normales" ? 1 : 0 }} />
        <img src="/vaca/vaca_cuerpo_orejas.png" alt="" draggable={false} data-capa="orejas" style={{ ...capa, opacity: orejas === "arriba" ? 1 : 0 }} />
        {OJOS.map((o) => (
          <img key={o} src={`/vaca/vaca_ojos_${o}.png`} alt="" draggable={false} data-ojos={o} style={{ ...capa, opacity: o === ojosVistos ? 1 : 0 }} />
        ))}
        {HOCICOS.map((h) => (
          <img key={h} src={`/vaca/vaca_hocico_${h}.png`} alt="" draggable={false} data-hocico={h} style={{ ...capa, opacity: h === hocico ? 1 : 0 }} />
        ))}
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </div>
  );
}
