import "server-only";
import { AppwriteException, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { getEvento } from "./data";
import { hoje } from "./format";
import { mapaUsuarios } from "./usuarios";
import type { Inscricao } from "./types";
import { ASPECTOS, type Notas } from "./depoimentos-regras";

export type Avaliacao = { $id: string; evento_id: string; inscricao_id: string; autor_id: string; $createdAt: string } & Notas;
export type Depoimento = { $id: string; evento_id: string; inscricao_id: string; autor_id: string; texto: string; $createdAt: string; autor?: string };
const base = { databaseId: DB_ID };

export async function inscricaoDoDono(inscricaoId: string, usuarioId: string) {
  const { tablesDB } = createAdminClient();
  const i = await tablesDB.getRow({ ...base, tableId: TABLES.inscricoes, rowId: inscricaoId }).catch(() => null) as Inscricao | null;
  return i?.usuario_id === usuarioId ? i : null;
}

export async function avaliacaoDaInscricao(inscricaoId: string): Promise<Avaliacao | null> {
  const { tablesDB } = createAdminClient();
  try { return await tablesDB.getRow({ ...base, tableId: TABLES.avaliacoesRitual, rowId: inscricaoId }) as unknown as Avaliacao; }
  catch (e) { if (e instanceof AppwriteException && e.code === 404) return null; throw e; }
}

export async function depoimentosDaInscricao(inscricaoId: string): Promise<Depoimento[]> {
  const { tablesDB } = createAdminClient();
  const r = await tablesDB.listRows({ ...base, tableId: TABLES.depoimentosRitual, queries: [Query.equal("inscricao_id", inscricaoId), Query.orderDesc("$createdAt"), Query.limit(100)] });
  return r.rows as unknown as Depoimento[];
}

export async function resumoDepoimentos(eventoId: string) {
  const { tablesDB } = createAdminClient();
  const [ar, dr, usuarios] = await Promise.all([
    tablesDB.listRows({ ...base, tableId: TABLES.avaliacoesRitual, queries: [Query.equal("evento_id", eventoId), Query.limit(1000)] }),
    tablesDB.listRows({ ...base, tableId: TABLES.depoimentosRitual, queries: [Query.equal("evento_id", eventoId), Query.orderDesc("$createdAt"), Query.limit(100)] }),
    mapaUsuarios(),
  ]);
  const avaliacoes = ar.rows as unknown as Avaliacao[];
  const medias = Object.fromEntries(ASPECTOS.map(([chave]) => [chave, avaliacoes.length ? Math.round(avaliacoes.reduce((s, a) => s + a[chave], 0) / avaliacoes.length * 10) / 10 : null])) as Record<keyof Notas, number | null>;
  const depoimentos = (dr.rows as unknown as Depoimento[]).map((d) => ({ ...d, autor: usuarios.get(d.autor_id)?.nome ?? "Participante", autorFoto: usuarios.get(d.autor_id)?.foto ?? null }));
  return { quantidade: avaliacoes.length, medias, depoimentos, temMais: dr.total > depoimentos.length };
}

export async function podeDepor(inscricao: Inscricao) {
  const evento = await getEvento(inscricao.evento_id);
  return !!evento && inscricao.situacao === "confirmada" && evento.data < hoje();
}
