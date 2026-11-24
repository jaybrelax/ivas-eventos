export const DB_ID = "ivas";
export const BUCKET_ID = "midia";
export const INSTITUTO_ROW_ID = "principal";
export const IA_ROW_ID = "ia";
export const SESSION_COOKIE = "ivas-session";

/** Cookie de sessão compartilhado entre os apps (Eventos e Guarnição) em produção; local fica sem domínio. */
export const DOMINIO_COOKIE: { domain?: string } = process.env.NODE_ENV === "production" ? { domain: process.env.COOKIE_DOMAIN || ".virtudes.net.br" } : {};

export const TABLES = {
  instituto: "instituto",
  enderecos: "enderecos",
  tipos: "tipos_evento",
  eventos: "eventos",
  candidaturas: "candidaturas",
  push: "push_inscricoes",
  sinais: "sinais",
} as const;

export type Perfil = "admin" | "coordenador" | "normal";
/** Label de quem só participa dos rituais (cadastro público, sem acesso ao painel). */
export const LABEL_PARTICIPANTE = "participante";

export const PERFIS: { id: Perfil; nome: string }[] = [
  { id: "admin", nome: "Admin" },
  { id: "coordenador", nome: "Coordenador" },
  { id: "normal", nome: "Normal" },
];
