import "server-only";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { after } from "next/server";
import { getDadosInstituto, getInstituto, listar, listarEventos } from "./data";
import { enviarPush } from "./push";
import { concordar } from "./genero";
import { sinalizarMudanca } from "./tempo-real";
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
  return { horas: Math.max(0, horas), limiteMes: Math.max(0, limiteMes), aprovacaoAutomatica: i.guarnicao_aprovacao_automatica !== false };
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

/** Reunião: o tipo de evento fechado para guardiões. Todos os guardiões ingressam (presença), sem limite de vagas. */
export function ehReuniao(tipo: Pick<TipoEvento, "fechado_guardioes"> | undefined) {
  return !!tipo?.fechado_guardioes;
}

/** A guarnição (vagas por gênero) vale para tipos que contam como ritual e não são reunião. */
export function temGuarnicao(tipo: Pick<TipoEvento, "conta_como_ritual" | "fechado_guardioes"> | undefined) {
  return !!tipo?.conta_como_ritual && !tipo.fechado_guardioes;
}

/** O app da Guarnição mostra rituais (com vagas) e reuniões (com presença). */
export function temAppGuarnicao(tipo: Pick<TipoEvento, "conta_como_ritual" | "fechado_guardioes"> | undefined) {
  return temGuarnicao(tipo) || ehReuniao(tipo);
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

/** Candidaturas ativas de vários eventos (para mostrar as vagas na agenda). Com `justificadas`, inclui as ausências justificadas das reuniões. */
export async function candidaturasDosEventos(ids: string[], justificadas = false) {
  if (!ids.length) return [];
  const todas: Candidatura[] = [];
  // O Appwrite limita o tamanho de listas em Query.equal; busca em lotes.
  for (let i = 0; i < ids.length; i += 100) {
    todas.push(
      ...(await listar<Candidatura>(TABLES.candidaturas, [Query.equal("evento_id", ids.slice(i, i + 100)), Query.equal("situacao", justificadas ? [...ATIVAS, "justificada"] : [...ATIVAS])])),
    );
  }
  return todas;
}

/** Tira as presenças em reuniões: o histórico, o limite mensal e as estatísticas valem só para rituais. */
async function semReunioes(cands: Candidatura[]) {
  if (!cands.length) return cands;
  const { tipos } = await getDadosInstituto();
  const fechados = new Set(tipos.filter((tp) => ehReuniao(tp)).map((tp) => tp.$id));
  if (!fechados.size) return cands;
  const ids = [...new Set(cands.map((c) => c.evento_id))];
  const reunioes = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    for (const e of await listarEventos({ ids: ids.slice(i, i + 100) })) if (fechados.has(e.tipo_id)) reunioes.add(e.$id);
  }
  return cands.filter((c) => !reunioes.has(c.evento_id));
}

/** Candidaturas confirmadas de um usuário em rituais (o histórico de participações). */
export async function participacoesDe(usuarioId: string) {
  return semReunioes(await listar<Candidatura>(TABLES.candidaturas, [Query.equal("usuario_id", usuarioId), Query.equal("situacao", [...ATIVAS])]));
}

/** Todas as candidaturas ativas em rituais, até 1000 (para montar o histórico de cada pessoa na página de usuários). */
export async function todasCandidaturasAtivas() {
  return semReunioes(await listar<Candidatura>(TABLES.candidaturas, [Query.equal("situacao", [...ATIVAS])]));
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
  await sinalizarMudanca(evento.$id); // quem está com o app aberto vê a mudança na hora (antes de renderizar a resposta)
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
  if (r.jaEstava) return { erro: `Você já está ${concordar(usuario.sexo, "inscrito", "inscrita")} neste evento.` };
  await reorganizar(evento, usuario.id);
  const minha = await candidaturaDe(evento.$id, usuario.id);
  return minha?.situacao === "confirmada"
    ? { ok: "Candidatura confirmada. Você está na guarnição deste evento." }
    : { ok: `As vagas estão preenchidas: você entrou na lista de espera e será ${concordar(usuario.sexo, "chamado", "chamada")} se alguém sair.` };
}

/** O próprio guardião cancela (até 4 h antes do início). */
export async function cancelar(evento: Evento, usuarioId: string): Promise<Resultado> {
  const { horas } = await regrasGuarnicao();
  if (Date.now() > prazoCancelamento(evento, horas).getTime()) {
    return { erro: `O cancelamento só é possível até ${horas} ${horas === 1 ? "hora" : "horas"} antes do início. Fale com a coordenação.` };
  }
  const saiu = await sairDaFila(evento.$id, usuarioId, "cancelada", usuarioId);
  if (!saiu) return { erro: "Você não tem candidatura neste evento." };
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

/** Retira candidaturas futuras afetadas por uma suspensão ou pela perda da função (rituais e reuniões). Preserva o histórico. */
export async function retirarParticipacoesFuturas(usuarioId: string, porId: string, antesDe?: string) {
  const candidaturas = await participacoesDe(usuarioId);
  // Presenças e justificativas em reuniões ficam de fora de participacoesDe: busca à parte
  const emReunioes = (await listar<Candidatura>(TABLES.candidaturas, [Query.equal("usuario_id", usuarioId), Query.equal("situacao", ["confirmada", "justificada"])]))
    .filter((c) => !candidaturas.some((x) => x.$id === c.$id));
  if (!candidaturas.length && !emReunioes.length) return;
  const ids = [...new Set([...candidaturas, ...emReunioes].map((c) => c.evento_id))];
  const eventos: Evento[] = [];
  for (let i = 0; i < ids.length; i += 100) eventos.push(...await listarEventos({ ids: ids.slice(i, i + 100) }));
  const reunioesIds = new Set(emReunioes.map((c) => c.evento_id));
  const agora = Date.now();
  const limite = antesDe ? Date.parse(antesDe) : Infinity;
  let falhas = 0;
  for (const evento of eventos) {
    const inicio = inicioDe(evento).getTime();
    if (inicio > agora && inicio < limite) {
      try {
        if (reunioesIds.has(evento.$id)) await retirarDaReuniao(evento, usuarioId, porId);
        else await removerGuardiao(evento, usuarioId, porId);
      } catch {
        falhas++;
      }
    }
  }
  if (falhas) throw new Error(`Não foi possível retirar o guardião de ${falhas} ritual(is).`);
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

// ───────── Reuniões: presença dos guardiões ─────────
// Todos os guardiões ingressam (candidatura confirmada, sem vagas, espera nem limite mensal) ou justificam a ausência.

export const JUSTIFICATIVA_MIN = 30;
export const JUSTIFICATIVA_MAX = 200;

/**
 * Presenças e justificativas de uma reunião. Os mestres escalados no evento já contam como confirmados,
 * a não ser que tenham algum registro próprio (retirado pela coordenação, cancelou ou justificou).
 */
export async function presencasDaReuniao(evento: Pick<Evento, "$id" | "mestres">) {
  return comMestresAutomaticos(evento, await listar<Candidatura>(TABLES.candidaturas, [Query.equal("evento_id", evento.$id), Query.orderAsc("ordem")]));
}

/** Todos os registros (de qualquer situação) das reuniões, para saber quais mestres já têm resposta própria. */
export async function registrosDasReunioes(ids: string[]) {
  const todas: Candidatura[] = [];
  for (let i = 0; i < ids.length; i += 100) todas.push(...(await listar<Candidatura>(TABLES.candidaturas, [Query.equal("evento_id", ids.slice(i, i + 100))])));
  return todas;
}

/** Dos registros de uma reunião, fica o que vale (confirmados e justificados) mais os mestres escalados que ainda não responderam. */
export function comMestresAutomaticos(evento: Pick<Evento, "$id" | "mestres">, todas: Candidatura[]) {
  const comRegistro = new Set(todas.map((c) => c.usuario_id));
  const automaticas = (evento.mestres ?? [])
    .filter((id) => !comRegistro.has(id))
    .map((id) => ({ $id: `auto-${id}`, evento_id: evento.$id, usuario_id: id, sexo: "masculino", situacao: "confirmada", ordem: 0, justificativa: null, alterado_por: null, $createdAt: "", $updatedAt: "" }) as Candidatura);
  return [...automaticas, ...todas.filter((c) => c.situacao === "confirmada" || c.situacao === "justificada")];
}

/** Tira a presença (cancelou ou foi retirado). O mestre escalado, que ainda não tem registro, ganha um para deixar de contar como confirmado. */
async function sairDaReuniao(evento: Pick<Evento, "$id" | "mestres">, usuarioId: string, situacao: "cancelada" | "removida", alteradoPor: string) {
  const { tablesDB } = createAdminClient();
  const existente = await candidaturaDe(evento.$id, usuarioId);
  if (existente) {
    if (existente.situacao !== "confirmada") return false;
    await tablesDB.updateRow({ ...base, rowId: existente.$id, data: { situacao, alterado_por: alteradoPor } });
    return true;
  }
  if (!(evento.mestres ?? []).includes(usuarioId)) return false;
  const sexo = (await mapaUsuarios()).get(usuarioId)?.sexo ?? "masculino";
  await tablesDB.createRow({ ...base, rowId: ID.unique(), data: { evento_id: evento.$id, usuario_id: usuarioId, sexo, situacao, ordem: Date.now(), alterado_por: alteradoPor } });
  return true;
}

/** Grava a presença (cria a candidatura ou reativa uma cancelada, retirada ou justificada). */
async function gravarPresenca(evento: Evento, usuarioId: string, sexo: Sexo | null, porId: string) {
  const { tablesDB } = createAdminClient();
  const existente = await candidaturaDe(evento.$id, usuarioId);
  if (existente?.situacao === "confirmada") return false;
  const dados = { sexo: sexo ?? existente?.sexo ?? "masculino", situacao: "confirmada" as const, ordem: Date.now(), justificativa: null, alterado_por: porId };
  if (existente) await tablesDB.updateRow({ ...base, rowId: existente.$id, data: dados });
  else await tablesDB.createRow({ ...base, rowId: ID.unique(), data: { ...dados, evento_id: evento.$id, usuario_id: usuarioId } });
  return true;
}

/** O próprio guardião marca presença na reunião (só antes de ela começar). */
export async function ingressarReuniao(
  evento: Evento,
  tipo: TipoEvento | undefined,
  usuario: { id: string; funcaoRitual: string; sexo: Sexo | null },
): Promise<Resultado> {
  if (!ehReuniao(tipo)) return { erro: "Este evento não é uma reunião." };
  if (usuario.funcaoRitual !== "guardiao" && usuario.funcaoRitual !== "mestre") return { erro: "Só guardiões e mestres marcam presença." };
  if (inicioDe(evento).getTime() <= Date.now()) return { erro: "Esta reunião já começou." };
  const novo = await gravarPresenca(evento, usuario.id, usuario.sexo, usuario.id);
  await sinalizarMudanca(evento.$id);
  return novo ? { ok: "Presença confirmada." } : { erro: "Sua presença já está confirmada." };
}

/** O guardião cancela a própria presença (até o prazo antes do início, como nos rituais). */
export async function cancelarPresenca(evento: Evento, usuarioId: string): Promise<Resultado> {
  const { horas } = await regrasGuarnicao();
  if (Date.now() > prazoCancelamento(evento, horas).getTime()) {
    return { erro: `O cancelamento só é possível até ${horas} ${horas === 1 ? "hora" : "horas"} antes do início. Se não puder vir, justifique a ausência.` };
  }
  const saiu = await sairDaReuniao(evento, usuarioId, "cancelada", usuarioId);
  await sinalizarMudanca(evento.$id);
  return saiu ? { ok: "Presença cancelada." } : { erro: "Você não marcou presença nesta reunião." };
}

/** Mestre ou coordenação inclui um guardião na lista de presença (a qualquer momento). */
export async function incluirNaReuniao(evento: Evento, usuario: { id: string; sexo: Sexo | null }, porId: string): Promise<Resultado> {
  const novo = await gravarPresenca(evento, usuario.id, usuario.sexo, porId);
  await sinalizarMudanca(evento.$id);
  return novo ? { ok: "Presença registrada." } : { erro: "Essa pessoa já está na lista de presença." };
}

/** Mestre ou coordenação tira um guardião da lista de presença. */
export async function retirarDaReuniao(evento: Evento, usuarioId: string, porId: string): Promise<Resultado> {
  const saiu = await sairDaReuniao(evento, usuarioId, "removida", porId);
  await sinalizarMudanca(evento.$id);
  return saiu ? { ok: "Presença retirada." } : { erro: "Essa pessoa não está na lista de presença." };
}

/** Registra (ou edita) a justificativa de ausência. Vale a qualquer momento; quem estava presente passa para justificados. */
export async function justificarAusencia(evento: Evento, usuario: { id: string; sexo: Sexo | null }, texto: string, porId: string): Promise<Resultado> {
  const limpo = typeof texto === "string" ? texto.trim() : "";
  if (limpo.length < JUSTIFICATIVA_MIN) return { erro: `Descreva a justificativa (mínimo de ${JUSTIFICATIVA_MIN} caracteres).` };
  if (limpo.length > JUSTIFICATIVA_MAX) return { erro: `A justificativa pode ter até ${JUSTIFICATIVA_MAX} caracteres.` };
  const { tablesDB } = createAdminClient();
  const existente = await candidaturaDe(evento.$id, usuario.id);
  const dados = { sexo: usuario.sexo ?? existente?.sexo ?? "masculino", situacao: "justificada" as const, justificativa: limpo, ordem: Date.now(), alterado_por: porId };
  if (existente) await tablesDB.updateRow({ ...base, rowId: existente.$id, data: dados });
  else await tablesDB.createRow({ ...base, rowId: ID.unique(), data: { ...dados, evento_id: evento.$id, usuario_id: usuario.id } });
  await sinalizarMudanca(evento.$id);
  return { ok: "Justificativa registrada." };
}

/** Coordenação apaga uma justificativa (a pessoa volta a "sem resposta"). */
export async function removerJustificativa(evento: Evento, usuarioId: string, porId: string): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  const existente = await candidaturaDe(evento.$id, usuarioId);
  if (existente?.situacao !== "justificada") return { erro: "Essa pessoa não tem justificativa." };
  await tablesDB.updateRow({ ...base, rowId: existente.$id, data: { situacao: "removida", justificativa: null, alterado_por: porId } });
  await sinalizarMudanca(evento.$id);
  return { ok: "Justificativa removida." };
}
