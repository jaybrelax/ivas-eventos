export const ASPECTOS = [
  ["ritual", "Experiência do ritual"],
  ["mestres", "Condução dos mestres"],
  ["guardioes", "Acolhimento dos guardiões"],
  ["ambiente", "Ambiente e estrutura"],
  ["musica", "Seleção musical"],
] as const;

export type Notas = Record<(typeof ASPECTOS)[number][0], number>;

export function validarNotas(valor: unknown): Notas | null {
  if (!valor || typeof valor !== "object") return null;
  const entrada = valor as Record<string, unknown>;
  if (!ASPECTOS.every(([chave]) => typeof entrada[chave] === "number" && Number.isFinite(entrada[chave]) && (entrada[chave] as number) >= 1 && (entrada[chave] as number) <= 10 && (entrada[chave] as number) * 2 % 1 === 0)) return null;
  return Object.fromEntries(ASPECTOS.map(([chave]) => [chave, entrada[chave]])) as Notas;
}

export function validarTexto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto.length >= 10 && texto.length <= 2000 ? texto : null;
}
