/** Busca por texto sem acento e sem diferenciar maiúsculas. Regras puras, testadas em scripts/busca-texto.test.mjs. */
export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todas as palavras digitadas precisam aparecer no texto (em qualquer ordem): "ana mello" acha "Ana Beatriz Mello". */
export function casaBusca(termo: string, texto: string): boolean {
  const palavras = semAcento(termo).split(/\s+/).filter(Boolean);
  if (!palavras.length) return true;
  const alvo = semAcento(texto);
  return palavras.every((p) => alvo.includes(p));
}
