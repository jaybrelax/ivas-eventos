/**
 * Regras puras do "cadastro rápido" (sem senha) e de quando ele é a mesma pessoa de um cadastro novo.
 * Testadas em scripts/conta-rapida.test.mjs. Este arquivo existe igual nos dois apps (Eventos e Guarnição).
 *
 * Conta rápida: criada pela equipe só com o nome na página do ritual (label "avulso"), depois com telefone e,
 * às vezes, e-mail. Não tem senha. Quando a pessoa cria a própria conta, as duas viram uma só.
 */

/** Labels de perfil de painel: quem tem um deles nunca é tratado como conta rápida. */
const PERFIS_PAINEL = ["admin", "coordenador", "normal"];

/**
 * Chave para comparar telefones escritos de jeitos diferentes: DDD + últimos 8 dígitos.
 * "(43) 99999-0000", "+55 43 99999 0000" e "43 9999-0000" dão a mesma chave (ignora o 9 extra e o 55).
 * Devolve null quando não parece um telefone brasileiro completo.
 */
export function chaveTelefone(texto: string | null | undefined): string | null {
  let d = String(texto ?? "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  return d.slice(0, 2) + d.slice(-8);
}

/** Conta criada pela equipe sem senha e sem perfil de painel. */
export function ehContaRapida(u: { labels?: string[] | null; prefs?: Record<string, unknown> | null; passwordUpdate?: string | null }): boolean {
  const labels = u.labels ?? [];
  if (labels.some((l) => PERFIS_PAINEL.includes(l))) return false;
  const marcada = labels.includes("avulso") || u.prefs?.avulso === true;
  return marcada && !u.passwordUpdate;
}

export type ContaCandidata = { id: string; email: string | null; telefone: string | null; rapida: boolean };

/**
 * Qual conta rápida é a mesma pessoa de um cadastro novo?
 * 1. E-mail igual ao de uma conta rápida.
 * 2. Senão, telefone igual (mesma chave) a uma conta rápida que ainda não tem e-mail.
 * Mais de uma candidata em qualquer regra: ambíguo, não junta sozinho (o admin resolve na ferramenta de mesclar).
 */
export function escolherContaRapida(candidatas: ContaCandidata[], novo: { email?: string | null; telefone?: string | null }): ContaCandidata | null {
  const rapidas = candidatas.filter((c) => c.rapida);
  const email = (novo.email ?? "").trim().toLowerCase();
  if (email) {
    const porEmail = rapidas.filter((c) => (c.email ?? "").trim().toLowerCase() === email);
    if (porEmail.length) return porEmail.length === 1 ? porEmail[0] : null;
  }
  const chave = chaveTelefone(novo.telefone);
  if (!chave) return null;
  const porTelefone = rapidas.filter((c) => !c.email && chaveTelefone(c.telefone) === chave);
  return porTelefone.length === 1 ? porTelefone[0] : null;
}
