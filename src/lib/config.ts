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

export type Perfil = "admin" | "mestre" | "guardiao";

export const PERFIS: { id: Perfil; nome: string; descricao: string }[] = [
  { id: "admin", nome: "Admin", descricao: "Tudo, incluindo configurações e usuários" },
  { id: "mestre", nome: "Mestre", descricao: "Cria e edita eventos, gera banners" },
  { id: "guardiao", nome: "Guardião", descricao: "Vê a agenda e o resumo, gera banners" },
];

/** O que cada perfil pode fazer. */
export const PODE = {
  editarEventos: ["admin", "mestre"] as Perfil[],
  configurar: ["admin"] as Perfil[],
  gerenciarUsuarios: ["admin"] as Perfil[],
  editarNumeracao: ["admin"] as Perfil[],
};
