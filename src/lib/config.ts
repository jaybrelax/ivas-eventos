export const DB_ID = "ivas";
export const BUCKET_ID = "midia";
export const INSTITUTO_ROW_ID = "principal";
export const SESSION_COOKIE = "ivas-session";

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
