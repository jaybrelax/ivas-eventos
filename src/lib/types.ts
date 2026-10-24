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
};

export type Endereco = { $id: string; apelido: string; endereco: string; cidade: string; link_maps: string | null; foto_file_id: string | null; padrao: boolean };
export type Telefone = { $id: string; rotulo: string; numero: string; whatsapp: boolean; padrao: boolean };
export type Rede = { $id: string; rede: string; usuario: string; url: string | null };
export type TipoPix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
export type ChavePix = { $id: string; tipo: TipoPix; chave: string; favorecido: string; cidade: string; banco: string | null; padrao: boolean };
export type Funcao = "mestre" | "guardiao";
export type Sexo = "masculino" | "feminino";
/** Usuário do painel que pode ser escalado nos eventos como mestre ou guardião. */
export type Pessoa = { $id: string; nome: string; funcao: Funcao; sexo: Sexo | null; foto: string | null };

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

export type SituacaoCandidatura = "confirmada" | "espera" | "cancelada" | "removida";

export type SituacaoInscricao = "confirmada" | "espera" | "cancelada";
/** na_hora: o participante avisou que vai contribuir no dia do ritual. */
export type SituacaoPagamento = "pendente" | "informado" | "pago" | "isento" | "na_hora";

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
