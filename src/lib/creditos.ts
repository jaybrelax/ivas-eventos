import "server-only";
import { cache } from "react";
import { AppwriteException, ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { COMPROVANTES_BUCKET_ID, DB_ID, TABLES } from "./config";
import {
  bloqueioCancelarPacote, bloqueioCessao, bloqueioEditarSituacao, calcularSaldo, consomeCredito, creditosParaRemover, ehDebito, ordemDeUso,
  ordemDoCredito, podeReceberCredito, rotuloCredito, situacaoDoCredito, transicaoPacote, travaOrfa, type SaldoCredito,
} from "./creditos-regras";
import { listar, listarEventos, listarTipos, simples } from "./data";
import { inicioDe } from "./guarnicao";
import type {
  AcaoMovimento, Credito, Evento, Inscricao, MovimentoCredito, Pacote, PlanoPacote, SituacaoPagamento, TipoEvento,
} from "./types";

/**
 * Pacotes de créditos. O Pacote é a compra (financeiro); o controle real é por Crédito: cada unidade tem
 * dono (titular), situação e histórico próprios. Este módulo NÃO importa `inscricoes.ts` (é o contrário:
 * `inscricoes.ts` chama daqui), então fala direto com a tabela de inscrições.
 *
 * Consumo sem duas pessoas gastarem o mesmo crédito: a coluna `creditos.trava` (1 = livre) é decrementada com
 * mínimo 0, operação atômica no Appwrite — só um consumo vence. Uma inscrição não gasta dois créditos: depois de
 * gravar, relê a inscrição e devolve o crédito se outro consumo gravou por cima.
 */

export type ResultadoCredito = { ok?: string; erro?: string };

const T = TABLES;
/** Quantos pacotes aguardando pagamento a mesma pessoa pode ter ao mesmo tempo (evita lixo de testes e abuso). */
export const MAX_PACOTES_ABERTOS = 3;

const naoExiste = (e: unknown) => e instanceof AppwriteException && e.code === 404;
const db = () => createAdminClient().tablesDB;

async function lerLinha<R>(tableId: string, rowId: string): Promise<R | null> {
  try {
    return simples<R>(await db().getRow({ databaseId: DB_ID, tableId, rowId }));
  } catch (e) {
    if (naoExiste(e)) return null;
    throw e;
  }
}

async function gravar(tableId: string, rowId: string, data: Record<string, unknown>) {
  await db().updateRow({ databaseId: DB_ID, tableId, rowId, data });
}

/** Lista todas as linhas (de 500 em 500), sem o teto de 1000 do `listar`. */
async function listarTodos<R extends { $id: string }>(tableId: string, queries: string[] = []): Promise<R[]> {
  const todos: R[] = [];
  let depois: string | null = null;
  for (;;) {
    const lote: R[] = simples<R[]>((await db().listRows({
      databaseId: DB_ID, tableId, queries: [Query.limit(500), ...queries, ...(depois ? [Query.cursorAfter(depois)] : [])],
    })).rows);
    todos.push(...lote);
    if (lote.length < 500) return todos;
    depois = lote[lote.length - 1].$id;
  }
}

let avisado = false;
type NovoMovimento = {
  acao: AcaoMovimento; usuario_id: string; por: string;
  credito_id?: string | null; pacote_id?: string | null; evento_id?: string | null; inscricao_id?: string | null;
  de_usuario?: string | null; para_usuario?: string | null; observacao?: string | null;
};
/** Histórico auditável (RN006). Nunca derruba a ação principal. */
async function registrarMovimento(m: NovoMovimento) {
  try {
    await db().createRow({
      databaseId: DB_ID, tableId: T.movimentosCredito, rowId: ID.unique(),
      data: { credito_id: null, pacote_id: null, evento_id: null, inscricao_id: null, de_usuario: null, para_usuario: null, observacao: null, ...m },
    });
  } catch (e) {
    if (!avisado) {
      avisado = true;
      console.warn("Histórico de créditos indisponível (rode scripts/migrar-creditos.mjs):", e instanceof Error ? e.message : e);
    }
  }
}

/** Tipos de evento lidos uma vez por requisição (várias funções daqui precisam deles na mesma página). */
const tiposDaRequisicao = cache(() => listarTipos());

async function eventosETipos(ids: string[]) {
  const unicos = [...new Set(ids)];
  const eventos: Evento[] = [];
  for (let i = 0; i < unicos.length; i += 100) eventos.push(...(await listarEventos({ ids: unicos.slice(i, i + 100) })));
  const tipos = await tiposDaRequisicao();
  return { eventoPorId: new Map(eventos.map((e) => [e.$id, e])), tipoPorId: new Map<string, TipoEvento>(tipos.map((t) => [t.$id, t])) };
}

// ---------------------------------------------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------------------------------------------

export async function listarPlanos(apenasAtivos = false) {
  const q = [Query.orderAsc("ordem"), Query.orderAsc("nome")];
  if (apenasAtivos) q.push(Query.equal("ativo", true));
  return listar<PlanoPacote>(T.planosPacote, q);
}

// ---------------------------------------------------------------------------------------------------------------
// Pacotes (a compra) e seus créditos
// ---------------------------------------------------------------------------------------------------------------

type DadosPacote = {
  usuarioId: string; planoId: string | null; nome: string; quantidade: number; valor: number | null;
  origem: "participante" | "equipe"; criadoPor: string; observacao?: string | null;
};

/** Cria o pacote e um crédito por unidade. Se algo falha no meio, desfaz tudo (nada fica pela metade). */
async function criarPacote(d: DadosPacote, situacao: "pendente" | "informado" | "pago", comprovanteFileId: string | null = null) {
  const agora = new Date();
  const pago = situacao === "pago";
  const pacoteId = ID.unique();
  await db().createRow({
    databaseId: DB_ID, tableId: T.pacotes, rowId: pacoteId,
    data: {
      usuario_id: d.usuarioId, plano_id: d.planoId, nome: d.nome, quantidade: d.quantidade, valor: d.valor,
      situacao, origem: d.origem, comprovante_file_id: comprovanteFileId,
      informado_em: situacao === "informado" ? agora.toISOString() : null,
      pago_em: pago ? agora.toISOString() : null, confirmado_por: pago ? d.criadoPor : null,
      criado_por: d.criadoPor, observacao: d.observacao ?? null,
    },
  });
  const criados: string[] = [];
  try {
    for (let n = 1; n <= d.quantidade; n += 10) {
      const lote = Array.from({ length: Math.min(10, d.quantidade - n + 1) }, (_, k) => n + k);
      await Promise.all(lote.map(async (numero) => {
        const id = ID.unique();
        await db().createRow({
          databaseId: DB_ID, tableId: T.creditos, rowId: id,
          data: {
            pacote_id: pacoteId, numero, comprador_id: d.usuarioId, titular_id: d.usuarioId,
            situacao: pago ? "disponivel" : "bloqueado", ordem: pago ? ordemDoCredito(agora.getTime(), numero) : null, trava: 1,
          },
        });
        criados.push(id);
      }));
    }
  } catch (e) {
    await Promise.allSettled(criados.map((id) => db().deleteRow({ databaseId: DB_ID, tableId: T.creditos, rowId: id })));
    await db().deleteRow({ databaseId: DB_ID, tableId: T.pacotes, rowId: pacoteId }).catch(() => {});
    throw e;
  }
  return pacoteId;
}

/** O participante compra um pacote do catálogo e informa que pagou (Pix); a equipe confirma. Os créditos ficam bloqueados até lá (RN008). */
export async function comprarPacote(usuarioId: string, planoId: string, comprovanteFileId: string | null): Promise<ResultadoCredito & { pacoteId?: string }> {
  const plano = await lerLinha<PlanoPacote>(T.planosPacote, planoId);
  if (!plano || !plano.ativo) return { erro: "Este pacote não está disponível." };
  const abertos = await listar<Pacote>(T.pacotes, [Query.equal("usuario_id", usuarioId), Query.equal("situacao", ["pendente", "informado"])]);
  if (abertos.length >= MAX_PACOTES_ABERTOS) {
    return { erro: "Você já tem pacotes aguardando confirmação. Espere a coordenação confirmar o pagamento antes de comprar outro." };
  }
  const pacoteId = await criarPacote(
    { usuarioId, planoId: plano.$id, nome: plano.nome, quantidade: plano.quantidade, valor: plano.valor, origem: "participante", criadoPor: usuarioId },
    "informado", comprovanteFileId,
  );
  // Um movimento só: a compra já nasce com o pagamento informado
  await registrarMovimento({ acao: "compra", usuario_id: usuarioId, pacote_id: pacoteId, por: usuarioId, observacao: `${plano.nome} · ${plano.quantidade} créditos · pagamento informado` });
  return { ok: "Pagamento informado! Quando a coordenação confirmar, seus créditos ficam disponíveis.", pacoteId };
}

/** A equipe lança um pacote para alguém (venda feita fora do app). `pago` já libera os créditos. */
export async function lancarPacote(
  porId: string, usuarioId: string,
  dados: { planoId: string | null; nome: string; quantidade: number; valor: number | null; observacao?: string | null },
  pago: boolean,
): Promise<ResultadoCredito & { pacoteId?: string }> {
  const pacoteId = await criarPacote(
    { usuarioId, planoId: dados.planoId, nome: dados.nome, quantidade: dados.quantidade, valor: dados.valor, origem: "equipe", criadoPor: porId, observacao: dados.observacao },
    pago ? "pago" : "pendente",
  );
  // Um movimento só: a situação do pagamento vai na observação (sem "pacote_confirmado" no mesmo instante)
  await registrarMovimento({
    acao: "compra", usuario_id: usuarioId, pacote_id: pacoteId, por: porId,
    observacao: `${dados.nome} · ${dados.quantidade} créditos (lançado pela equipe, ${pago ? "pago" : "aguardando pagamento"})`,
  });
  if (pago) await aplicarEmInscricoesFuturas(usuarioId, porId);
  return { ok: pago ? "Pacote lançado e créditos liberados." : "Pacote lançado. Os créditos ficam bloqueados até a confirmação do pagamento.", pacoteId };
}

/** A equipe confirma o pagamento: os créditos do pacote ficam disponíveis. */
export async function confirmarPacote(porId: string, pacoteId: string): Promise<ResultadoCredito> {
  const pacote = await lerLinha<Pacote>(T.pacotes, pacoteId);
  if (!pacote) return { erro: "Pacote não encontrado." };
  const bloqueio = transicaoPacote(pacote.situacao, "pago");
  if (bloqueio) return { erro: bloqueio };
  const agora = new Date();
  await gravar(T.pacotes, pacoteId, { situacao: "pago", pago_em: agora.toISOString(), confirmado_por: porId });
  const creditos = await listarTodos<Credito>(T.creditos, [Query.equal("pacote_id", pacoteId)]);
  await Promise.all(
    creditos.filter((c) => c.situacao === "bloqueado").map((c) =>
      gravar(T.creditos, c.$id, { situacao: "disponivel", ordem: ordemDoCredito(agora.getTime(), c.numero), trava: 1 })),
  );
  await registrarMovimento({ acao: "pacote_confirmado", usuario_id: pacote.usuario_id, pacote_id: pacoteId, por: porId });
  await aplicarEmInscricoesFuturas(pacote.usuario_id, porId);
  return { ok: "Pagamento confirmado: os créditos já estão disponíveis." };
}

/** Cancela o pacote (e seus créditos) se nenhum crédito foi usado nem cedido. */
export async function cancelarPacote(porId: string, pacoteId: string): Promise<ResultadoCredito> {
  const pacote = await lerLinha<Pacote>(T.pacotes, pacoteId);
  if (!pacote) return { erro: "Pacote não encontrado." };
  const creditos = await listarTodos<Credito>(T.creditos, [Query.equal("pacote_id", pacoteId)]);
  const bloqueio = transicaoPacote(pacote.situacao, "cancelado") ?? bloqueioCancelarPacote(creditos);
  if (bloqueio) return { erro: bloqueio };
  await Promise.all(creditos.filter((c) => c.situacao !== "cancelado").map((c) => gravar(T.creditos, c.$id, { situacao: "cancelado" })));
  await gravar(T.pacotes, pacoteId, { situacao: "cancelado" });
  await registrarMovimento({ acao: "pacote_cancelado", usuario_id: pacote.usuario_id, pacote_id: pacoteId, por: porId });
  return { ok: "Pacote cancelado." };
}

// ---------------------------------------------------------------------------------------------------------------
// Consumo e devolução (1 crédito = 1 participação)
// ---------------------------------------------------------------------------------------------------------------

export type ResultadoConsumo = { ok: true; creditoId: string; rotulo: string } | { ok: false; erro: string; semCredito?: boolean };

/**
 * Trava o crédito de forma atômica: decrementa `trava` de 1 para 0 com mínimo 0. Se dois processos tentam ao mesmo
 * tempo, o Appwrite aceita só um e recusa o outro ("reached the minimum value"). Testado: 10 tentativas
 * simultâneas, exatamente 1 vence.
 */
async function travar(creditoId: string): Promise<boolean> {
  try {
    await db().decrementRowColumn({ databaseId: DB_ID, tableId: T.creditos, rowId: creditoId, column: "trava", value: 1, min: 0 });
    return true;
  } catch (e) {
    if (e instanceof AppwriteException && (e.code === 400 || e.code === 409)) return false;
    throw e;
  }
}

async function soltar(creditoId: string) {
  await gravar(T.creditos, creditoId, { trava: 1 });
}

/**
 * Gasta o crédito disponível mais antigo do dono da inscrição. A inscrição precisa estar confirmada, sem crédito e
 * com a contribuição avulsa ainda em aberto (pendente ou "na hora"). Também serve para quitar um débito de um ritual
 * passado (`acao = "quitacao_debito"`).
 */
export async function consumirCredito(inscricaoId: string, porId: string, acao: "uso" | "quitacao_debito" = "uso", observacao: string | null = null): Promise<ResultadoConsumo> {
  const insc = await lerLinha<Inscricao>(T.inscricoes, inscricaoId);
  if (!insc) return { ok: false, erro: "Inscrição não encontrada." };
  if (!podeReceberCredito(insc)) return { ok: false, erro: "Esta inscrição não pode receber crédito agora." };

  const candidatos = ordemDeUso(await listarTodos<Credito>(T.creditos, [Query.equal("titular_id", insc.usuario_id), Query.equal("situacao", "disponivel")]));
  const liberar = { situacao: "disponivel", evento_id: null, inscricao_id: null, utilizado_em: null, trava: 1 };
  let tentativas = 0;
  for (const c of candidatos) {
    if (++tentativas > 8) break;
    // Trava abandonada por uma queda no meio de um consumo antigo: destrava antes de tentar
    if (travaOrfa(c, Date.now())) await soltar(c.$id);
    if (!(await travar(c.$id))) continue;
    try {
      // Com a trava em mãos, confere que o crédito continua disponível e do mesmo dono (pode ter sido cedido agora há pouco)
      const atual = await lerLinha<Credito>(T.creditos, c.$id);
      if (!atual || atual.situacao !== "disponivel" || atual.titular_id !== insc.usuario_id) { await soltar(c.$id); continue; }
      await gravar(T.creditos, c.$id, { situacao: "utilizado", evento_id: insc.evento_id, inscricao_id: insc.$id, utilizado_em: new Date().toISOString() });
      try {
        await gravar(T.inscricoes, insc.$id, { pagamento: "credito", valor: 0, credito_id: c.$id, pago_em: null, alterado_por: porId });
      } catch (e) {
        await gravar(T.creditos, c.$id, liberar).catch(() => {});
        throw e;
      }
    } catch (e) {
      await soltar(c.$id).catch(() => {});
      throw e;
    }
    // Duas chamadas ao mesmo tempo para a mesma inscrição: a última gravação vence; a outra devolve o crédito dela
    const gravada = await lerLinha<Inscricao>(T.inscricoes, insc.$id);
    if (gravada?.credito_id !== c.$id) {
      await gravar(T.creditos, c.$id, liberar);
      return { ok: false, erro: "Esta inscrição já está usando um crédito." };
    }
    // O uso fica só em movimentos_credito (com inscrição e evento): não duplica em historico_inscricoes
    await registrarMovimento({
      acao, usuario_id: insc.usuario_id, credito_id: c.$id, pacote_id: c.pacote_id, evento_id: insc.evento_id, inscricao_id: insc.$id, por: porId, observacao,
    });
    return { ok: true, creditoId: c.$id, rotulo: String(c.numero) };
  }
  return { ok: false, erro: "Sem crédito disponível.", semCredito: true };
}

/**
 * Devolve ao pacote o crédito que a inscrição usava (RN007: cancelamento devolve o crédito). Com
 * `atualizarInscricao` (padrão), a inscrição volta a "pendente"; quem já grava a inscrição por conta própria passa `false`.
 */
export async function devolverCredito(
  insc: Pick<Inscricao, "$id" | "usuario_id" | "evento_id" | "credito_id">, porId: string, atualizarInscricao = true, observacao: string | null = null,
): Promise<boolean> {
  if (!insc.credito_id) return false;
  const credito = await lerLinha<Credito>(T.creditos, insc.credito_id);
  if (credito && credito.situacao === "utilizado" && credito.inscricao_id === insc.$id) {
    await gravar(T.creditos, credito.$id, { situacao: "disponivel", evento_id: null, inscricao_id: null, utilizado_em: null, trava: 1 });
  }
  if (atualizarInscricao) await gravar(T.inscricoes, insc.$id, { pagamento: "pendente", valor: null, credito_id: null, alterado_por: porId });
  await registrarMovimento({
    acao: "devolucao", usuario_id: insc.usuario_id, credito_id: insc.credito_id, pacote_id: credito?.pacote_id ?? null,
    evento_id: insc.evento_id, inscricao_id: insc.$id, por: porId, observacao,
  });
  return true;
}

/** Quando um evento é excluído: os créditos que ele consumiu voltam para os donos. */
export async function devolverCreditosDoEvento(eventoId: string, porId: string): Promise<number> {
  const usados = await listarTodos<Credito>(T.creditos, [Query.equal("evento_id", eventoId), Query.equal("situacao", "utilizado")]);
  for (const c of usados) {
    await gravar(T.creditos, c.$id, { situacao: "disponivel", evento_id: null, inscricao_id: null, utilizado_em: null, trava: 1 });
    await registrarMovimento({
      acao: "devolucao", usuario_id: c.titular_id, credito_id: c.$id, pacote_id: c.pacote_id, evento_id: eventoId, inscricao_id: c.inscricao_id,
      por: porId, observacao: "Evento excluído",
    });
  }
  return usados.length;
}

/**
 * Depois que a pessoa ganha créditos (pacote confirmado), aplica nas inscrições confirmadas dos próximos rituais que
 * ainda estão com a contribuição em aberto, do ritual mais próximo para o mais distante. Débitos de rituais que já
 * aconteceram NÃO são tocados: a coordenação decide como quitar.
 */
export async function aplicarEmInscricoesFuturas(usuarioId: string, porId: string): Promise<number> {
  const abertas = (await listarTodos<Inscricao>(T.inscricoes, [
    Query.equal("usuario_id", usuarioId), Query.equal("situacao", "confirmada"), Query.equal("pagamento", ["pendente", "na_hora"]),
  ])).filter((i) => !i.credito_id);
  if (!abertas.length) return 0;
  const { eventoPorId, tipoPorId } = await eventosETipos(abertas.map((i) => i.evento_id));
  const futuras = abertas
    .flatMap((i) => {
      const e = eventoPorId.get(i.evento_id);
      return e && consomeCredito(tipoPorId.get(e.tipo_id)) && inicioDe(e).getTime() > Date.now() ? [{ i, inicio: inicioDe(e).getTime() }] : [];
    })
    .sort((a, b) => a.inicio - b.inicio);
  let aplicados = 0;
  for (const { i } of futuras) {
    const r = await consumirCredito(i.$id, porId);
    if (r.ok) aplicados++;
    else if (r.semCredito) break;
  }
  return aplicados;
}

/**
 * A coordenação marca a participação como paga com pacote. Serve também quando a contribuição já estava confirmada,
 * isenta ou informada: ela é reaberta e troca por 1 crédito. Sem crédito disponível, nada muda.
 */
export async function usarCreditoNaInscricao(porId: string, inscricaoId: string, exigirTitular = false): Promise<ResultadoCredito> {
  const insc = await lerLinha<Inscricao>(T.inscricoes, inscricaoId);
  if (!insc) return { erro: "Inscrição não encontrada." };
  if (exigirTitular && insc.usuario_id !== porId) return { erro: "Você só pode usar créditos nas suas próprias participações." };
  if (insc.situacao !== "confirmada") return { erro: "Só a participação confirmada pode ser paga com pacote." };
  if (insc.pagamento === "credito") return { erro: "Esta participação já está paga com pacote." };

  const reabrir = !podeReceberCredito(insc);
  if (reabrir) {
    const livres = await listar<Credito>(T.creditos, [Query.equal("titular_id", insc.usuario_id), Query.equal("situacao", "disponivel"), Query.limit(1)]);
    if (!livres.length) return { erro: "Esta pessoa não tem crédito de pacote disponível." };
    await gravar(T.inscricoes, insc.$id, {
      pagamento: "pendente", valor: null, pago_em: null, alterado_por: porId,
      ...(insc.usou_pacote ? { usou_pacote: false, observacao: null } : {}),
      ...(insc.forma_pagamento ? { forma_pagamento: null } : {}),
    });
  }
  const antes = { pagamento: insc.pagamento, valor: insc.valor ?? null, pago_em: insc.pago_em ?? null, usou_pacote: !!insc.usou_pacote, observacao: insc.observacao ?? null, ...(insc.forma_pagamento ? { forma_pagamento: insc.forma_pagamento } : {}) };
  const r = await consumirCredito(inscricaoId, porId, "uso", reabrir ? `Trocou a contribuição (${antes.pagamento}) por crédito de pacote` : null);
  if (r.ok) return { ok: "Participação paga com 1 crédito do pacote." };
  // Não conseguiu usar o crédito: volta a contribuição como estava
  if (reabrir) await gravar(T.inscricoes, insc.$id, { ...antes, alterado_por: porId }).catch(() => {});
  return { erro: r.semCredito ? "Esta pessoa não tem crédito de pacote disponível." : r.erro };
}

/** Quita um débito (ritual que a pessoa já frequentou) gastando um crédito dela. */
export async function quitarDebito(porId: string, inscricaoId: string): Promise<ResultadoCredito> {
  const r = await consumirCredito(inscricaoId, porId, "quitacao_debito");
  if (r.ok) return { ok: "Débito quitado com um crédito." };
  return { erro: r.semCredito ? "Esta pessoa não tem crédito disponível. Lance um pacote ou confirme a contribuição avulsa." : r.erro };
}

// ---------------------------------------------------------------------------------------------------------------
// Saldo e débitos
// ---------------------------------------------------------------------------------------------------------------

export type DebitoItem = {
  inscricaoId: string; usuarioId: string; eventoId: string; titulo: string; data: string; hora: string;
  ritualNumero: number | null; pagamento: SituacaoPagamento;
};

/** Débitos em aberto (de uma pessoa ou de todas): inscrição confirmada em ritual que já começou, sem crédito nem contribuição resolvida. */
export async function debitosEmAberto(usuarioIds?: string | string[]): Promise<DebitoItem[]> {
  const ids = usuarioIds === undefined ? null : [usuarioIds].flat();
  if (ids && !ids.length) return [];
  const candidatas: Inscricao[] = [];
  for (let i = 0; i < (ids?.length ?? 1); i += 100) {
    candidatas.push(...(await listarTodos<Inscricao>(T.inscricoes, [
      Query.equal("situacao", "confirmada"), Query.equal("pagamento", ["pendente", "na_hora"]), ...(ids ? [Query.equal("usuario_id", ids.slice(i, i + 100))] : []),
    ])).filter((x) => !x.credito_id));
  }
  if (!candidatas.length) return [];
  const { eventoPorId, tipoPorId } = await eventosETipos(candidatas.map((i) => i.evento_id));
  const agora = Date.now();
  return candidatas
    .flatMap((i): DebitoItem[] => {
      const e = eventoPorId.get(i.evento_id);
      const tipo = e ? tipoPorId.get(e.tipo_id) : undefined;
      if (!e || !ehDebito(i, consomeCredito(tipo), inicioDe(e).getTime(), agora)) return [];
      return [{
        inscricaoId: i.$id, usuarioId: i.usuario_id, eventoId: e.$id, titulo: e.titulo, data: e.data, hora: e.hora_inicio,
        ritualNumero: tipo?.conta_como_ritual ? e.ritual_numero_geral : null, pagamento: i.pagamento,
      }];
    })
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
}

export type SaldoUsuario = SaldoCredito & { debitosLista: DebitoItem[] };

export async function saldoDoUsuario(usuarioId: string): Promise<SaldoUsuario> {
  const [creditos, debitosLista] = await Promise.all([
    listarTodos<Credito>(T.creditos, [Query.equal("titular_id", usuarioId)]),
    debitosEmAberto(usuarioId),
  ]);
  return { ...calcularSaldo(creditos, debitosLista.length), debitosLista };
}

/** Saldo de um grupo de pessoas (ex.: os inscritos de um evento), por ID. */
export async function saldosDe(usuarioIds: string[]): Promise<Map<string, SaldoCredito>> {
  const unicos = [...new Set(usuarioIds)];
  if (!unicos.length) return new Map();
  const creditos: Credito[] = [];
  for (let i = 0; i < unicos.length; i += 100) {
    creditos.push(...(await listarTodos<Credito>(T.creditos, [Query.equal("titular_id", unicos.slice(i, i + 100))])));
  }
  return agruparSaldos(creditos, await debitosEmAberto(unicos), unicos);
}

function agruparSaldos(creditos: Credito[], debitos: DebitoItem[], extras: string[] = []): Map<string, SaldoCredito> {
  const porTitular = new Map<string, Credito[]>();
  for (const c of creditos) porTitular.set(c.titular_id, [...(porTitular.get(c.titular_id) ?? []), c]);
  const debitosPor = new Map<string, number>();
  for (const d of debitos) debitosPor.set(d.usuarioId, (debitosPor.get(d.usuarioId) ?? 0) + 1);
  const resultado = new Map<string, SaldoCredito>();
  for (const id of new Set([...porTitular.keys(), ...debitosPor.keys(), ...extras])) {
    resultado.set(id, calcularSaldo(porTitular.get(id) ?? [], debitosPor.get(id) ?? 0));
  }
  return resultado;
}

/** "2/4" para cada crédito pedido (posição no pacote / tamanho do pacote). */
export async function rotulosDosCreditos(creditoIds: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(creditoIds)];
  const rotulos = new Map<string, string>();
  for (let i = 0; i < unicos.length; i += 100) {
    const creditos = await listar<Credito>(T.creditos, [Query.equal("$id", unicos.slice(i, i + 100))]);
    const pacotes = new Map((await listar<Pacote>(T.pacotes, [Query.equal("$id", [...new Set(creditos.map((c) => c.pacote_id))])])).map((p) => [p.$id, p]));
    for (const c of creditos) rotulos.set(c.$id, rotuloCredito(c.numero, pacotes.get(c.pacote_id)?.quantidade ?? c.numero));
  }
  return rotulos;
}

/** Saldo de todo mundo que tem crédito ou débito (visão da equipe). */
export async function saldosDeTodos(): Promise<Map<string, SaldoCredito>> {
  return (await saldosEDebitos()).saldos;
}

/** Saldos e débitos de todo mundo com uma leitura só de créditos e uma de débitos. */
export async function saldosEDebitos(): Promise<{ saldos: Map<string, SaldoCredito>; debitos: DebitoItem[] }> {
  const [creditos, debitos] = await Promise.all([listarTodos<Credito>(T.creditos), debitosEmAberto()]);
  return { saldos: agruparSaldos(creditos, debitos), debitos };
}

/**
 * Tudo que a aba Pacotes precisa (pacotes com contagem, saldos e débitos) lendo a tabela de créditos uma vez só,
 * em vez de uma vez para cada contagem.
 */
export async function resumoGeral(): Promise<{ pacotes: PacoteResumo[]; saldos: Map<string, SaldoCredito>; debitos: DebitoItem[] }> {
  const [pacotes, creditos, debitos] = await Promise.all([
    listarTodos<Pacote>(T.pacotes, [Query.orderDesc("$createdAt")]),
    listarTodos<Credito>(T.creditos),
    debitosEmAberto(),
  ]);
  return { pacotes: resumirPacotes(pacotes, creditos), saldos: agruparSaldos(creditos, debitos), debitos };
}

/** Pacotes sem a contagem de créditos (nomes para filtros e histórico): não lê a tabela de créditos. */
export async function listarPacotes(ids?: string[]): Promise<Pacote[]> {
  if (!ids) return listarTodos<Pacote>(T.pacotes, [Query.orderDesc("$createdAt")]);
  const unicos = [...new Set(ids)];
  const lista: Pacote[] = [];
  for (let i = 0; i < unicos.length; i += 100) lista.push(...(await listar<Pacote>(T.pacotes, [Query.equal("$id", unicos.slice(i, i + 100))])));
  return lista;
}

// ---------------------------------------------------------------------------------------------------------------
// Consultas para as telas
// ---------------------------------------------------------------------------------------------------------------

export type PacoteResumo = Pacote & { disponiveis: number; bloqueados: number; utilizados: number; cedidos: number };

/** Pacotes (de uma pessoa ou todos), do mais novo ao mais antigo, com a contagem dos créditos de cada um. */
export async function pacotesComResumo(usuarioId?: string): Promise<PacoteResumo[]> {
  const pacotes = await listarTodos<Pacote>(T.pacotes, [Query.orderDesc("$createdAt"), ...(usuarioId ? [Query.equal("usuario_id", usuarioId)] : [])]);
  if (!pacotes.length) return [];
  const creditos = usuarioId
    ? await listarTodos<Credito>(T.creditos, [Query.equal("comprador_id", usuarioId)])
    : await listarTodos<Credito>(T.creditos);
  return resumirPacotes(pacotes, creditos);
}

function resumirPacotes(pacotes: Pacote[], creditos: Credito[]): PacoteResumo[] {
  const porPacote = new Map<string, Credito[]>();
  for (const c of creditos) porPacote.set(c.pacote_id, [...(porPacote.get(c.pacote_id) ?? []), c]);
  return pacotes.map((p) => {
    const cs = porPacote.get(p.$id) ?? [];
    const conta = (s: Credito["situacao"]) => cs.filter((c) => c.situacao === s).length;
    return {
      ...p, disponiveis: conta("disponivel"), bloqueados: conta("bloqueado"), utilizados: conta("utilizado"),
      cedidos: cs.filter((c) => c.situacao !== "cancelado" && c.titular_id !== c.comprador_id).length,
    };
  });
}

export type CreditoItem = Credito & {
  rotulo: string; pacoteNome: string | null;
  evento: { id: string; titulo: string; data: string; ritualNumero: number | null } | null;
  /** O crédito é de outra pessoa agora (foi cedido por quem comprou). */
  cedidoParaOutro: boolean;
};

/** Créditos que a pessoa tem agora ou comprou e cedeu a outros, com o ritual onde cada um foi usado. */
export async function creditosDoUsuario(usuarioId: string): Promise<CreditoItem[]> {
  const [meus, comprados] = await Promise.all([
    listarTodos<Credito>(T.creditos, [Query.equal("titular_id", usuarioId)]),
    listarTodos<Credito>(T.creditos, [Query.equal("comprador_id", usuarioId)]),
  ]);
  return montarCreditos(usuarioId, meus, comprados);
}

/** Saldo e lista de créditos da pessoa lendo os créditos dela uma vez só (ficha e Minha conta). */
export async function creditosESaldo(usuarioId: string): Promise<{ saldo: SaldoUsuario; creditos: CreditoItem[] }> {
  const [meus, comprados, debitosLista] = await Promise.all([
    listarTodos<Credito>(T.creditos, [Query.equal("titular_id", usuarioId)]),
    listarTodos<Credito>(T.creditos, [Query.equal("comprador_id", usuarioId)]),
    debitosEmAberto(usuarioId),
  ]);
  return { saldo: { ...calcularSaldo(meus, debitosLista.length), debitosLista }, creditos: await montarCreditos(usuarioId, meus, comprados) };
}

async function montarCreditos(usuarioId: string, meus: Credito[], comprados: Credito[]): Promise<CreditoItem[]> {
  const todos = new Map<string, Credito>();
  for (const c of [...meus, ...comprados]) if (c.situacao !== "cancelado") todos.set(c.$id, c);
  const lista = [...todos.values()];
  if (!lista.length) return [];
  const [listaPacotes, { eventoPorId, tipoPorId }] = await Promise.all([
    listarPacotes(lista.map((c) => c.pacote_id)),
    eventosETipos(lista.flatMap((c) => (c.evento_id ? [c.evento_id] : []))),
  ]);
  const pacotes = new Map(listaPacotes.map((p) => [p.$id, p]));
  return lista
    .map((c): CreditoItem => {
      const e = c.evento_id ? eventoPorId.get(c.evento_id) : undefined;
      const p = pacotes.get(c.pacote_id);
      return {
        ...c, rotulo: rotuloCredito(c.numero, p?.quantidade ?? c.numero), pacoteNome: p?.nome ?? null,
        evento: e ? { id: e.$id, titulo: e.titulo, data: e.data, ritualNumero: tipoPorId.get(e.tipo_id)?.conta_como_ritual ? e.ritual_numero_geral : null } : null,
        cedidoParaOutro: c.titular_id !== usuarioId,
      };
    })
    .sort((a, b) => a.pacote_id.localeCompare(b.pacote_id) || a.numero - b.numero);
}

export type FiltroHistorico = { usuarioId?: string; eventoId?: string; pacoteId?: string; de?: string; ate?: string; limite?: number };

/** Quantos movimentos o histórico mostra por vez ("Mostrar mais" soma outra página). */
export const PAGINA_HISTORICO = 100;

/** Histórico dos créditos (RN006), do mais novo ao mais antigo. `de` e `ate` são datas AAAA-MM-DD (horário de Brasília). */
export async function historicoCreditos(f: FiltroHistorico = {}): Promise<MovimentoCredito[]> {
  const q = [Query.orderDesc("$createdAt"), Query.limit(Math.min(f.limite ?? 300, 1000))];
  if (f.usuarioId) q.push(Query.or([Query.equal("usuario_id", f.usuarioId), Query.equal("para_usuario", f.usuarioId)]));
  if (f.eventoId) q.push(Query.equal("evento_id", f.eventoId));
  if (f.pacoteId) q.push(Query.equal("pacote_id", f.pacoteId));
  if (f.de && /^\d{4}-\d{2}-\d{2}$/.test(f.de)) q.push(Query.greaterThanEqual("$createdAt", new Date(`${f.de}T00:00:00-03:00`).toISOString()));
  if (f.ate && /^\d{4}-\d{2}-\d{2}$/.test(f.ate)) q.push(Query.lessThanEqual("$createdAt", new Date(`${f.ate}T23:59:59.999-03:00`).toISOString()));
  return listar<MovimentoCredito>(T.movimentosCredito, q);
}

// ---------------------------------------------------------------------------------------------------------------
// Cessão
// ---------------------------------------------------------------------------------------------------------------

/** Conta ativa com este e-mail (para ceder crédito sem mostrar a lista de usuários). */
export async function usuarioPorEmail(email: string): Promise<{ id: string; nome: string } | null> {
  const limpo = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(limpo)) return null;
  const { users } = createAdminClient();
  const r = await users.list({ queries: [Query.equal("email", limpo), Query.limit(1)] });
  const u = r.users[0];
  return u && u.status ? { id: u.$id, nome: u.name || u.email } : null;
}

/**
 * Passa o crédito para outra pessoa (que passa a ser a única que pode usá-lo — RN004). Só o titular cede, e só
 * crédito disponível (RN003). A equipe não cede nem devolve créditos.
 */
export async function cederCredito(creditoId: string, deUsuarioId: string, paraUsuarioId: string, porId: string): Promise<ResultadoCredito> {
  const c = await lerLinha<Credito>(T.creditos, creditoId);
  if (!c) return { erro: "Crédito não encontrado." };
  const bloqueio = bloqueioCessao(c, deUsuarioId, paraUsuarioId);
  if (bloqueio) return { erro: bloqueio };
  const voltaAoDono = paraUsuarioId === c.comprador_id;
  await gravar(T.creditos, c.$id, voltaAoDono
    ? { titular_id: paraUsuarioId, cedido_de: null, cedido_em: null }
    : { titular_id: paraUsuarioId, cedido_de: c.titular_id, cedido_em: new Date().toISOString() });
  // Se o crédito foi gasto no meio do caminho, desfaz a cessão: crédito usado não se transfere
  const depois = await lerLinha<Credito>(T.creditos, c.$id);
  if (depois?.situacao !== "disponivel") {
    await gravar(T.creditos, c.$id, { titular_id: c.titular_id, cedido_de: c.cedido_de ?? null, cedido_em: c.cedido_em ?? null });
    return { erro: "Este crédito acabou de ser utilizado e não pode mais ser cedido." };
  }
  await registrarMovimento({
    acao: "cessao", usuario_id: c.titular_id, credito_id: c.$id, pacote_id: c.pacote_id, de_usuario: c.titular_id, para_usuario: paraUsuarioId, por: porId,
  });
  return { ok: "Crédito cedido." };
}

/** Quantos pacotes e créditos (fora os cancelados) a pessoa tem: registro financeiro que impede excluir a conta. */
export async function registrosDeCredito(usuarioId: string): Promise<{ pacotes: number; creditos: number }> {
  const [pacotes, creditos] = await Promise.all([
    listarTodos<Pacote>(T.pacotes, [Query.equal("usuario_id", usuarioId)]),
    listarTodos<Credito>(T.creditos, [Query.equal("titular_id", usuarioId)]),
  ]);
  return { pacotes: pacotes.filter((p) => p.situacao !== "cancelado").length, creditos: creditos.filter((c) => c.situacao !== "cancelado").length };
}

/**
 * Edição manual de um pacote pela coordenação: muda a quantidade de créditos e/ou a situação do pagamento.
 * Reduzir remove os créditos de maior número que não foram usados nem cedidos; aumentar cria novos.
 * Sair de "pago" só é possível sem crédito usado ou cedido.
 */
export async function editarPacote(
  porId: string, pacoteId: string,
  dados: {
    quantidade: number; situacao: Pacote["situacao"]; nome: string; valor: number | null; observacao: string | null;
    /** undefined mantém o comprovante atual; null remove; um ID troca. */
    comprovanteFileId?: string | null;
  },
): Promise<ResultadoCredito> {
  const pacote = await lerLinha<Pacote>(T.pacotes, pacoteId);
  if (!pacote) return { erro: "Pacote não encontrado." };
  let creditos = await listarTodos<Credito>(T.creditos, [Query.equal("pacote_id", pacoteId)]);
  const mudouSituacao = dados.situacao !== pacote.situacao;
  const bloqueio = bloqueioEditarSituacao(pacote.situacao, dados.situacao, creditos);
  if (bloqueio) return { erro: bloqueio };
  const agora = new Date();
  const destino = situacaoDoCredito(dados.situacao);

  // Quantidade: remove ou cria créditos antes de mudar a situação
  if (dados.quantidade < creditos.length) {
    const r = creditosParaRemover(creditos, dados.quantidade);
    if ("erro" in r) return { erro: r.erro };
    await Promise.all(r.remover.map((c) => db().deleteRow({ databaseId: DB_ID, tableId: T.creditos, rowId: c.$id })));
    creditos = creditos.filter((c) => !r.remover.some((x) => x.$id === c.$id));
  } else if (dados.quantidade > creditos.length) {
    const maior = Math.max(0, ...creditos.map((c) => c.numero));
    const novos = dados.quantidade - creditos.length;
    for (let k = 1; k <= novos; k++) {
      await db().createRow({
        databaseId: DB_ID, tableId: T.creditos, rowId: ID.unique(),
        data: {
          pacote_id: pacoteId, numero: maior + k, comprador_id: pacote.usuario_id, titular_id: pacote.usuario_id,
          situacao: destino, ordem: destino === "disponivel" ? ordemDoCredito(agora.getTime(), maior + k) : null, trava: 1,
        },
      });
    }
  }

  if (mudouSituacao) {
    const lista = await listarTodos<Credito>(T.creditos, [Query.equal("pacote_id", pacoteId)]);
    await Promise.all(lista.filter((c) => c.situacao !== "utilizado" && c.situacao !== destino).map((c) =>
      gravar(T.creditos, c.$id, { situacao: destino, ordem: destino === "disponivel" ? ordemDoCredito(agora.getTime(), c.numero) : (c.ordem ?? null), trava: 1 })));
  }
  await gravar(T.pacotes, pacoteId, {
    quantidade: dados.quantidade, situacao: dados.situacao, nome: dados.nome, valor: dados.valor, observacao: dados.observacao,
    ...(dados.comprovanteFileId !== undefined ? { comprovante_file_id: dados.comprovanteFileId } : {}),
    ...(mudouSituacao ? {
      pago_em: dados.situacao === "pago" ? agora.toISOString() : null,
      confirmado_por: dados.situacao === "pago" ? porId : null,
    } : {}),
  });
  // Comprovante trocado ou removido: apaga o arquivo antigo
  if (dados.comprovanteFileId !== undefined && pacote.comprovante_file_id && pacote.comprovante_file_id !== dados.comprovanteFileId) {
    await createAdminClient().storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: pacote.comprovante_file_id }).catch(() => {});
  }
  await registrarMovimento({
    acao: "ajuste", usuario_id: pacote.usuario_id, pacote_id: pacoteId, por: porId,
    observacao: `Pacote editado: ${dados.quantidade} créditos${mudouSituacao ? `, situação ${pacote.situacao} para ${dados.situacao}` : ""}`,
  });
  if (dados.situacao === "pago") await aplicarEmInscricoesFuturas(pacote.usuario_id, porId);
  return { ok: "Pacote atualizado." };
}

/** Exclui o pacote e seus créditos. Só sem crédito usado nem cedido. */
export async function excluirPacote(porId: string, pacoteId: string): Promise<ResultadoCredito> {
  const pacote = await lerLinha<Pacote>(T.pacotes, pacoteId);
  if (!pacote) return { erro: "Pacote não encontrado." };
  const creditos = await listarTodos<Credito>(T.creditos, [Query.equal("pacote_id", pacoteId)]);
  const bloqueio = bloqueioCancelarPacote(creditos);
  if (bloqueio) return { erro: bloqueio.replace("antes de cancelar", "antes de excluir") };
  await Promise.all(creditos.map((c) => db().deleteRow({ databaseId: DB_ID, tableId: T.creditos, rowId: c.$id })));
  await db().deleteRow({ databaseId: DB_ID, tableId: T.pacotes, rowId: pacoteId });
  if (pacote.comprovante_file_id) await createAdminClient().storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: pacote.comprovante_file_id }).catch(() => {});
  await registrarMovimento({ acao: "ajuste", usuario_id: pacote.usuario_id, pacote_id: pacoteId, por: porId, observacao: `Pacote excluído: ${pacote.nome ?? "Pacote"} (${pacote.quantidade})` });
  return { ok: "Pacote excluído." };
}
