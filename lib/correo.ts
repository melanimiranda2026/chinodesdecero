/** Forma mínima de un correo (la misma en el formulario y en /api/suscribir). */
export const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** true si el correo (ya sin espacios) tiene forma de correo. */
export function correoValido(email: string): boolean {
  return email.length > 0 && email.length <= 254 && CORREO.test(email);
}
