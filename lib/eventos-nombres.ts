export const NOMBRES_EVENTO = [
  "entrar",
  "tocar_objeto",
  "abrir_acciones",
  "gesto_completo",
  "quiz_completo",
  "ver_metodo",
  "tocar_bloqueado",
  "dejar_correo",
  "clic_tiktok",
  "descargar_material",
] as const;

export type NombreEvento = (typeof NOMBRES_EVENTO)[number];
