import type { AcaoMovimento, SituacaoCredito, SituacaoPacote } from "./types";

/** Textos e cores dos pacotes e créditos, para a conta do participante e para o painel da equipe. */

export const ROTULO_ACAO: Record<AcaoMovimento, string> = {
  compra: "Pacote comprado",
  pagamento_informado: "Pagamento informado",
  pacote_confirmado: "Pagamento confirmado",
  pacote_cancelado: "Pacote cancelado",
  uso: "Crédito usado",
  devolucao: "Crédito devolvido",
  cessao: "Crédito cedido",
  cessao_desfeita: "Cessão desfeita",
  quitacao_debito: "Débito quitado",
  ajuste: "Ajuste",
};

export const ROTULO_CREDITO: Record<SituacaoCredito, { rotulo: string; cor: string }> = {
  disponivel: { rotulo: "Disponível", cor: "bg-emerald-50 text-emerald-700" },
  bloqueado: { rotulo: "Aguardando pagamento", cor: "bg-amber-50 text-amber-700" },
  utilizado: { rotulo: "Utilizado", cor: "bg-stone-100 text-stone-600" },
  cancelado: { rotulo: "Cancelado", cor: "bg-stone-100 text-stone-400" },
};

export const ROTULO_PACOTE: Record<SituacaoPacote, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Aguardando pagamento", cor: "bg-yellow-50 text-yellow-800" },
  informado: { rotulo: "Para conferir", cor: "bg-amber-50 text-amber-800" },
  pago: { rotulo: "Ativo", cor: "bg-emerald-50 text-emerald-700" },
  cancelado: { rotulo: "Cancelado", cor: "bg-stone-100 text-stone-500" },
};
