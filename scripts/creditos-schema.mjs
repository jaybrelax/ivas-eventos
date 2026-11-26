// Estrutura do banco dos pacotes de créditos. Usada por setup-appwrite.mjs e por migrar-creditos.mjs,
// para a definição existir num lugar só. Mesmo formato de colunas do setup: [tipo, chave, opções].

const v = (key, size, o = {}) => ["varchar", key, { size, ...o }];
const t = (key, o = {}) => ["text", key, o];
const b = (key, def = false) => ["boolean", key, { xdefault: def }];
const i = (key, o = {}) => ["integer", key, o];
const en = (key, elements, def) => ["enum", key, { elements, xdefault: def }];
const f = (key, o = {}) => ["float", key, o];
const dt = (key, o = {}) => ["datetime", key, o];

export const ACOES_MOVIMENTO = [
  "compra", "pagamento_informado", "pacote_confirmado", "pacote_cancelado",
  "uso", "devolucao", "cessao", "cessao_desfeita", "quitacao_debito", "ajuste",
];

export const TABELAS_CREDITOS = {
  // Travas de cessão por doador: somente servidor. Linhas existem apenas durante a operação.
  travas_cessao: { nome: "Travas de cessão", colunas: [["boolean", "ativa", { required: true }]] },
  // Catálogo: o que o participante pode comprar (editado em Configurações)
  planos_pacote: {
    nome: "Planos de pacote",
    colunas: [
      v("nome", 80, { required: true }), i("quantidade", { required: true, min: 1, max: 100 }), f("valor", { required: true, min: 0 }),
      t("descricao"), b("ativo", true), i("ordem", { min: 0, xdefault: 0 }),
    ],
  },
  // A compra (parte financeira). Cada pacote gera uma linha por crédito em `creditos`.
  pacotes: {
    nome: "Pacotes de créditos",
    colunas: [
      v("usuario_id", 36, { required: true }), v("plano_id", 36), v("nome", 80),
      i("quantidade", { required: true, min: 1, max: 100 }), f("valor", { min: 0 }),
      en("situacao", ["pendente", "informado", "pago", "cancelado"], "pendente"),
      en("origem", ["participante", "equipe"], "participante"),
      v("comprovante_file_id", 36), dt("informado_em"), dt("pago_em"),
      v("confirmado_por", 36), v("criado_por", 36), t("observacao"),
    ],
    indices: [
      ["ix_pacote_usuario", "key", ["usuario_id"]],
      ["ix_pacote_situacao", "key", ["situacao"]],
      ["ix_pacote_comprovante", "key", ["comprovante_file_id"]],
    ],
  },
  // Uma linha por unidade: 1 crédito = 1 participação em ritual
  creditos: {
    nome: "Créditos",
    colunas: [
      v("pacote_id", 36, { required: true }), i("numero", { required: true, min: 1 }),
      v("comprador_id", 36, { required: true }), v("titular_id", 36, { required: true }),
      en("situacao", ["bloqueado", "disponivel", "utilizado", "cancelado"], "bloqueado"),
      // Fila do mais antigo para o mais novo (momento da confirmação do pacote + número)
      f("ordem"),
      v("cedido_de", 36), dt("cedido_em"),
      v("evento_id", 36), v("inscricao_id", 36), dt("utilizado_em"),
      // Trava atômica do consumo: 1 = livre, 0 = em uso. Quem consome faz decrementRowColumn(min 0):
      // o Appwrite recusa a segunda tentativa, então o mesmo crédito nunca é usado duas vezes.
      i("trava", { min: 0, max: 1, xdefault: 1 }),
    ],
    indices: [
      ["ix_cred_titular", "key", ["titular_id", "situacao"]],
      ["ix_cred_pacote", "key", ["pacote_id"]],
      ["ix_cred_evento", "key", ["evento_id"]],
      ["ix_cred_inscricao", "key", ["inscricao_id"]],
    ],
  },
  // Histórico auditável: só acrescenta
  movimentos_credito: {
    nome: "Movimentos de crédito",
    colunas: [
      en("acao", ACOES_MOVIMENTO, "compra"),
      v("usuario_id", 36, { required: true }), v("credito_id", 36), v("pacote_id", 36), v("evento_id", 36), v("inscricao_id", 36),
      v("de_usuario", 36), v("para_usuario", 36), v("por", 36, { required: true }), v("observacao", 500),
    ],
    indices: [
      ["ix_mov_usuario", "key", ["usuario_id"]],
      ["ix_mov_para", "key", ["para_usuario"]],
      ["ix_mov_evento", "key", ["evento_id"]],
      ["ix_mov_pacote", "key", ["pacote_id"]],
    ],
  },
};

/** O que muda na tabela `inscricoes`: coluna do crédito usado e o novo valor de pagamento. */
export const INSCRICOES_PAGAMENTO = ["pendente", "informado", "pago", "isento", "na_hora", "credito"];
export const INSCRICOES_COLUNA_CREDITO = v("credito_id", 36);
/** Forma da contribuição confirmada, separada da situação (pendente/pago/isento): pix, dinheiro ou pacote. */
export const INSCRICOES_COLUNA_FORMA = en("forma_pagamento", ["pix", "dinheiro", "pacote"], undefined);
/** Novos valores de `acao` no histórico das inscrições. */
export const HISTORICO_ACOES = [
  "inscricao", "inclusao", "cancelamento", "remocao",
  "pagamento_informado", "pagamento_na_hora", "pagamento_desfeito",
  "pagamento_confirmado", "pagamento_isento", "pagamento_reaberto",
  "credito_usado", "credito_devolvido",
];
