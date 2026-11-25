export type Instituto = {
  nome: string;
  nome_curto: string;
  logo_file_id: string | null;
  logo_escura_file_id: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  fonte_titulo: string;
  fonte_texto: string;
  ritual_numero_inicial: number;
  /** Contribuição sugerida aos participantes, igual para todos os rituais. */
  valor_contribuicao: number | null;
  /** Guarnição: horas antes do início em que o guardião ainda pode cancelar (padrão 4). */
  guarnicao_horas_cancelamento?: number | null;
  /** Guarnição: quantas participações cada guardião pode ter por mês (padrão 2; 0 = sem limite). */
  guarnicao_limite_mes?: number | null;
  /** Reunião: por quantas horas depois do início o guardião ainda pode confirmar presença (padrão 1). */
  guarnicao_horas_presenca?: number | null;
  /** Novos guardiões recebem acesso ao concluir o cadastro sem aguardar a coordenação. */
  guarnicao_aprovacao_automatica?: boolean | null;
  /** Guardião escalado gerencia o ritual (financeiro, consumo, central) por um período. Padrão: ligada. */
  gestao_guardiao_ativa?: boolean | null;
  /** Duração do acesso de gestão, em horas, a partir das 00:00 do dia do ritual (padrão 48). */
  gestao_guardiao_horas?: number | null;
  /** Gestão do ritual para os mestres: só o escalado naquele ritual (padrão) ou todos os mestres. */
  gestao_mestre_escopo?: "escalado" | "todos" | null;
  /** Estado (sigla) e cidade do Instituto: já vêm escolhidos nos formulários de cadastro. */
  estado: string | null;
  cidade: string | null;
  /** Informações gerais, mostradas na página de todo evento que conta como ritual. */
  info_rituais: string | null;
  /** Como contribuir (pagamento), mostrado na página de todo ritual. */
  info_contribuicao: string | null;
  /** Fonte dos títulos na página pública (Google Fonts). */
  fonte_publica_titulo: string | null;
  /** Fonte dos textos na página pública. */
  fonte_publica_texto: string | null;
  /** Textos e cores do topo da agenda pública, em JSON. */
  config_hero_agenda?: string | null;
};

export type Endereco = { $id: string; apelido: string; endereco: string; cidade: string; link_maps: string | null; foto_file_id: string | null; padrao: boolean };
export type Telefone = { $id: string; rotulo: string; numero: string; whatsapp: boolean; padrao: boolean };
export type Rede = { $id: string; rede: string; usuario: string; url: string | null };
export type TipoPix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
export type ChavePix = { $id: string; tipo: TipoPix; chave: string; favorecido: string; cidade: string; banco: string | null; padrao: boolean };
export type Funcao = "mestre" | "guardiao";
export type Sexo = "masculino" | "feminino";
/** Usuário do painel que pode ser escalado nos eventos como mestre ou guardião. */
export type Pessoa = { $id: string; nome: string; funcao: Funcao; sexo: Sexo | null; foto: string | null; first?: boolean; mock?: boolean };

/** `icone`: nome de um ícone da biblioteca Lucide (ex.: "flame"); `descricao`: texto que acompanha os eventos desse tipo. */
export type TipoEvento = {
  $id: string; nome: string; slug: string; cor: string; icone: string | null; descricao: string | null;
  conta_como_ritual: boolean; ativo: boolean;
  /** Qualquer pessoa pode se inscrever. */ aberto_publico: boolean;
  /** Só guardiões logados podem se inscrever. */ fechado_guardioes: boolean; ordem: number;
};

/** Tag de evento: o texto dela complementa a descrição de todos os eventos que a usam. */
export type TagEvento = { $id: string; nome: string; cor: string | null; icone: string | null; descricao: string | null; ativo: boolean; ordem: number };

export type Evento = {
  $id: string;
  titulo: string;
  descricao: string | null;
  data: string; // AAAA-MM-DD
  hora_inicio: string; // HH:MM
  endereco_id: string | null;
  endereco_livre: string | null;
  tipo_id: string;
  /** IDs das tags de evento aplicadas. */
  tags?: string[] | null;
  destaque: boolean;
  capa_file_id: string | null;
  /** Cor predominante da capa, ajustada para o fundo do topo da página pública. */
  cor_capa?: string | null;
  mestres: string[] | null; // IDs de usuários
  guardioes: string[] | null; // preenchido pela guarnição (candidaturas confirmadas)
  /** Guardiões escalados para uma reunião; `guardioes` registra quem foi guardião do dia. */
  guardioes_escalados_reuniao?: string[] | null;
  /** Doses da equipe, por pessoa (JSON, ver src/lib/doses.ts). */
  doses_equipe?: string | null;
  vagas_guardioes: number | null; // vagas masculinas (padrão 2)
  vagas_guardias: number | null; // vagas femininas (padrão 2)
  candidaturas_abertas: boolean | null;
  /** Vagas para participantes (público geral, separado da guarnição). */
  vagas_participantes: number | null;
  mostrar_banner: boolean;
  ritual_numero_geral: number | null;
  ritual_ano: number | null;
  ritual_numero_ano: number | null;
  criado_por: string | null;
  atualizado_por: string | null;
  $createdAt: string;
  $updatedAt: string;
};

/** `justificada`: só em reuniões — o guardião (ou a coordenação) justificou a ausência. */
export type SituacaoCandidatura = "confirmada" | "espera" | "cancelada" | "removida" | "justificada";

export type SituacaoInscricao = "confirmada" | "espera" | "cancelada";
/** na_hora: o participante avisou que vai contribuir no dia do ritual. credito: paga com 1 crédito de um pacote. */
/** Como a contribuição confirmada foi paga. Pacote = crédito (pagamento "credito"); pix e dinheiro ficam em `forma_pagamento`. */
export type FormaPagamento = "pix" | "dinheiro" | "pacote";
export type SituacaoPagamento = "pendente" | "informado" | "pago" | "isento" | "na_hora" | "credito";

/** Inscrição de um participante (público geral) num evento. */
export type Inscricao = {
  $id: string;
  evento_id: string;
  usuario_id: string;
  situacao: SituacaoInscricao;
  ordem: number;
  pagamento: SituacaoPagamento;
  valor: number | null;
  informado_em: string | null;
  pago_em: string | null;
  comprovante_file_id: string | null;
  observacao: string | null;
  /** Doses consumidas (JSON, ver src/lib/doses.ts). */
  doses?: string | null;
  /** Contribuição confirmada com pacote (valor em R$ = 0) e o número do pacote. */
  usou_pacote?: boolean | null;
  pacote_numero?: number | null;
  /** Primeira vez da pessoa em um ritual (marcado pela coordenação). */
  primeira_vez?: boolean | null;
  /** Crédito consumido por esta inscrição (quando pagamento = "credito"). */
  credito_id?: string | null;
  /** Forma da contribuição confirmada (pix ou dinheiro). Com crédito, a forma é pacote. */
  forma_pagamento?: FormaPagamento | null;
  alterado_por: string | null;
  $createdAt: string;
  $updatedAt: string;
};

/** Candidatura de um guardião a uma vaga de um evento. A ordem de chegada é o campo `ordem`. */
export type Candidatura = {
  $id: string;
  evento_id: string;
  usuario_id: string;
  sexo: Sexo;
  situacao: SituacaoCandidatura;
  ordem: number;
  /** Texto da justificativa de ausência (reuniões). */
  justificativa?: string | null;
  alterado_por: string | null;
  $createdAt: string;
  $updatedAt: string;
};

/** Um evento no histórico de participações de um guardião. */
export type ItemParticipacao = {
  eventoId: string;
  titulo: string;
  data: string;
  hora: string;
  situacao: "confirmada" | "espera";
  passado: boolean;
};

export type ModeloBanner = { $id: string; nome: string; config: string };

export type DadosInstituto = {
  instituto: Instituto;
  enderecos: Endereco[];
  telefones: Telefone[];
  redes: Rede[];
  pix: ChavePix[];
  tipos: TipoEvento[];
  tags: TagEvento[];
};

// ---------------------------------------------------------------------------------------------------------------
// Pacotes de créditos. O Pacote é a compra (financeiro); o controle real é por Crédito (1 = 1 participação).
// ---------------------------------------------------------------------------------------------------------------

/** Plano do catálogo: o que a pessoa pode comprar (ex.: 4 rituais por R$ 220). */
export type PlanoPacote = {
  $id: string;
  nome: string;
  quantidade: number;
  valor: number;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  $createdAt: string;
  $updatedAt: string;
};

/** pendente: criado pela equipe e ainda não pago · informado: o participante diz que pagou · pago: confirmado. */
export type SituacaoPacote = "pendente" | "informado" | "pago" | "cancelado";

export type Pacote = {
  $id: string;
  usuario_id: string;
  plano_id: string | null;
  nome: string | null;
  quantidade: number;
  valor: number | null;
  situacao: SituacaoPacote;
  origem: "participante" | "equipe";
  comprovante_file_id: string | null;
  informado_em: string | null;
  pago_em: string | null;
  confirmado_por: string | null;
  criado_por: string | null;
  observacao: string | null;
  $createdAt: string;
  $updatedAt: string;
};

/** bloqueado: pacote ainda não pago · disponivel · utilizado: vinculado a um ritual · cancelado: pacote cancelado. */
export type SituacaoCredito = "bloqueado" | "disponivel" | "utilizado" | "cancelado";

export type Credito = {
  $id: string;
  pacote_id: string;
  /** Posição no pacote (1..N), para exibir "2/4". */
  numero: number;
  comprador_id: string;
  /** Quem pode usar o crédito agora (o comprador, ou quem recebeu por cessão). */
  titular_id: string;
  situacao: SituacaoCredito;
  /** Fila: o menor é usado primeiro. */
  ordem: number | null;
  cedido_de: string | null;
  cedido_em: string | null;
  evento_id: string | null;
  inscricao_id: string | null;
  utilizado_em: string | null;
  /** Trava atômica do consumo: 1 = livre, 0 = em uso (ver consumirCredito). */
  trava?: number | null;
  $createdAt: string;
  $updatedAt: string;
};

export type AcaoMovimento =
  | "compra" | "pagamento_informado" | "pacote_confirmado" | "pacote_cancelado"
  | "uso" | "devolucao" | "cessao" | "cessao_desfeita" | "quitacao_debito" | "ajuste";

/** Linha do histórico auditável dos créditos (só acrescenta). */
export type MovimentoCredito = {
  $id: string;
  acao: AcaoMovimento;
  usuario_id: string;
  credito_id: string | null;
  pacote_id: string | null;
  evento_id: string | null;
  inscricao_id: string | null;
  de_usuario: string | null;
  para_usuario: string | null;
  por: string;
  observacao: string | null;
  $createdAt: string;
};
