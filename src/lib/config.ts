export const DB_ID = "ivas";
export const BUCKET_ID = "midia";
export const INSTITUTO_ROW_ID = "principal";
export const SESSION_COOKIE = "ivas-session";

export const TABLES = {
  instituto: "instituto",
  enderecos: "enderecos",
  telefones: "telefones",
  redes: "redes_sociais",
  pix: "chaves_pix",
  tipos: "tipos_evento",
  eventos: "eventos",
  modelos: "modelos_banner",
} as const;

export type Perfil = "admin" | "coordenador";

export const PERFIS: { id: Perfil; nome: string; descricao: string }[] = [
  { id: "admin", nome: "Admin", descricao: "Tudo, incluindo configurações e usuários" },
  { id: "coordenador", nome: "Coordenador", descricao: "Cria e edita eventos, vê o resumo e gera banners" },
];

/** O que cada perfil pode fazer. */
export const PODE = {
  editarEventos: ["admin", "coordenador"] as Perfil[],
  configurar: ["admin"] as Perfil[],
  gerenciarUsuarios: ["admin"] as Perfil[],
  editarNumeracao: ["admin"] as Perfil[],
};
