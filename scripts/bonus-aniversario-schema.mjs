const v = (key, size, o = {}) => ["varchar", key, { size, ...o }];
const i = (key, o = {}) => ["integer", key, o];
const en = (key, elements, def) => ["enum", key, { elements, xdefault: def }];
const dt = (key, o = {}) => ["datetime", key, o];

/** Registro anual separado de pacotes e de qualquer movimento financeiro. */
export const TABELAS_BONUS_ANIVERSARIO = {
  bonus_aniversario: {
    nome: "Bônus de aniversário",
    colunas: [
      v("chave", 80, { required: true }), v("usuario_id", 36, { required: true }), i("ano", { required: true, min: 2020 }),
      en("situacao", ["disponivel", "utilizado", "expirado"], "disponivel"),
      v("evento_id", 36), v("inscricao_id", 36), dt("utilizado_em"),
      // 1 = disponível para reservar; 0 = em processamento ou já utilizado.
      i("trava", { min: 0, max: 1, xdefault: 1 }),
    ],
    indices: [
      ["ux_bonus_aniversario_chave", "unique", ["chave"]],
      ["ix_bonus_aniversario_usuario", "key", ["usuario_id", "ano"]],
      ["ix_bonus_aniversario_inscricao", "key", ["inscricao_id"]],
    ],
  },
};

export const INSCRICOES_COLUNA_BONUS_ANIVERSARIO = v("bonus_aniversario_id", 36);
export const INSCRICOES_PAGAMENTO_BONUS = "aniversario";
export const HISTORICO_ACOES_BONUS = ["bonus_aniversario_usado", "bonus_aniversario_devolvido"];
