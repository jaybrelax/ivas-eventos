/**
 * Texto dos posts da Central do evento (sem dependências: usado no navegador, no servidor e nos testes).
 *
 * As menções ficam dentro do próprio texto como `@[Nome](id)`. Assim a ordem e o nome exibido se
 * mantêm, e a lista de ids marcados (coluna `mencoes`) é sempre derivada do texto.
 */

export const TIPOS_CENTRAL = ["aviso", "lembrete", "ocorrencia", "tarefa"] as const;
export type TipoCentral = (typeof TIPOS_CENTRAL)[number];

export const TEXTO_MAX = 4000;
export const IMAGENS_MAX = 10;

/** `@[Nome](id)`: nome sem colchetes/parênteses/quebra de linha, id no formato do Appwrite. */
const MENCAO = /@\[([^\]\n()[]{1,80})\]\(([A-Za-z0-9._-]{1,36})\)/g;
const LINK = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Token de menção para inserir no texto. */
export function tokenMencao(nome: string, id: string) {
  const limpo = nome.replace(/[[\]()\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "pessoa";
  return `@[${limpo}](${id})`;
}

/** Normaliza quebras de linha e espaços, tira linhas vazias em excesso e limita o tamanho. */
export function limparTexto(texto: string) {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, TEXTO_MAX);
}

/** Ids marcados no texto, sem repetir e na ordem em que aparecem. */
export function mencoesDoTexto(texto: string): string[] {
  return [...new Set([...texto.matchAll(MENCAO)].map((m) => m[2]))];
}

/**
 * Mantém só as menções de pessoas permitidas; as outras viram texto comum (`@Nome`).
 * Devolve o texto pronto para gravar e os ids marcados.
 */
export function filtrarMencoes(texto: string, permitidos: Iterable<string>) {
  const ok = new Set(permitidos);
  const limpo = limparTexto(texto.replace(MENCAO, (todo, nome: string, id: string) => (ok.has(id) ? todo : `@${nome}`)));
  return { texto: limpo, mencoes: mencoesDoTexto(limpo) };
}

/** Texto sem a marcação técnica das menções (para prévias e para o campo de edição em texto puro). */
export function textoSimples(texto: string) {
  return texto.replace(MENCAO, (_, nome: string) => `@${nome}`);
}

export type ParteTexto = { tipo: "texto"; valor: string } | { tipo: "mencao"; nome: string; id: string } | { tipo: "link"; url: string };

/** Quebra o texto em pedaços para exibir: trechos comuns, menções (chips) e links clicáveis. */
export function partesTexto(texto: string): ParteTexto[] {
  const partes: ParteTexto[] = [];
  const empurrarTexto = (valor: string) => {
    let ultimo = 0;
    for (const m of valor.matchAll(LINK)) {
      if (m.index > ultimo) partes.push({ tipo: "texto", valor: valor.slice(ultimo, m.index) });
      partes.push({ tipo: "link", url: m[0] });
      ultimo = m.index + m[0].length;
    }
    if (ultimo < valor.length) partes.push({ tipo: "texto", valor: valor.slice(ultimo) });
  };
  let ultimo = 0;
  for (const m of texto.matchAll(MENCAO)) {
    if (m.index > ultimo) empurrarTexto(texto.slice(ultimo, m.index));
    partes.push({ tipo: "mencao", nome: m[1], id: m[2] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) empurrarTexto(texto.slice(ultimo));
  return partes;
}
