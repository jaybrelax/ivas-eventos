/**
 * Regras puras dos pacotes de créditos (sem banco). Testadas em scripts/creditos-regras.test.mjs.
 *
 * Conceitos:
 * - Pacote = a compra (financeiro). Cada pacote gera N créditos; 1 crédito = 1 participação em ritual.
 * - Saldo = créditos disponíveis − débitos. O saldo fica negativo quando a pessoa participa de um ritual
 *   (a inscrição está confirmada e o ritual já começou) sem crédito e sem contribuição avulsa resolvida.
 * - Débito não é uma tabela: é um estado derivado da inscrição (ver `ehDebito`). Some sozinho quando a
 *   contribuição avulsa é confirmada/isentada, a participação é cancelada ou um crédito é aplicado.
 */
import type { SituacaoCredito, SituacaoInscricao, SituacaoPacote, SituacaoPagamento } from "./types";

/** Quantidade máxima de créditos de um pacote. */
export const QUANTIDADE_MAXIMA = 100;

type TipoParaCredito = { conta_como_ritual: boolean; aberto_publico: boolean; fechado_guardioes: boolean };
type InscricaoParaCredito = { situacao: SituacaoInscricao; pagamento: SituacaoPagamento; credito_id?: string | null };
type CreditoOrdenavel = { situacao: SituacaoCredito; ordem: number | null; numero: number; $createdAt?: string };

/** O evento consome crédito: é ritual (conta como ritual) e aceita inscrição de participantes. */
export function consomeCredito(tipo: TipoParaCredito | null | undefined): boolean {
  return !!tipo && tipo.conta_como_ritual && tipo.aberto_publico && !tipo.fechado_guardioes;
}

/**
 * A inscrição pode receber um crédito agora: está confirmada (vaga garantida, não espera), ainda não tem
 * crédito e a contribuição avulsa não foi informada, confirmada nem isentada.
 * "na_hora" conta: a pessoa disse que contribui no dia, e o crédito evita isso.
 */
export function podeReceberCredito(i: InscricaoParaCredito): boolean {
  if (i.situacao !== "confirmada") return false;
  if (i.credito_id) return false;
  return i.pagamento === "pendente" || i.pagamento === "na_hora";
}

/**
 * Débito: a pessoa participa (inscrição confirmada) de um ritual que consome crédito, o ritual já
 * começou e não há crédito nem contribuição avulsa resolvida. `informado` não conta: aguarda conferência.
 */
export function ehDebito(i: InscricaoParaCredito, consome: boolean, inicioMs: number, agoraMs: number): boolean {
  return consome && inicioMs <= agoraMs && podeReceberCredito(i);
}

export type SaldoCredito = {
  disponiveis: number;
  /** Créditos de pacote ainda não pago (RN008): não entram no saldo. */
  bloqueados: number;
  utilizados: number;
  debitos: number;
  /** disponíveis − débitos; negativo = a pessoa deve participações. */
  saldo: number;
};

/** Saldo de quem é titular dos créditos informados (cancelados não contam). */
export function calcularSaldo(creditos: { situacao: SituacaoCredito }[], debitos: number): SaldoCredito {
  const conta = (s: SituacaoCredito) => creditos.filter((c) => c.situacao === s).length;
  const disponiveis = conta("disponivel");
  return { disponiveis, bloqueados: conta("bloqueado"), utilizados: conta("utilizado"), debitos, saldo: disponiveis - debitos };
}

/** Candidatos ao uso, do mais antigo para o mais novo (fila FIFO). Só créditos disponíveis. */
export function ordemDeUso<T extends CreditoOrdenavel>(creditos: T[]): T[] {
  return creditos
    .filter((c) => c.situacao === "disponivel")
    .sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || a.numero - b.numero || (a.$createdAt ?? "").localeCompare(b.$createdAt ?? ""));
}

/** O mais antigo dos créditos disponíveis, ou null. */
export function escolherCredito<T extends CreditoOrdenavel>(creditos: T[]): T | null {
  return ordemDeUso(creditos)[0] ?? null;
}

/**
 * Cessão: só crédito disponível (RN003: usado não se transfere; RN008: bloqueado também não). O titular
 * cede o próprio crédito, e quem recebeu por cessão não cede de novo. A equipe pode corrigir qualquer
 * crédito disponível. Devolve o motivo do bloqueio, ou null.
 */
export function bloqueioCessao(
  c: { situacao: SituacaoCredito; titular_id: string; cedido_de?: string | null },
  de: string,
  para: string,
): string | null {
  if (c.situacao === "utilizado") return "Crédito já utilizado não pode ser cedido.";
  if (c.situacao === "bloqueado") return "Este crédito ainda aguarda a confirmação do pagamento do pacote.";
  if (c.situacao === "cancelado") return "Este crédito foi cancelado.";
  if (c.titular_id !== de) return "Este crédito não é seu.";
  if (c.cedido_de) return "Um crédito recebido por cessão não pode ser cedido de novo.";
  if (c.titular_id === para) return "Essa pessoa já é a titular deste crédito.";
  return null;
}

const TRANSICOES_PACOTE: Record<SituacaoPacote, SituacaoPacote[]> = {
  pendente: ["informado", "pago", "cancelado"],
  informado: ["pago", "cancelado"],
  pago: ["cancelado"],
  cancelado: [],
};

/** Mudança de situação permitida para o pacote? Devolve o motivo do bloqueio, ou null. */
export function transicaoPacote(de: SituacaoPacote, para: SituacaoPacote): string | null {
  if (de === para) {
    return {
      pendente: "O pacote já está pendente.",
      informado: "O pacote já está informado.",
      pago: "O pagamento deste pacote já foi confirmado.",
      cancelado: "Este pacote já está cancelado.",
    }[para];
  }
  if (!TRANSICOES_PACOTE[de].includes(para)) return de === "cancelado" ? "Este pacote foi cancelado." : "Mudança de situação não permitida para este pacote.";
  return null;
}

/** Cancelar o pacote só é possível se nenhum crédito foi usado nem cedido a outra pessoa. */
export function bloqueioCancelarPacote(creditos: { situacao: SituacaoCredito; comprador_id: string; titular_id: string }[]): string | null {
  if (creditos.some((c) => c.situacao === "utilizado")) return "Este pacote já tem crédito utilizado. Devolva os créditos usados antes de cancelar.";
  if (creditos.some((c) => c.situacao !== "cancelado" && c.titular_id !== c.comprador_id)) return "Este pacote tem crédito cedido a outra pessoa. Desfaça a cessão antes de cancelar.";
  return null;
}

/** Número inteiro de créditos vindo de formulário (1 a QUANTIDADE_MAXIMA). */
export function lerQuantidade(bruto: unknown): { quantidade: number } | { erro: string } {
  const n = typeof bruto === "number" ? bruto : Number(String(bruto ?? "").trim());
  if (!Number.isInteger(n) || n < 1) return { erro: "Informe a quantidade de créditos (número inteiro, a partir de 1)." };
  if (n > QUANTIDADE_MAXIMA) return { erro: `Um pacote pode ter no máximo ${QUANTIDADE_MAXIMA} créditos.` };
  return { quantidade: n };
}

/** Posição do crédito na fila: momento da confirmação do pacote + o número dentro dele. */
export function ordemDoCredito(confirmadoEmMs: number, numero: number): number {
  return confirmadoEmMs + numero / 1000;
}

/** Tempo depois do qual uma trava presa num crédito ainda disponível é considerada abandonada (queda no meio do consumo). */
export const TRAVA_ORFA_MS = 120_000;

/**
 * Trava órfã: o crédito consta como disponível, mas a trava ficou em 0 (alguém travou e caiu antes de gravar o uso)
 * há mais de 2 minutos. Pode ser destravado e reaproveitado.
 */
export function travaOrfa(c: { situacao: SituacaoCredito; trava?: number | null; $updatedAt: string }, agoraMs: number): boolean {
  return c.situacao === "disponivel" && c.trava === 0 && agoraMs - new Date(c.$updatedAt).getTime() > TRAVA_ORFA_MS;
}

/** Rótulo do crédito, ex.: "2/4". */
export function rotuloCredito(numero: number, total: number): string {
  return `${numero}/${total}`;
}

/** Situação que os créditos não usados assumem conforme a situação do pacote. */
export function situacaoDoCredito(p: SituacaoPacote): SituacaoCredito {
  return p === "pago" ? "disponivel" : p === "cancelado" ? "cancelado" : "bloqueado";
}

/** Edição manual da situação: sair de "pago" exige que nenhum crédito tenha sido usado ou cedido. */
export function bloqueioEditarSituacao(
  de: SituacaoPacote, para: SituacaoPacote, creditos: { situacao: SituacaoCredito; comprador_id: string; titular_id: string }[],
): string | null {
  if (de === para) return null;
  if (de === "pago") return bloqueioCancelarPacote(creditos);
  return null;
}

/**
 * Quais créditos sobram para remover ao reduzir o pacote para `nova` unidades: os de maior número que não foram
 * usados nem cedidos. Devolve o erro se não houver o bastante.
 */
export function creditosParaRemover<T extends { numero: number; situacao: SituacaoCredito; comprador_id: string; titular_id: string }>(
  creditos: T[], nova: number,
): { remover: T[] } | { erro: string } {
  const falta = creditos.length - nova;
  if (falta <= 0) return { remover: [] };
  const livres = creditos.filter((c) => c.situacao !== "utilizado" && c.titular_id === c.comprador_id).sort((a, b) => b.numero - a.numero);
  if (livres.length < falta) return { erro: "Há créditos usados ou cedidos demais para reduzir até essa quantidade." };
  return { remover: livres.slice(0, falta) };
}
