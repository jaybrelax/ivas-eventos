import "server-only";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { listar } from "./data";
import type { Candidatura, Evento, Sexo, TipoEvento } from "./types";

/**
 * Guarnição: guardiões se candidatam às vagas de cada ritual, por ordem de chegada.
 * - Vagas separadas por gênero (padrão 2 guardiões e 2 guardiãs).
 * - Quem chega com as vagas cheias vai para a lista de espera; quando alguém sai,
 *   o primeiro da espera entra sozinho.
 * - O guardião cancela até 4 h antes do início; o coordenador altera a qualquer momento.
 * A lista `guardioes` do evento é mantida igual às candidaturas confirmadas.
 */

export const VAGAS_PADRAO = 2;
export const HORAS_LIMITE_CANCELAMENTO = 4;
const ATIVAS = ["confirmada", "espera"] as const;

export function vagasDe(e: Pick<Evento, "vagas_guardioes" | "vagas_guardias">): Record<Sexo, number> {
  return { masculino: e.vagas_guardioes ?? VAGAS_PADRAO, feminino: e.vagas_guardias ?? VAGAS_PADRAO };
}

/** Início do evento (data e hora são de Brasília, UTC−3). */
export function inicioDe(e: Pick<Evento, "data" | "hora_inicio">) {
  return new Date(`${e.data}T${e.hora_inicio}:00-03:00`);
}

export function prazoCancelamento(e: Pick<Evento, "data" | "hora_inicio">) {
  return new Date(inicioDe(e).getTime() - HORAS_LIMITE_CANCELAMENTO * 3_600_000);
}

/** A guarnição vale para tipos que contam como ritual. */
export function temGuarnicao(tipo: Pick<TipoEvento, "conta_como_ritual"> | undefined) {
  return !!tipo?.conta_como_ritual;
}

const base = { databaseId: DB_ID, tableId: TABLES.candidaturas };

/** Candidaturas ativas (confirmadas e em espera) de um evento, por ordem de chegada. */
export async function candidaturasDoEvento(eventoId: string) {
  return listar<Candidatura>(TABLES.candidaturas, [
    Query.equal("evento_id", eventoId),
    Query.equal("situacao", [...ATIVAS]),
    Query.orderAsc("ordem"),
  ]);
}

/** Candidaturas ativas de vários eventos (para mostrar as vagas na agenda). */
export async function candidaturasDosEventos(ids: string[]) {
  if (!ids.length) return [];
  const todas: Candidatura[] = [];
  // O Appwrite limita o tamanho de listas em Query.equal; busca em lotes.
  for (let i = 0; i < ids.length; i += 100) {
    todas.push(
      ...(await listar<Candidatura>(TABLES.candidaturas, [Query.equal("evento_id", ids.slice(i, i + 100)), Query.equal("situacao", [...ATIVAS])])),
    );
  }
  return todas;
}

/** Candidaturas confirmadas de um usuário (o histórico de participações). */
export async function participacoesDe(usuarioId: string) {
  return listar<Candidatura>(TABLES.candidaturas, [Query.equal("usuario_id", usuarioId), Query.equal("situacao", [...ATIVAS])]);
}

/** Todas as candidaturas ativas, até 1000 (para montar o histórico de cada pessoa na página de usuários). */
export async function todasCandidaturasAtivas() {
  return listar<Candidatura>(TABLES.candidaturas, [Query.equal("situacao", [...ATIVAS])]);
}

/**
 * Aplica as regras de vagas e sincroniza `evento.guardioes`:
 * confirma pela ordem de chegada até o limite de cada gênero; o que passar vai para a espera.
 * Roda depois de qualquer mudança (candidatura, cancelamento, ajuste de limite), o que também
 * resolve duas pessoas disputando a última vaga ao mesmo tempo.
 */
export async function reorganizar(evento: Evento, alteradoPor: string | null) {
  const { tablesDB } = createAdminClient();
  const vagas = vagasDe(evento);
  const ativas = await candidaturasDoEvento(evento.$id);
  const confirmados: string[] = [];
  for (const sexo of ["masculino", "feminino"] as const) {
    const fila = ativas.filter((c) => c.sexo === sexo).sort((a, b) => a.ordem - b.ordem);
    for (const [i, c] of fila.entries()) {
      const deveSer = i < vagas[sexo] ? "confirmada" : "espera";
      if (deveSer === "confirmada") confirmados.push(c.usuario_id);
      if (c.situacao !== deveSer) {
        await tablesDB.updateRow({ ...base, rowId: c.$id, data: { situacao: deveSer, alterado_por: alteradoPor } });
      }
    }
  }
  const atuais = evento.guardioes ?? [];
  if (atuais.length !== confirmados.length || atuais.some((id, i) => id !== confirmados[i])) {
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: evento.$id, data: { guardioes: confirmados } });
  }
}

async function candidaturaDe(eventoId: string, usuarioId: string) {
  const r = await listar<Candidatura>(TABLES.candidaturas, [Query.equal("evento_id", eventoId), Query.equal("usuario_id", usuarioId)]);
  return r[0] ?? null;
}

/** Entra na fila (no fim). A confirmação ou a espera é decidida em `reorganizar`. */
async function entrarNaFila(eventoId: string, usuarioId: string, sexo: Sexo, alteradoPor: string) {
  const { tablesDB } = createAdminClient();
  const existente = await candidaturaDe(eventoId, usuarioId);
  const dados = { sexo, situacao: "espera" as const, ordem: Date.now(), alterado_por: alteradoPor };
  if (existente) {
    if (existente.situacao === "confirmada" || existente.situacao === "espera") return { jaEstava: true };
    await tablesDB.updateRow({ ...base, rowId: existente.$id, data: dados });
  } else {
    await tablesDB.createRow({ ...base, rowId: ID.unique(), data: { ...dados, evento_id: eventoId, usuario_id: usuarioId } });
  }
  return { jaEstava: false };
}

async function sairDaFila(eventoId: string, usuarioId: string, situacao: "cancelada" | "removida", alteradoPor: string) {
  const { tablesDB } = createAdminClient();
  const existente = await candidaturaDe(eventoId, usuarioId);
  if (!existente || (existente.situacao !== "confirmada" && existente.situacao !== "espera")) return false;
  await tablesDB.updateRow({ ...base, rowId: existente.$id, data: { situacao, alterado_por: alteradoPor } });
  return true;
}

export type Resultado = { ok?: string; erro?: string };

/** O próprio guardião se candidata. */
export async function candidatar(
  evento: Evento,
  tipo: TipoEvento | undefined,
  usuario: { id: string; funcaoRitual: string; sexo: Sexo | null },
): Promise<Resultado> {
  if (!temGuarnicao(tipo)) return { erro: "Este evento não tem guarnição." };
  if (usuario.funcaoRitual !== "guardiao") return { erro: "Só quem tem a função Guardião pode se candidatar." };
  if (!usuario.sexo) return { erro: "Informe seu gênero em Meu perfil para se candidatar." };
  if (evento.candidaturas_abertas === false) return { erro: "As candidaturas deste evento estão fechadas." };
  if (inicioDe(evento).getTime() <= Date.now()) return { erro: "Este evento já começou." };
  const r = await entrarNaFila(evento.$id, usuario.id, usuario.sexo, usuario.id);
  if (r.jaEstava) return { erro: "Você já está inscrito neste evento." };
  await reorganizar(evento, usuario.id);
  const minha = await candidaturaDe(evento.$id, usuario.id);
  return minha?.situacao === "confirmada"
    ? { ok: "Candidatura confirmada. Você está na guarnição deste evento." }
    : { ok: "As vagas estão preenchidas: você entrou na lista de espera e será chamado se alguém sair." };
}

/** O próprio guardião cancela (até 4 h antes do início). */
export async function cancelar(evento: Evento, usuarioId: string): Promise<Resultado> {
  if (Date.now() > prazoCancelamento(evento).getTime()) {
    return { erro: `O cancelamento só é possível até ${HORAS_LIMITE_CANCELAMENTO} horas antes do início. Fale com a coordenação.` };
  }
  const saiu = await sairDaFila(evento.$id, usuarioId, "cancelada", usuarioId);
  if (!saiu) return { erro: "Você não está inscrito neste evento." };
  await reorganizar(evento, usuarioId);
  return { ok: "Participação cancelada." };
}

/** Coordenador inclui um guardião (entra na fila como qualquer candidato). */
export async function adicionarGuardiao(evento: Evento, usuario: { id: string; sexo: Sexo | null }, porId: string): Promise<Resultado> {
  if (!usuario.sexo) return { erro: "Essa pessoa não tem gênero informado no cadastro." };
  const r = await entrarNaFila(evento.$id, usuario.id, usuario.sexo, porId);
  if (r.jaEstava) return { erro: "Essa pessoa já está neste evento." };
  await reorganizar(evento, porId);
  const c = await candidaturaDe(evento.$id, usuario.id);
  return { ok: c?.situacao === "confirmada" ? "Guardião incluído." : "Vagas cheias: a pessoa entrou na lista de espera." };
}

/** Coordenador retira um guardião (sem prazo); o primeiro da espera assume a vaga. */
export async function removerGuardiao(evento: Evento, usuarioId: string, porId: string): Promise<Resultado> {
  const saiu = await sairDaFila(evento.$id, usuarioId, "removida", porId);
  if (!saiu) return { erro: "Essa pessoa não está neste evento." };
  await reorganizar(evento, porId);
  return { ok: "Guardião retirado." };
}
