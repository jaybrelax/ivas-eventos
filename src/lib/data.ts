import "server-only";
import { cache } from "react";
import { Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, INSTITUTO_ROW_ID, TABLES } from "./config";
import type {
  ChavePix, DadosInstituto, Endereco, Evento, Instituto, ModeloBanner, Rede, Telefone, TipoEvento,
} from "./types";

export const INSTITUTO_PADRAO: Instituto = {
  nome: "Instituto IVAS",
  nome_curto: "IVAS",
  logo_file_id: null,
  logo_escura_file_id: null,
  cor_primaria: "#35204f",
  cor_secundaria: "#c8a24a",
  fonte_titulo: "Cinzel",
  fonte_texto: "Montserrat",
  ritual_numero_inicial: 500,
  info_rituais: null,
  info_contribuicao: null,
};

/** Linhas do SDK vêm como instâncias de classe; os Client Components só aceitam objetos simples. */
export const simples = <T,>(v: unknown) => JSON.parse(JSON.stringify(v)) as T;

export async function listar<T>(tableId: string, queries: string[] = []): Promise<T[]> {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId,
    queries: [Query.limit(1000), ...queries],
  });
  return simples<T[]>(res.rows);
}

// cache(): layout e página pedem os mesmos dados na mesma requisição; busca uma vez só.
export const getInstituto = cache(async (): Promise<Instituto> => {
  const { tablesDB } = createAdminClient();
  try {
    const row = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.instituto, rowId: INSTITUTO_ROW_ID });
    return { ...INSTITUTO_PADRAO, ...simples<Partial<Instituto>>(row) };
  } catch {
    return INSTITUTO_PADRAO;
  }
});

export async function listarTipos(apenasAtivos = false) {
  const q = [Query.orderAsc("ordem")];
  if (apenasAtivos) q.push(Query.equal("ativo", true));
  return listar<TipoEvento>(TABLES.tipos, q);
}

export const getDadosInstituto = cache(async (): Promise<DadosInstituto> => {
  const [instituto, enderecos, telefones, redes, pix, tipos] = await Promise.all([
    getInstituto(),
    listar<Endereco>(TABLES.enderecos, [Query.orderDesc("padrao"), Query.orderAsc("apelido")]),
    listar<Telefone>(TABLES.telefones, [Query.orderDesc("padrao")]),
    listar<Rede>(TABLES.redes),
    listar<ChavePix>(TABLES.pix, [Query.orderDesc("padrao")]),
    listarTipos(),
  ]);
  return { instituto, enderecos, telefones, redes, pix, tipos };
});

export type FiltroEventos = {
  inicio?: string;
  fim?: string;
  tipos?: string[];
  apenasDestaque?: boolean;
  ids?: string[];
  apenasBanner?: boolean;
};

export async function listarEventos(f: FiltroEventos = {}) {
  const q = [Query.orderAsc("data"), Query.orderAsc("hora_inicio")];
  if (f.inicio) q.push(Query.greaterThanEqual("data", f.inicio));
  if (f.fim) q.push(Query.lessThanEqual("data", f.fim));
  if (f.tipos?.length) q.push(Query.equal("tipo_id", f.tipos));
  if (f.apenasDestaque) q.push(Query.equal("destaque", true));
  if (f.ids?.length) q.push(Query.equal("$id", f.ids));
  if (f.apenasBanner) q.push(Query.equal("mostrar_banner", true));
  return listar<Evento>(TABLES.eventos, q);
}

export async function getEvento(id: string): Promise<Evento | null> {
  const { tablesDB } = createAdminClient();
  try {
    return simples<Evento>(await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: id }));
  } catch {
    return null;
  }
}

export async function listarModelos() {
  return listar<ModeloBanner>(TABLES.modelos, [Query.orderAsc("nome")]);
}
