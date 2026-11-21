export const NOMBRES_EVENTO = [
  "entrar",
  "tocar_objeto",
  "abrir_acciones",
  "gesto_completo",
  "quiz_inicio",
  "encontrar_gato",
  "quiz_completo",
  "ver_metodo",
  "tocar_bloqueado",
  "dejar_correo",
  "clic_tiktok",
  "descargar_material",
  "abrir_minijuego",
  "puzzle_nivel_inicio",
  "puzzle_nivel_completo",
  "puzzle_sin_vasos",
  "puzzle_vasos_correo",
  // cuartos del motor (living) y la puerta que pide el correo
  "accion_lograda",
  "ficha_ganada",
  "cuarto_completo",
  "pedir_correo_salida",
  "salir_cuarto",
] as const;

export type NombreEvento = (typeof NOMBRES_EVENTO)[number];
