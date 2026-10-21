import "server-only";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { after } from "next/server";
import { getInstituto, listar, listarEventos } from "./data";
import { enviarPush } from "./push";
import { mapaUsuarios } from "./usuarios";
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

export function prazoCancelamento(e: Pick<Evento, "data" | "hora_inicio">, horas = HORAS_LIMITE_CANCELAMENTO) {
  return new Date(inicioDe(e).getTime() - horas * 3_600_000);
}

/** Regras da guarnição definidas pela coordenação (Configurações do app da Guarnição). */
export async function regrasGuarnicao() {
  const i = await getInstituto();
  const horas = i.guarnicao_horas_cancelamento ?? HORAS_LIMITE_CANCELAMENTO;
  const limiteMes = i.guarnicao_limite_mes ?? 2;
  return { horas: Math.max(0, horas), limiteMes: Math.max(0, limiteMes) };
}

const MESES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Participações ativas (confirmadas ou na espera) da pessoa por mês `AAAA-MM` — para avisar do limite antes da candidatura. */
export async function participacoesPorMes(usuarioId: string): Promise<Map<string, number>> {
  const minhas = await participacoesDe(usuarioId);
  const mapa = new Map<string, number>();
  if (!minhas.length) return mapa;
  const eventos = await listarEventos({ ids: [...new Set(minhas.map((c) => c.evento_id))] });
  const mesDe = new Map(eventos.map((e) => [e.$id, e.data.slice(0, 7)]));
  for (const c of minhas) {
    const m = mesDe.get(c.evento_id);
    if (m) mapa.set(m, (mapa.get(m) ?? 0) + 1);
  }
  return mapa;
}

/** Quantas participações ativas (confirmadas ou na espera) a pessoa já tem em rituais do mês `AAAA-MM`. */
async function participacoesNoMes(usuarioId: string, mes: string, exceto: string) {
  const minhas = (await participacoesDe(usuarioId)).filter((c) => c.evento_id !== exceto);
  if (!minhas.length) return 0;
  const eventos = await listarEventos({ ids: [...new Set(minhas.map((c) => c.evento_id))] });
  const doMes = new Set(eventos.filter((e) => e.data.startsWith(mes)).map((e) => e.$id));
  return minhas.filter((c) => doMes.has(c.evento_id)).length;
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
export async function reorganizar(evento: Evento, alteradoPor: string | null, avisarVaga = false) {
  const { tablesDB } = createAdminClient();
  const vagas = vagasDe(evento);
  const ativas = await candidaturasDoEvento(evento.$id);
  const confirmados: string[] = [];
  const promovidos: string[] = [];
  const livres: Record<Sexo, number> = { masculino: 0, feminino: 0 };
  for (const sexo of ["masculino", "feminino"] as const) {
    const fila = ativas.filter((c) => c.sexo === sexo).sort((a, b) => a.ordem - b.ordem);
    for (const [i, c] of fila.entries()) {
      const deveSer = i < vagas[sexo] ? "confirmada" : "espera";
      if (deveSer === "confirmada") confirmados.push(c.usuario_id);
      if (c.situacao !== deveSer) {
        await tablesDB.updateRow({ ...base, rowId: c.$id, data: { situacao: deveSer, alterado_por: alteradoPor } });
        // Saiu da espera porque alguém liberou a vaga: avisa a pessoa
        if (deveSer === "confirmada" && c.usuario_id !== alteradoPor) promovidos.push(c.usuario_id);
      }
    }
    livres[sexo] = Math.max(0, vagas[sexo] - fila.length);
  }
  const atuais = evento.guardioes ?? [];
  if (atuais.length !== confirmados.length || atuais.some((id, i) => id !== confirmados[i])) {
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: evento.$id, data: { guardioes: confirmados } });
  }
  avisarMudancas(evento, promovidos, avisarVaga ? livres : null, new Set(ativas.map((c) => c.usuario_id)));
}

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function quandoCurto(e: Pick<Evento, "data" | "hora_inicio">) {
  const [a, m, d] = e.data.split("-").map(Number);
  return `${DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} às ${e.hora_inicio}`;
}

/** Notificações (depois da resposta, sem atrasar a tela): quem saiu da espera e, se abriu vaga, os guardiões do gênero. */
function avisarMudancas(evento: Evento, promovidos: string[], livres: Record<Sexo, number> | null, jaNoEvento: Set<string>) {
  const aberto = evento.candidaturas_abertas !== false && inicioDe(evento).getTime() > Date.now();
  if (!aberto || (!promovidos.length && !(livres && (livres.masculino || livres.feminino)))) return;
  const nome = evento.ritual_numero_geral ? `Ritual Nº ${evento.ritual_numero_geral}` : evento.titulo;
  const url = `/guarnicao/ritual/${evento.$id}`;
  after(async () => {
    if (promovidos.length) {
      await enviarPush(promovidos, { titulo: "Você entrou na guarnição!", corpo: `Abriu vaga no ${nome} (${quandoCurto(evento)}) e você saiu da lista de espera.`, url, tag: `promovido-${evento.$id}` });
    }
    if (livres && (livres.masculino || livres.feminino)) {
      const usuarios = await mapaUsuarios();
      for (const sexo of ["masculino", "feminino"] as const) {
        if (!livres[sexo]) continue;
        const alvo = [...usuarios.values()].filter((u) => u.ativo && u.funcao === "guardiao" && u.sexo === sexo && !jaNoEvento.has(u.id)).map((u) => u.id);
        await enviarPush(alvo, {
          titulo: `Abriu vaga para ${sexo === "masculino" ? "guardião" : "guardiã"}`,
          corpo: `${nome} · ${quandoCurto(evento)}. Toque para se candidatar.`,
          url,
          tag: `vaga-${evento.$id}-${sexo}`,
        });
      }
    }
  });
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
  // Limite de participações por mês (a coordenação pode escalar além do limite, pelo app ou pelo painel)
  const { limiteMes } = await regrasGuarnicao();
  if (limiteMes > 0) {
    const mes = evento.data.slice(0, 7);
    const ja = await participacoesNoMes(usuario.id, mes, evento.$id);
    if (ja >= limiteMes) {
      const nome = MESES_NOME[Number(mes.slice(5)) - 1];
      return { erro: `Você já tem ${ja} ${ja === 1 ? "participação" : "participações"} em ${nome}, o limite do mês. Fale com a coordenação se precisar.` };
    }
  }
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
  const { horas } = await regrasGuarnicao();
  if (Date.now() > prazoCancelamento(evento, horas).getTime()) {
    return { erro: `O cancelamento só é possível até ${horas} ${horas === 1 ? "hora" : "horas"} antes do início. Fale com a coordenação.` };
  }
  const saiu = await sairDaFila(evento.$id, usuarioId, "cancelada", usuarioId);
  if (!saiu) return { erro: "Você não está inscrito neste evento." };
  await reorganizar(evento, usuarioId, true);
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
  await reorganizar(evento, porId, true);
  return { ok: "Guardião retirado." };
}

/** Coordenador ajusta as vagas e/ou abre e fecha as candidaturas; a fila se reorganiza na hora. */
export async function ajustarGuarnicao(
  evento: Evento,
  mudar: { masculino?: number; feminino?: number; abertas?: boolean },
  porId: string,
): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  // Valores vindos do navegador: só números de 0 a 50 e verdadeiro/falso
  const numero = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(50, Math.round(n))) : null);
  const dados: Record<string, unknown> = {};
  if (mudar.masculino !== undefined) {
    const n = numero(mudar.masculino);
    if (n === null) return { erro: "Quantidade de vagas inválida." };
    dados.vagas_guardioes = n;
  }
  if (mudar.feminino !== undefined) {
    const n = numero(mudar.feminino);
    if (n === null) return { erro: "Quantidade de vagas inválida." };
    dados.vagas_guardias = n;
  }
  if (mudar.abertas !== undefined) dados.candidaturas_abertas = mudar.abertas === true;
  if (!Object.keys(dados).length) return { ok: "Nada a mudar." };
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: evento.$id, data: dados });
  // Só avisa de vaga nova quando a coordenação aumenta as vagas ou reabre as candidaturas
  const aumentou =
    (mudar.masculino ?? 0) > (evento.vagas_guardioes ?? VAGAS_PADRAO) || (mudar.feminino ?? 0) > (evento.vagas_guardias ?? VAGAS_PADRAO) || (mudar.abertas === true && evento.candidaturas_abertas === false);
  await reorganizar({ ...evento, ...dados } as Evento, porId, aumentou);
  return { ok: mudar.abertas !== undefined ? (mudar.abertas ? "Candidaturas abertas." : "Candidaturas fechadas.") : "Vagas atualizadas." };
}
