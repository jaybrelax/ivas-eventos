/**
 * Possíveis contas duplicadas (mesma pessoa com duas contas). Regras puras, testadas em scripts/conta-rapida.test.mjs.
 * Agrupa por telefone igual (mesma chave) ou por nome igual quando uma das contas é cadastro rápido.
 */
/** `chaveTel` vem de `chaveTelefone` (conta-rapida-regras): telefone normalizado ou null. */
export type ContaParaComparar = { id: string; nome: string; chaveTel: string | null; rapida: boolean };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function agruparPossiveisDuplicadas(contas: ContaParaComparar[]): { motivo: "telefone" | "nome"; contas: ContaParaComparar[] }[] {
  const grupos = new Map<string, { motivo: "telefone" | "nome"; contas: ContaParaComparar[] }>();
  const juntar = (motivo: "telefone" | "nome", chave: string, c: ContaParaComparar) => {
    const g = grupos.get(`${motivo}:${chave}`) ?? { motivo, contas: [] };
    g.contas.push(c);
    grupos.set(`${motivo}:${chave}`, g);
  };
  for (const c of contas) {
    if (c.chaveTel) juntar("telefone", c.chaveTel, c);
    const nome = semAcento(c.nome);
    if (nome.split(" ").length >= 2) juntar("nome", nome, c);
  }
  const vistos = new Set<string>();
  const resultado: { motivo: "telefone" | "nome"; contas: ContaParaComparar[] }[] = [];
  for (const g of grupos.values()) {
    if (g.contas.length < 2) continue;
    // Por nome, só vale se uma das contas é cadastro rápido (dois homônimos comuns não são duplicata)
    if (g.motivo === "nome" && !g.contas.some((c) => c.rapida)) continue;
    const chave = g.contas.map((c) => c.id).sort().join("|");
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(g);
  }
  return resultado.sort((a, b) => a.contas[0].nome.localeCompare(b.contas[0].nome, "pt-BR"));
}
