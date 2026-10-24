export const NUMERIC_PASSWORD_MIN = 6;
export const NUMERIC_PASSWORD_MAX = 12;

export function isNumericPassword(value: string): boolean {
  return /^\d{6,12}$/.test(value);
}

export function validateRegistration(input: { name: string; email: string; password: string; confirmPassword?: string }): string | null {
  if (!input.name.trim()) return 'Escribe tu nombre.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Escribe un correo válido.';
  if (!isNumericPassword(input.password)) return 'La clave debe tener entre 6 y 12 números, sin letras ni espacios.';
  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) return 'Las claves no coinciden. Revisa los dos campos.';
  return null;
}
