import { Forma, Trazo, elip, TINTA } from "./trazos";

/** Placeholders de los objetos: una función por capa con nombre, viewBox -60 -60 120 120.
 *  Cada una devuelve el contenido del <svg> (el marco lo pone <Capa/>). */

const VASO = "M-26 -38 L26 -38 L20 44 Q0 52 -20 44 Z";
const LIQ = "M-23 -6 L23 -6 L20 42 Q0 49 -20 42 Z";
const Manchas = ({ c }: { c: string }) => (
  <>
    <Forma d={elip(-10, 10, 7, 4)} fill={c} grosor={0} />
    <Forma d={elip(12, 22, 5, 3)} fill={c} grosor={0} />
    <Forma d={elip(4, -2, 4, 3)} fill={c} grosor={0} />
  </>
);

// ---- beizi (vaso) ----
export const BeiziAgua = () => <Forma d={LIQ} fill="#7FC3E8" grosor={0} />;
export const BeiziTe = () => <Forma d={LIQ} fill="#C98E3A" grosor={0} />;
export const BeiziVaso = () => (
  <>
    <Forma d={VASO} fill="rgba(227,241,245,0.45)" grosor={0} />
    <Trazo d={VASO} />
    <Trazo d="M-14 -28 L-12 30" color="#fff" />
  </>
);
export const BeiziMugre = () => (
  <>
    <Forma d="M-21 30 L21 30 L20 42 Q0 49 -20 42 Z" fill="#c9b48a" grosor={0} />
    <Manchas c="#b39a6a" />
  </>
);

// ---- wan (bol) ----
export const WanBol = () => (
  <>
    <Forma d="M-52 -6 Q-50 46 0 48 Q50 46 52 -6 Z" fill="#F6F1E7" />
    <Trazo d="M-44 14 Q0 30 44 14" color="#3A6FD6" />
    <Trazo d="M-30 30 Q0 40 30 30" color="#3A6FD6" grosor={3} />
    <Forma d={elip(0, -6, 52, 12)} fill="#fff" />
  </>
);
export const WanArroz = () => (
  <>
    <Forma d="M-42 -8 Q-30 -36 0 -38 Q30 -36 42 -8 Z" fill="#FFFDF7" grosor={3} />
    <Trazo d="M-14 -22 L-10 -22 M8 -28 L12 -28 M0 -16 L4 -16" color="#e6dcc4" grosor={3} />
  </>
);
export const WanMugre = () => (
  <>
    <Forma d={elip(-14, -6, 6, 3)} fill="#fff" grosor={2} />
    <Forma d={elip(10, -4, 5, 3)} fill="#fff" grosor={2} />
    <Forma d={elip(26, -8, 4, 2)} fill="#d8c79a" grosor={0} />
    <Forma d={elip(-28, -7, 4, 2)} fill="#d8c79a" grosor={0} />
  </>
);

// ---- panzi (plato) ----
export const PanziPlato = () => (
  <>
    <Forma d={elip(0, 4, 56, 26)} fill="#F6F1E7" />
    <Forma d={elip(0, 2, 38, 16)} fill="#fff" grosor={3} />
    <Trazo d="M-46 14 Q0 34 46 14" color="#E07F68" grosor={3} />
  </>
);
export const PanziJiaozi = () => (
  <>
    {[[-18, -4], [6, -10], [16, 6], [-6, 8]].map(([x, y]) => (
      <g key={`${x},${y}`}>
        <Forma d={`M${x - 15} ${y + 4} Q${x - 12} ${y - 12} ${x} ${y - 12} Q${x + 12} ${y - 12} ${x + 15} ${y + 4} Q${x} ${y + 9} ${x - 15} ${y + 4} Z`} fill="#FBF1D6" grosor={3} />
        <Trazo d={`M${x - 6} ${y - 8} L${x - 4} ${y - 2} M${x + 2} ${y - 10} L${x + 3} ${y - 3}`} color="#d9c59a" grosor={2} />
      </g>
    ))}
  </>
);
export const PanziMugre = () => (
  <>
    <Forma d={elip(-12, 2, 10, 5)} fill="#b5532f" grosor={0} />
    <Forma d={elip(14, -4, 6, 3)} fill="#b5532f" grosor={0} />
    <Forma d={elip(4, 10, 3, 2)} fill="#f4e6c0" grosor={0} />
    <Forma d={elip(-24, -2, 3, 2)} fill="#f4e6c0" grosor={0} />
  </>
);

// ---- kuaizi ----
export const KuaiziPalillos = () => (
  <>
    <Forma d="M-52 -14 L48 -30 L50 -24 L-50 -6 Z" fill="#C8915C" grosor={3} />
    <Forma d="M-50 6 L50 -8 L51 -1 L-49 14 Z" fill="#C8915C" grosor={3} />
    <Trazo d="M30 -27 L33 -21" color="#E2574E" grosor={5} />
    <Trazo d="M32 -6 L33 1" color="#E2574E" grosor={5} />
  </>
);

// ---- pingguo ----
export const PingguoEntera = () => (
  <>
    <Forma d="M0 -26 C-34 -40 -50 -6 -42 18 C-34 42 -14 50 0 40 C14 50 34 42 42 18 C50 -6 34 -40 0 -26 Z" fill="#E2574E" />
    <Trazo d="M18 -10 C24 -4 26 6 24 14" color="#F28B7D" />
    <Trazo d="M0 -26 Q2 -40 8 -48" grosor={5} />
    <Forma d="M6 -40 Q22 -54 34 -42 Q20 -32 6 -40 Z" fill="#7FB24F" grosor={3} />
  </>
);
export const PingguoMugre = () => (
  <>
    <Forma d={elip(-16, 4, 4, 3)} fill="#8a6a3a" grosor={0} />
    <Forma d={elip(-6, 22, 3, 2)} fill="#8a6a3a" grosor={0} />
    <Forma d={elip(14, -6, 3, 2)} fill="#8a6a3a" grosor={0} />
    <Forma d={elip(20, 18, 4, 2)} fill="#8a6a3a" grosor={0} />
  </>
);
export const PingguoMitadIzq = () => (
  <g transform="translate(-14 4) rotate(-14)">
    <Forma d="M-4 -26 C-38 -40 -52 -6 -44 18 C-36 42 -16 50 -4 40 Z" fill="#E2574E" />
    <Forma d="M-4 -22 C-30 -30 -42 -4 -36 16 C-30 34 -16 40 -4 34 Z" fill="#FFF1C9" grosor={2} />
    <Forma d={elip(-14, 8, 3, 5)} fill="#5a3a1e" grosor={0} />
  </g>
);
export const PingguoMitadDer = () => (
  <g transform="translate(14 4) rotate(14)">
    <Forma d="M4 -26 C38 -40 52 -6 44 18 C36 42 16 50 4 40 Z" fill="#E2574E" />
    <Forma d="M4 -22 C30 -30 42 -4 36 16 C30 34 16 40 4 34 Z" fill="#FFF1C9" grosor={2} />
    <Forma d={elip(14, 8, 3, 5)} fill="#5a3a1e" grosor={0} />
  </g>
);

// ---- bingxiang (el interior vive detrás de la puerta; la puerta es la que se mueve) ----
export const BingxiangCuerpo = () => (
  <>
    <Forma d="M-44 -68 L44 -68 L50 -58 L-50 -58 Z" fill="#F7FAFB" />
    <Forma d="M-50 -58 L50 -58 L50 60 L-50 60 Z" fill="#E8EEF0" />
  </>
);
export const BingxiangInterior = () => (
  <>
    <Forma d="M-44 -52 L44 -52 L44 54 L-44 54 Z" fill="#FFF8C9" grosor={0} />
    <Trazo d="M-44 -18 L44 -18" color="#cfd6b0" grosor={3} />
    <Trazo d="M-44 18 L44 18" color="#cfd6b0" grosor={3} />
    <Forma d={elip(-22, -30, 9, 9)} fill="#E2574E" grosor={2} />
    <Forma d={elip(-4, -30, 9, 9)} fill="#E2574E" grosor={2} />
    <Forma d="M10 -46 L26 -46 L26 -22 L10 -22 Z" fill="#fff" grosor={2} />
    <Forma d={elip(14, 6, 14, 8)} fill="#7FB24F" grosor={2} />
    <Forma d="M-34 28 Q-30 20 -22 20 Q-14 20 -10 28 Q-22 32 -34 28 Z" fill="#FBF1D6" grosor={2} />
    <Forma d="M-8 30 Q-4 22 4 22 Q12 22 16 30 Q4 34 -8 30 Z" fill="#FBF1D6" grosor={2} />
  </>
);
export const BingxiangPuerta = () => (
  <>
    <Forma d="M-50 -58 L50 -58 L50 60 L-50 60 Z" fill="#DDE6EA" />
    <Forma d="M-28 14 L-6 14 L-6 40 L-28 40 Z" fill="#FFF6E6" grosor={2} />
    <Trazo d="M-24 22 H-10 M-24 28 H-12 M-24 34 H-14" color="#E2574E" grosor={1.5} />
    <Forma d="M-17 10 a4 4 0 1 0 0.1 0Z" fill="#3A6FD6" grosor={1.5} />
    <Forma d="M-30 -40 q4 -6 8 0 q4 -6 8 0 l-8 10z" fill="#E2574E" grosor={2} />
    <Forma d="M-4 -34 a6 6 0 1 0 0.1 0Z" fill="#F2C14E" grosor={2} />
    <Trazo d="M-50 -14 L50 -14" />
    <Trazo d="M36 -44 L36 -26" color="#8a979e" grosor={6} />
    <Trazo d="M36 0 L36 30" color="#8a979e" grosor={6} />
    <Trazo d="M-38 -48 L-38 48" color="#fff" grosor={3} />
  </>
);

// ---- guo (olla) ----
export const GuoOlla = () => (
  <>
    <Trazo d="M-58 -4 L-44 -4" grosor={7} />
    <Trazo d="M44 -4 L58 -4" grosor={7} />
    <Forma d="M-46 -10 L46 -10 L40 36 Q0 46 -40 36 Z" fill="#A9B4BA" />
    <Forma d={elip(0, -10, 46, 12)} fill="#5d6a71" />
    <Trazo d="M-30 6 Q-26 26 -14 32" color="#fff" grosor={3} />
  </>
);
export const GuoArroz = () => (
  <>
    <Forma d={elip(0, -10, 38, 9)} fill="#FFFDF7" grosor={2} />
    <Trazo d="M-16 -12 L-12 -12 M6 -8 L10 -8 M-2 -14 L2 -14" color="#e6dcc4" grosor={3} />
  </>
);
export const GuoMugre = () => (
  <>
    <Forma d={elip(-12, -10, 8, 3)} fill="#e9dfc6" grosor={0} />
    <Forma d={elip(14, -8, 6, 2)} fill="#e9dfc6" grosor={0} />
  </>
);

// ---- chahu ----
export const ChahuTetera = () => (
  <>
    <Trazo d="M30 -6 Q56 -10 50 -36" grosor={6} />
    <Forma d="M-36 -22 Q-42 30 0 36 Q42 30 36 -22 Z" fill="#7FB24F" />
    <Forma d="M-40 6 Q-62 -2 -58 -26 L-52 -26 Q-52 -6 -36 -2 Z" fill="#7FB24F" grosor={3} />
    <Forma d={elip(0, -22, 32, 8)} fill="#9ccf6c" />
    <Forma d="M-8 -40 L8 -40 L6 -30 L-6 -30 Z" fill="#E2574E" grosor={3} />
    <Trazo d="M-20 0 Q-16 18 -4 24" color="#fff" grosor={3} />
  </>
);

// ---- primer plano (juegos) ----
const VASO_GRANDE_D = "M-34 -46 L34 -46 L26 52 Q0 60 -26 52 Z";
/** Vidrio: el interior es transparente; el líquido lo dibuja el código detrás. */
export const VasoGrande = () => (
  <>
    <Trazo d={VASO_GRANDE_D} />
    <Trazo d="M-22 -36 L-18 40" color="#fff" />
  </>
);
/** Silueta opaca del interior: recorta el líquido. Nunca se ve. */
export const VasoMascara = () => <path d={VASO_GRANDE_D} fill="#000" />;
export const OllaGrande = () => (
  <>
    <Forma d={elip(0, 0, 56, 56)} fill="#7d8a91" />
    <Forma d={elip(0, 0, 48, 48)} fill="#F2E3B0" grosor={3} />
  </>
);
/** Lo que gira dentro de la olla. */
export const Trozos = () => (
  <>
    {Array.from({ length: 14 }, (_, i) => {
      const r = 10 + (i % 4) * 9;
      const ang = i * 2.4;
      const c = ["#FFFDF7", "#7FB24F", "#E07F68", "#F2C14E"][i % 4];
      return <path key={i} d={elip(Math.cos(ang) * r, Math.sin(ang) * r, 5, 3.5)} fill={c} stroke={TINTA} strokeWidth={1.5} />;
    })}
  </>
);
