/**
 * Regras puras da contribuição (sem banco): o que a coordenação pode marcar a partir de cada situação
 * e como validar o valor. Testadas em scripts/pagamento-regras.test.mjs.
 */
import type { SituacaoInscricao, SituacaoPagamento } from "./types";

/** Teto de sanidade para um valor digitado (evita erro de digitação como 15000 em vez de 150,00). */
export const VALOR_MAXIMO = 10_000;

export type DestinoCoordenacao = "pago" | "isento" | "pendente";

/** A coordenação só mexe na contribuição de inscrição ativa e só para uma situação diferente da atual. */
export function transicaoPermitida(
  atual: { situacao: SituacaoInscricao; pagamento: SituacaoPagamento },
  destino: DestinoCoordenacao,
): string | null {
  if (atual.situacao === "cancelada") return "Esta inscrição foi cancelada: a contribuição não pode mais ser alterada.";
  if (atual.pagamento === destino) {
    return { pago: "Esta contribuição já está confirmada.", isento: "Esta inscrição já está isenta.", pendente: "Esta contribuição já está pendente." }[destino];
  }
  return null;
}

/** O participante só avisa a contribuição de inscrição ativa que ainda não foi confirmada nem isentada. */
export function participantePodeInformar(atual: { situacao: SituacaoInscricao; pagamento: SituacaoPagamento }): string | null {
  if (atual.situacao === "cancelada") return "Esta inscrição foi cancelada.";
  if (atual.pagamento === "pago") return "Esta contribuição já foi confirmada.";
  if (atual.pagamento === "isento") return "Esta inscrição está isenta de contribuição.";
  return null;
}

/**
 * Valor em reais vindo de formulário: vazio vira null; aceita "150", "150.5" e "150,50".
 * Devolve erro para negativo, zero, não numérico ou acima do teto. Arredonda para centavos.
 */
export function lerValor(bruto: unknown): { valor: number | null } | { erro: string } {
  if (bruto === null || bruto === undefined) return { valor: null };
  if (typeof bruto === "number") return validar(bruto);
  const texto = String(bruto).trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!texto) return { valor: null };
  // "1.234,56" → "1234.56"; "150,5" → "150.5"
  const normal = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return { erro: "Informe o valor em reais, por exemplo 150,00." };
  return validar(Number(normal));
}

function validar(n: number): { valor: number } | { erro: string } {
  if (!Number.isFinite(n) || n <= 0) return { erro: "O valor precisa ser maior que zero." };
  if (n > VALOR_MAXIMO) return { erro: `O valor não pode passar de R$ ${VALOR_MAXIMO.toLocaleString("pt-BR")}. Confira os números.` };
  return { valor: Math.round(n * 100) / 100 };
}
