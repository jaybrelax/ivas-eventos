/**
 * Campo de CSV entre aspas. Texto que começa com =, +, -, @, tab ou CR é lido como fórmula
 * pelo Excel/Sheets (injeção de fórmula): ganha um apóstrofo na frente para virar texto.
 */
export function csvCampo(v: string): string {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${seguro.replace(/"/g, '""')}"`;
}
