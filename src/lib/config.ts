export const DB_ID = "ivas";
export const BUCKET_ID = "midia";
/** Bucket privado dos comprovantes de pagamento: só é lido pela rota /api/comprovante/[id], com checagem de dono/equipe. */
export const COMPROVANTES_BUCKET_ID = "comprovantes";
/** Bucket privado das fotos da Central do evento: só é lido pela rota /api/central/[id], com checagem de acesso. */
export const CENTRAL_BUCKET_ID = "central";
export const INSTITUTO_ROW_ID = "principal";
/** Linha à parte da tabela instituto com a chave da OpenAI e o prompt: não é lida junto dos dados públicos. */
export const IA_ROW_ID = "ia";
export const SESSION_COOKIE = "ivas-session";

/** Cookie de sessão compartilhado entre os apps (Eventos e Guarnição) em produção; local fica sem domínio. */
export const DOMINIO_COOKIE: { domain?: string } = process.env.NODE_ENV === "production" ? { domain: process.env.COOKIE_DOMAIN || ".virtudes.net.br" } : {};

export const TABLES = {
  instituto: "instituto",
  enderecos: "enderecos",
  telefones: "telefones",
  redes: "redes_sociais",
  pix: "chaves_pix",
  tipos: "tipos_evento",
  tags: "tags_evento",
  eventos: "eventos",
  modelos: "modelos_banner",
  candidaturas: "candidaturas",
  inscricoes: "inscricoes",
  /** Quem mudou o quê numa inscrição (pagamento, inclusão, cancelamento): só cresce, nunca é editada. */
  historicoInscricoes: "historico_inscricoes",
  push: "push_inscricoes",
  sinais: "sinais",
  /** Central de informações do evento: ocorrências, lembretes e tarefas da equipe. */
  central: "central_posts",
  /** Pacotes de créditos: catálogo, compras, créditos (1 por participação, com trava atômica) e histórico. */
  planosPacote: "planos_pacote",
  pacotes: "pacotes",
  creditos: "creditos",
  movimentosCredito: "movimentos_credito",
} as const;

export type Perfil = "admin" | "coordenador" | "normal";
/** Label de quem só participa dos rituais (cadastro público, sem acesso ao painel). */
export const LABEL_PARTICIPANTE = "participante";

export const PERFIS: { id: Perfil; nome: string; descricao: string }[] = [
  { id: "admin", nome: "Admin", descricao: "Tudo, incluindo configurações e usuários" },
  { id: "coordenador", nome: "Coordenador", descricao: "Cria e edita eventos, vê o resumo e gera banners" },
  { id: "normal", nome: "Normal", descricao: "Acesso à agenda pública, sem acesso ao painel" },
];

/** O que cada perfil pode fazer. */
export const PODE = {
  editarEventos: ["admin", "coordenador"] as Perfil[],
  configurar: ["admin"] as Perfil[],
  gerenciarUsuarios: ["admin"] as Perfil[],
  editarNumeracao: ["admin"] as Perfil[],
};
