import { Forma, Trazo, rr } from "./trazos";

/** Placeholder del cuarto completo (viewBox 0 0 1000 1000). Los objetos NO van aquí: sus posiciones viven en OBJETOS. */

const Sombra = ({ cx, cy, rx, ry, o = 0.2 }: { cx: number; cy: number; rx: number; ry: number; o?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`rgba(70,40,15,${o})`} />
);
const Caja = ({ x, y, w, alto, prof, arriba, frente, r = 10 }: { x: number; y: number; w: number; alto: number; prof: number; arriba: string; frente: string; r?: number }) => (
  <>
    <Forma d={rr(x, y + prof, w, alto, r)} fill={frente} />
    <Forma d={rr(x, y, w, prof + r, r)} fill={arriba} />
  </>
);

const COLGANTES: [number, string][] = [[220, "cuchara"], [262, "espatula"], [304, "batidor"], [346, "cucharon"]];
const FRASCOS: [number, number, string, number][] = [[850, 92, "#F2C14E", 48], [884, 104, "#E2574E", 36], [916, 86, "#A9D3C2", 54], [954, 98, "#F2A07E", 42]];
const PLATOS: [number, number][] = [[858, 196], [898, 192], [938, 196]];
const HOJAS = ["M70 892 Q20 820 0 830 Q30 860 62 896 Z", "M70 892 Q60 780 90 760 Q96 820 78 894 Z", "M74 894 Q130 830 160 846 Q120 870 82 898 Z", "M66 894 Q40 760 20 760 Q36 830 60 898 Z"];

function Piso() {
  const filas: React.ReactNode[] = [];
  let y = 390, h = 38, fila = 0;
  while (y < 1000) {
    filas.push(
      <g key={fila}>
        <rect y={y} width="1000" height={h} fill={fila % 2 ? "#DCA56B" : "#E6B47E"} />
        <Trazo d={`M0 ${y} H1000`} color="#B9814B" grosor={2.5} />
        {Array.from({ length: 4 }, (_, k) => (fila % 3) * 110 + 60 + k * 330).filter((x) => x < 1000).map((x) => (
          <Trazo key={x} d={`M${x} ${y + 3} V${y + h - 3}`} color="#B9814B" grosor={2.5} />
        ))}
      </g>,
    );
    y += h; h *= 1.09; fila++;
  }
  return <>{filas}</>;
}

export function CocinaCuarto() {
  return (
    <>
      <defs>
        <pattern id="papel" width="70" height="70" patternUnits="userSpaceOnUse">
          <rect width="70" height="70" fill="#F8E7CC" />
          <circle cx="17" cy="17" r="5" fill="#F2C9A8" /><circle cx="52" cy="52" r="5" fill="#F2C9A8" />
          <path d="M52 10 q4 6 0 12 q-4 -6 0 -12z" fill="#A9D3C2" /><path d="M17 45 q4 6 0 12 q-4 -6 0 -12z" fill="#A9D3C2" />
        </pattern>
        <pattern id="alfombra" width="44" height="44" patternUnits="userSpaceOnUse">
          <rect width="44" height="44" fill="#E9785F" /><path d="M0 22 L22 0 L44 22 L22 44Z" fill="#F2A07E" /><circle cx="22" cy="22" r="5" fill="#FBE3B5" />
        </pattern>
        <pattern id="tapete" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="#8FC3D6" /><rect width="15" height="30" fill="#B8DCE7" />
        </pattern>
        <radialGradient id="luz" cx="55%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFF1BF" stopOpacity=".45" /><stop offset=".55" stopColor="#FFF1BF" stopOpacity="0" /><stop offset="1" stopColor="#4a2410" stopOpacity=".32" />
        </radialGradient>
        <linearGradient id="vidrio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D8F1FF" /><stop offset="1" stopColor="#9FD3F0" /></linearGradient>
      </defs>

      {/* pared */}
      <rect width="1000" height="390" fill="url(#papel)" />
      <Forma d={rr(-10, -10, 1020, 34, 0)} fill="#E7C29A" grosor={0} />
      <Trazo d="M0 24 H1000" color="#B98557" />
      <Forma d={rr(-10, 300, 1020, 92, 0)} fill="#C9915D" grosor={0} />
      {Array.from({ length: 17 }, (_, i) => 20 + i * 60).map((x) => <Trazo key={x} d={`M${x} 306 V388`} color="#B07A48" grosor={3} />)}
      <Trazo d="M0 302 H1000" color="#9a6a40" grosor={5} />

      {/* ventana */}
      <Forma d={rr(440, 46, 180, 190, 14)} fill="#8A5A3A" />
      <Forma d={rr(452, 58, 156, 166, 8)} fill="url(#vidrio)" grosor={0} />
      <Trazo d="M530 58 V224 M452 140 H608" color="#8A5A3A" grosor={7} />
      <Trazo d="M466 72 L500 106 M476 72 L520 116" color="#fff" />
      <Forma d="M430 38 Q470 60 456 250 L430 250 Z" fill="#F2A07E" />
      <Forma d="M630 38 Q590 60 604 250 L630 250 Z" fill="#F2A07E" />
      <Forma d={rr(420, 26, 220, 18, 9)} fill="#C9915D" />
      <Forma d={rr(430, 236, 200, 16, 6)} fill="#E7C29A" />
      <Forma d="M560 236 L566 206 L594 206 L600 236 Z" fill="#D9785F" />
      <Forma d="M570 208 Q560 180 572 170 Q584 186 578 208 Z M584 208 Q596 176 610 178 Q600 196 590 208 Z" fill="#7FB24F" />

      {/* alacenas de arriba */}
      <Sombra cx={290} cy={198} rx={120} ry={10} o={0.15} />
      <Caja x={185} y={46} w={220} alto={140} prof={0} arriba="#9CC9BA" frente="#9CC9BA" r={12} />
      <Forma d={rr(195, 58, 96, 116, 10)} fill="#B3D8CB" />
      <Forma d={rr(299, 58, 96, 116, 10)} fill="#B3D8CB" />
      <Forma d={rr(280, 108, 8, 22, 4)} fill="#F2C14E" grosor={2} />
      <Forma d={rr(306, 108, 8, 22, 4)} fill="#F2C14E" grosor={2} />
      <Trazo d="M200 214 H392" color="#8a979e" grosor={6} />
      {COLGANTES.map(([x, t]) => (
        <g key={t}>
          <Trazo d={`M${x} 214 V232`} color="#8a979e" grosor={3} />
          {t === "cuchara" && <><Trazo d={`M${x} 232 V268`} color="#C8915C" grosor={6} /><Forma d={`M${x - 9} 268 Q${x} 292 ${x + 9} 268 Z`} fill="#C8915C" grosor={3} /></>}
          {t === "espatula" && <><Trazo d={`M${x} 232 V262`} grosor={5} /><Forma d={rr(x - 11, 262, 22, 22, 5)} fill="#E2574E" grosor={3} /></>}
          {t === "batidor" && <><Trazo d={`M${x} 232 V254`} grosor={5} /><Forma d={`M${x} 254 Q${x - 16} 284 ${x} 290 Q${x + 16} 284 ${x} 254 Z`} fill="none" grosor={3} /><Trazo d={`M${x} 256 V288`} grosor={2} /></>}
          {t === "cucharon" && <><Trazo d={`M${x} 232 V266`} color="#8a979e" grosor={5} /><Forma d={`M${x - 13} 266 Q${x} 294 ${x + 13} 266 Z`} fill="#A9B4BA" grosor={3} /></>}
        </g>
      ))}

      {/* campana, repisa, reloj */}
      <Forma d="M690 110 L800 110 L822 196 L668 196 Z" fill="#E8EEF0" />
      <Forma d={rr(712, 30, 66, 82, 6)} fill="#D5DEE2" />
      <Trazo d="M676 186 H814" color="#A9B4BA" />
      <Sombra cx={915} cy={168} rx={72} ry={7} o={0.15} />
      <Forma d={rr(838, 140, 150, 20, 6)} fill="#C8915C" />
      {FRASCOS.map(([x, y, c, h]) => (
        <g key={x}>
          <Forma d={rr(x, y, 28, h, 8)} fill="#EAF4F6" />
          <Forma d={rr(x + 3, y + h * 0.35, 22, h * 0.62, 6)} fill={c} grosor={0} />
          <Forma d={rr(x - 2, y - 8, 32, 12, 4)} fill="#C8915C" grosor={2} />
        </g>
      ))}
      <Forma d={rr(838, 230, 150, 20, 6)} fill="#C8915C" />
      {PLATOS.map(([x, y]) => (
        <g key={x}>
          <Forma d={`M${x - 18} ${y + 34} A20 34 0 0 1 ${x + 18} ${y + 34} Z`} fill="#F6F1E7" />
          <Trazo d={`M${x - 12} ${y + 30} A14 26 0 0 1 ${x + 12} ${y + 30}`} color="#3A6FD6" grosor={3} />
        </g>
      ))}
      <Forma d="M66 150 a36 36 0 1 0 72 0 a36 36 0 1 0 -72 0Z" fill="#FFF6E6" />
      <Trazo d="M102 150 V126 M102 150 L120 158" grosor={5} />
      <Forma d="M96 110 h12 v-10 h-12z" fill="#E2574E" grosor={2} />

      {/* piso */}
      <rect y="390" width="1000" height="610" fill="#E2AE76" />
      <Piso />

      <Sombra cx={105} cy={462} rx={112} ry={20} o={0.25} />

      {/* meson */}
      <Sombra cx={545} cy={478} rx={400} ry={22} o={0.22} />
      <Forma d={rr(175, 345, 740, 118, 10)} fill="#7FB5A5" />
      {Array.from({ length: 6 }, (_, i) => 185 + i * 122).filter((x) => !(x > 660 && x < 800)).map((x) => (
        <g key={x}>
          <Forma d={rr(x, 356, 110, 96, 10)} fill="#9CC9BA" grosor={3} />
          <Forma d={rr(x + 48, 372, 14, 8, 4)} fill="#F2C14E" grosor={2} />
        </g>
      ))}
      <Forma d={rr(674, 354, 132, 100, 10)} fill="#4a4a4a" />
      <Forma d={rr(688, 382, 104, 58, 8)} fill="#2b2b2b" grosor={3} />
      <Trazo d="M694 368 H786" color="#A9B4BA" grosor={5} />
      <Forma d={rr(165, 296, 760, 56, 12)} fill="#F4EEE3" />
      <Trazo d="M172 344 H918" color="#D8CDBA" />
      <Forma d={rr(676, 300, 130, 40, 8)} fill="#3b3b3b" grosor={3} />
      <ellipse cx="711" cy="320" rx="22" ry="8" fill="#555" /><ellipse cx="771" cy="320" rx="22" ry="8" fill="#555" />
      <Forma d={rr(392, 302, 116, 40, 10)} fill="#8a979e" grosor={3} />
      <Forma d={rr(400, 308, 100, 28, 8)} fill="#BFD8E2" grosor={0} />
      <Trazo d="M452 302 V262 Q452 250 466 250 L480 250 Q490 250 490 262 V274" color="#A9B4BA" grosor={9} />
      <Forma d={rr(442, 294, 20, 10, 4)} fill="#A9B4BA" grosor={2} />
      <Forma d={rr(548, 314, 92, 28, 8)} fill="#E2B07A" grosor={3} />
      <circle cx="630" cy="328" r="4" fill="#4A2A1C" />
      <Forma d={rr(222, 286, 34, 44, 8)} fill="#F2A07E" />
      <Trazo d="M232 286 L226 252 M240 286 L242 248 M248 286 L256 256" color="#C8915C" grosor={5} />
      <Forma d={rr(345, 500, 220, 60, 26)} fill="url(#tapete)" />

      {/* comedor */}
      <ellipse cx="690" cy="780" rx="275" ry="150" fill="url(#alfombra)" filter="url(#crayon-relleno)" />
      <Trazo d="M415 780 A275 150 0 1 0 965 780 A275 150 0 1 0 415 780" color="#B5533F" grosor={5} />
      {[[560, 560], [820, 560]].map(([x, y]) => (
        <g key={x}>
          <Forma d={rr(x - 46, y, 92, 100, 22)} fill="#E2574E" />
          <Forma d={rr(x - 34, y + 14, 68, 40, 14)} fill="#F28B7D" grosor={0} />
        </g>
      ))}
      <Sombra cx={690} cy={845} rx={170} ry={36} o={0.25} />
      <Forma d={rr(674, 720, 32, 120, 8)} fill="#9a6a40" />
      <Forma d="M610 846 Q690 818 770 846 L770 856 Q690 832 610 856 Z" fill="#9a6a40" grosor={3} />
      <Forma d="M495 700 A195 100 0 0 0 885 700 L885 724 A195 100 0 0 1 495 724 Z" fill="#B07A48" />
      <ellipse cx="690" cy="700" rx="195" ry="100" fill="#D49A62" filter="url(#crayon-relleno)" />
      <Trazo d="M495 700 A195 100 0 1 0 885 700 A195 100 0 1 0 495 700" grosor={5} />
      <ellipse cx="690" cy="700" rx="150" ry="72" fill="#FFF6E6" opacity=".65" filter="url(#crayon-relleno)" />
      <Trazo d="M560 676 A150 72 0 0 1 820 676" color="#E07F68" grosor={3} />
      {[[540, 850], [840, 850]].map(([x, y]) => (
        <g key={x}>
          <Sombra cx={x} cy={y + 62} rx={54} ry={12} o={0.2} />
          <Trazo d={`M${x - 34} ${y + 20} V${y + 66} M${x + 34} ${y + 20} V${y + 66}`} color="#8A5A3A" grosor={8} />
          <Caja x={x - 50} y={y - 6} w={100} alto={24} prof={26} arriba="#F28B7D" frente="#E2574E" r={14} />
        </g>
      ))}

      {/* rincones */}
      <Sombra cx={70} cy={985} rx={70} ry={14} o={0.25} />
      <Forma d="M30 900 L110 900 L100 985 L40 985 Z" fill="#D9785F" />
      <Forma d={rr(24, 890, 92, 20, 8)} fill="#E99A7F" />
      {HOJAS.map((d) => <Forma key={d} d={d} fill="#6FA544" />)}
      <Sombra cx={370} cy={975} rx={80} ry={14} o={0.22} />
      <Forma d="M300 912 Q300 880 330 880 L420 880 Q450 880 446 912 L436 966 Q434 976 424 976 L320 976 Q310 976 308 966 Z" fill="#D9A55B" />
      <Trazo d="M306 920 H442 M310 944 H438" color="#B07A48" />
      <Forma d="M330 884 Q322 840 340 830 Q350 860 344 884 Z" fill="#7FB24F" />
      <Forma d="M352 884 L344 850 L372 850 L364 884 Z" fill="#F28C28" />
      <Forma d="M390 884 a18 16 0 1 1 36 0 Z" fill="#E2574E" />
      <Sombra cx={232} cy={548} rx={34} ry={9} o={0.22} />
      <Forma d={rr(206, 474, 52, 72, 12)} fill="#A9B4BA" />
      <Forma d={rr(200, 466, 64, 16, 8)} fill="#8a979e" />
      <Trazo d="M216 490 V530 M232 490 V530 M248 490 V530" color="#8a979e" grosor={3} />

      <rect width="1000" height="1000" fill="url(#luz)" pointerEvents="none" />
    </>
  );
}
