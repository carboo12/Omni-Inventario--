/**
 * Genera un UUID v4 de forma segura. En navegadores servidos por HTTP en red
 * local, `window.crypto.randomUUID()` no está disponible (requiere contexto
 * seguro/HTTPS), lo que rompía los onClick de "Retomar" y demás handlers.
 * Este helper intenta primero la API nativa y cae a un generador manual.
 */
export function generateUUID(): string {
  if (
    typeof window !== 'undefined'
    && window.crypto
    && typeof window.crypto.randomUUID === 'function'
  ) {
    return window.crypto.randomUUID();
  }
  // Entorno servidor / Node (globalThis.crypto).
  if (
    typeof globalThis !== 'undefined'
    && globalThis.crypto
    && typeof (globalThis.crypto as any).randomUUID === 'function'
  ) {
    return (globalThis.crypto as any).randomUUID();
  }
  // Fallback seguro para HTTP en red local.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}