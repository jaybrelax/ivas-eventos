import "server-only";
import { AppwriteException, ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { COMPROVANTES_BUCKET_ID, DB_ID, TABLES } from "./config";
import { consumirCredito, devolverCredito } from "./creditos";
import { deveAguardarEscolhaDoBonus, devolverBonusAniversario } from "./bonus-aniversario";
import { consomeCredito } from "./creditos-regras";
import { getEvento, listar, listarEventos, listarTipos } from "./data";
import { hoje } from "./format";
import { HORAS_LIMITE_CANCELAMENTO, inicioDe, prazoCancelamento } from "./guarnicao";
import { urlPublicaEvento } from "./links";
import { registrarHistorico, type AcaoHistorico } from "./historico-inscricoes";
import { participantePodeInformar, transicaoPermitida, type DestinoCoordenacao } from "./pagamento-regras";
import type { Evento, FormaPagamento, Inscricao, SituacaoInscricao, SituacaoPagamento, TipoEvento } from "./types";

/**
 * Inscrições de participantes (público geral) nos eventos — separadas da guarnição (guardiões).
 * Mesmo padrão: fila única por ordem de chegada, vagas em `evento.vagas_participantes`
 * (padrão 30), lista de espera quando lota, cancelamento até 4 h antes do início.
 */

export const VAGAS_PARTICIPANTES_PADRAO = 30;
const ATIVAS = ["confirmada", "espera"] as const;
const base = { databaseId: DB_ID, tableId: TABLES.inscricoes };

export { HORAS_LIMITE_CANCELAMENTO, inicioDe, prazoCancelamento };

export function vagasParticipantesDe(e: Pick<Evento, "vagas_participantes">): number {
  return e.vagas_participantes ?? VAGAS_PARTICIPANTES_PADRAO;
}

/** O tipo permite inscrição de participantes: aberto ao público e não fechado para guardiões. */
export function aceitaParticipantes(tipo: Pick<TipoEvento, "aberto_publico" | "fechado_guardioes"> | undefined) {
  return !!tipo?.aberto_publico && !tipo?.fechado_guardioes;
}

/** Inscrições ativas (confirmadas e em espera) de um evento, por ordem de chegada. */
export async function inscricoesDoEvento(eventoId: string) {
  return listar<Inscricao>(TABLES.inscricoes, [
    Query.equal("evento_id", eventoId),
    Query.equal("situacao", [...ATIVAS]),
    Query.orderAsc("ordem"),
  ]);
}

/** Inscrições ativas de vários eventos (ex.: vagas na agenda, relatório de pagamentos). */
export async function inscricoesDosEventos(ids: string[]) {
  if (!ids.length) return [];
  const todas: Inscricao[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    todas.push(
      ...(await listar<Inscricao>(TABLES.inscricoes, [Query.equal("evento_id", ids.slice(i, i + 100)), Query.equal("situacao", [...ATIVAS])])),
    );
  }
  return todas;
}

/** Todas as inscrições ativas (lista de participantes no painel: contagem e totais por pessoa). */
export async function todasInscricoesAtivas() {
  return listar<Inscricao>(TABLES.inscricoes, [Query.equal("situacao", [...ATIVAS])]);
}

/** Inscrições ativas de um usuário (o histórico de participações dele). */
export async function inscricoesDe(usuarioId: string) {
  return listar<Inscricao>(TABLES.inscricoes, [Query.equal("usuario_id", usuarioId), Query.equal("situacao", [...ATIVAS])]);
}

async function inscricaoDe(eventoId: string, usuarioId: string) {
  const r = await listar<Inscricao>(TABLES.inscricoes, [Query.equal("evento_id", eventoId), Query.equal("usuario_id", usuarioId)]);
  return r[0] ?? null;
}

export type ItemInscricao = {
  inscricaoId: string;
  eventoId: string;
  titulo: string;
  capa: string | null;
  data: string;
  hora: string;
  ritualNumero: number | null;
  situacao: SituacaoInscricao;
  pagamento: SituacaoPagamento;
  /** Como a contribuição foi paga (pix, dinheiro ou pacote), quando confirmada. */
  forma: FormaPagamento | null;
  valor: number | null;
  comprovante: string | null;
  /** Quando a inscrição foi feita, quando a contribuição foi informada e quando foi confirmada. */
  inscritoEm: string;
  informadoEm: string | null;
  pagoEm: string | null;
  temContribuicao: boolean;
  passado: boolean;
  /** A própria pessoa ainda pode cancelar: dentro do prazo e sem contribuição confirmada. */
  podeCancelar: boolean;
  url: string;
};

/** Inscrições ativas do participante, já com os dados do evento — para "Minha conta" (próximos/histórico/pagamentos). */
export async function inscricoesComEventos(usuarioId: string): Promise<ItemInscricao[]> {
  const ativas = await inscricoesDe(usuarioId);
  if (!ativas.length) return [];
  const ids = [...new Set(ativas.map((i) => i.evento_id))];
  const [eventos, tipos] = await Promise.all([listarEventos({ ids }), listarTipos()]);
  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const hj = hoje();
  return ativas
    .flatMap((i): ItemInscricao[] => {
      const e = eventos.find((x) => x.$id === i.evento_id);
      if (!e) return [];
      const tipo = tipoPorId.get(e.tipo_id);
      return [{
        inscricaoId: i.$id,
        eventoId: e.$id,
        titulo: e.titulo,
        capa: e.capa_file_id,
        data: e.data,
        hora: e.hora_inicio,
        ritualNumero: tipo?.conta_como_ritual ? e.ritual_numero_geral : null,
        situacao: i.situacao,
        pagamento: i.pagamento,
        forma: i.pagamento === "credito" ? "pacote" : (i.forma_pagamento ?? null),
        valor: i.valor,
        comprovante: i.comprovante_file_id,
        inscritoEm: i.$createdAt,
        informadoEm: i.informado_em,
        pagoEm: i.pago_em,
        temContribuicao: !!tipo?.conta_como_ritual,
        passado: e.data < hj,
        podeCancelar: i.pagamento !== "pago" && Date.now() <= prazoCancelamento(e).getTime(),
        url: urlPublicaEvento(e, tipo),
      }];
    })
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
}

/**
 * Aplica as vagas pela ordem de chegada: confirma até o limite, o que passar vai para a espera.
 * Roda depois de qualquer mudança (inscrição, cancelamento, ajuste de vagas).
 */
export async function reorganizarInscricoes(evento: Pick<Evento, "$id" | "vagas_participantes">, alteradoPor: string | null) {
  const { tablesDB } = createAdminClient();
  const vagas = vagasParticipantesDe(evento);
  const ativas = await inscricoesDoEvento(evento.$id);
  const fila = [...ativas].sort((a, b) => a.ordem - b.ordem);
  const promovidas: Inscricao[] = [];
  const rebaixadas: Inscricao[] = [];
  for (const [i, insc] of fila.entries()) {
    const deveSer = i < vagas ? "confirmada" : "espera";
    if (insc.situacao !== deveSer) {
      await tablesDB.updateRow({ ...base, rowId: insc.$id, data: { situacao: deveSer, alterado_por: alteradoPor } });
      (deveSer === "confirmada" ? promovidas : rebaixadas).push(insc);
    }
  }
  await ajustarCreditos(evento.$id, promovidas, rebaixadas, alteradoPor);
}

/**
 * Créditos acompanham a vaga: quem passa a ter vaga confirmada num ritual usa 1 crédito (se tiver e se a
 * contribuição avulsa ainda está em aberto); quem volta para a espera devolve o crédito. A inscrição nova entra
 * como "espera" e é promovida aqui, então este é o único ponto de consumo. Nunca derruba a inscrição.
 */
async function ajustarCreditos(eventoId: string, promovidas: Inscricao[], rebaixadas: Inscricao[], alteradoPor: string | null) {
  if (!promovidas.length && !rebaixadas.length) return;
  try {
    const evento = await getEvento(eventoId);
    if (!evento) return;
    const tipo = (await listarTipos()).find((t) => t.$id === evento.tipo_id);
    if (!consomeCredito(tipo)) return;
    for (const insc of rebaixadas) if (insc.credito_id) await devolverCredito(insc, alteradoPor ?? insc.usuario_id);
    for (const insc of promovidas) {
      // No mês do aniversário, a pessoa escolhe entre o bônus e o pacote no modal.
      if (!(await deveAguardarEscolhaDoBonus(insc.usuario_id, evento, tipo))) await consumirCredito(insc.$id, alteradoPor ?? insc.usuario_id);
    }
  } catch (e) {
    console.error("Créditos da inscrição:", e instanceof Error ? e.message : e);
  }
}

async function entrarNaFila(eventoId: string, usuarioId: string, alteradoPor: string, acao: AcaoHistorico) {
  const { tablesDB } = createAdminClient();
  const existente = await inscricaoDe(eventoId, usuarioId);
  const dados = { situacao: "espera" as const, ordem: Date.now(), alterado_por: alteradoPor };
  let inscricaoId: string;
  if (existente) {
    if (existente.situacao === "confirmada" || existente.situacao === "espera") return { jaEstava: true };
    // Crédito que ficou preso numa inscrição cancelada volta para o dono antes de reativar
    if (existente.credito_id) await devolverCredito(existente, alteradoPor);
    await tablesDB.updateRow({ ...base, rowId: existente.$id, data: dados });
    inscricaoId = existente.$id;
  } else {
    try {
      inscricaoId = ID.unique();
      await tablesDB.createRow({ ...base, rowId: inscricaoId, data: { ...dados, evento_id: eventoId, usuario_id: usuarioId, pagamento: "pendente" } });
    } catch (e) {
      // Dois cliques ao mesmo tempo: o índice único (evento_id, usuario_id) barra a segunda linha
      if (e instanceof AppwriteException && e.code === 409) return { jaEstava: true };
      throw e;
    }
  }
  await registrarHistorico({ inscricao_id: inscricaoId, evento_id: eventoId, usuario_id: usuarioId, acao, por: alteradoPor });
  return { jaEstava: false };
}

/** Cancela a inscrição ativa. Com a contribuição já confirmada, não cancela (só depois de reabrir a contribuição). */
async function sairDaFila(eventoId: string, usuarioId: string, alteradoPor: string): Promise<"saiu" | "saiu_com_credito" | "saiu_com_bonus" | "nao_inscrito" | "pago"> {
  const { tablesDB } = createAdminClient();
  const existente = await inscricaoDe(eventoId, usuarioId);
  if (!existente || (existente.situacao !== "confirmada" && existente.situacao !== "espera")) return "nao_inscrito";
  if (existente.pagamento === "pago") return "pago";
  await tablesDB.updateRow({ ...base, rowId: existente.$id, data: { situacao: "cancelada", alterado_por: alteradoPor } });
  await registrarHistorico({
    inscricao_id: existente.$id, evento_id: eventoId, usuario_id: usuarioId,
    acao: alteradoPor === usuarioId ? "cancelamento" : "remocao", por: alteradoPor,
  });
  // RN007: cancelar a participação devolve o crédito ao pacote
  if (existente.pagamento === "credito" || existente.credito_id) {
    await devolverCredito(existente, alteradoPor);
    return "saiu_com_credito";
  }
  if (existente.pagamento === "aniversario" || existente.bonus_aniversario_id) {
    await devolverBonusAniversario(existente, alteradoPor);
    await tablesDB.updateRow({ ...base, rowId: existente.$id, data: {
      pagamento: "pendente", valor: null, informado_em: null, pago_em: null, bonus_aniversario_id: null, alterado_por: alteradoPor,
    } });
    return "saiu_com_bonus";
  }
  return "saiu";
}

export type Resultado = { ok?: string; erro?: string };

/** A própria pessoa confirma presença. */
export async function inscrever(evento: Evento, tipo: TipoEvento | undefined, usuarioId: string): Promise<Resultado> {
  if (!aceitaParticipantes(tipo)) return { erro: "Este evento não está aberto para inscrição pública." };
  if (evento.candidaturas_abertas === false) return { erro: "As inscrições deste evento estão fechadas." };
  if (inicioDe(evento).getTime() <= Date.now()) return { erro: "Este evento já começou." };
  const r = await entrarNaFila(evento.$id, usuarioId, usuarioId, "inscricao");
  if (r.jaEstava) return { erro: "Você já está inscrito neste evento." };
  await reorganizarInscricoes(evento, usuarioId);
  const minha = await inscricaoDe(evento.$id, usuarioId);
  return minha?.situacao === "confirmada"
    ? { ok: minha.pagamento === "credito" ? "Participação confirmada com 1 crédito!" : "Participação confirmada!" }
    : { ok: "As vagas estão preenchidas: você entrou na lista de espera e será avisado se alguém sair." };
}

/** A própria pessoa cancela (até 4 h antes do início e enquanto a contribuição não foi confirmada). */
export async function cancelarInscricao(evento: Evento, usuarioId: string): Promise<Resultado> {
  if (Date.now() > prazoCancelamento(evento).getTime()) {
    return { erro: `O cancelamento só é possível até ${HORAS_LIMITE_CANCELAMENTO} horas antes do início. Fale com a coordenação.` };
  }
  const r = await sairDaFila(evento.$id, usuarioId, usuarioId);
  if (r === "nao_inscrito") return { erro: "Você não está inscrito neste evento." };
  if (r === "pago") return { erro: "Sua contribuição já foi confirmada, então a participação não pode ser cancelada pelo site. Fale com a coordenação." };
  await reorganizarInscricoes(evento, usuarioId);
  return { ok: r === "saiu_com_credito" ? "Participação cancelada. Seu crédito foi devolvido." : r === "saiu_com_bonus" ? "Participação cancelada. Seu bônus de aniversário foi devolvido." : "Participação cancelada." };
}

/** Coordenador inclui alguém manualmente (entra na fila como qualquer inscrição). */
export async function incluirParticipante(evento: Evento, usuarioId: string, porId: string): Promise<Resultado> {
  const r = await entrarNaFila(evento.$id, usuarioId, porId, "inclusao");
  if (r.jaEstava) return { erro: "Essa pessoa já está inscrita neste evento." };
  await reorganizarInscricoes(evento, porId);
  const insc = await inscricaoDe(evento.$id, usuarioId);
  return { ok: insc?.situacao === "confirmada" ? "Participante incluído." : "Vagas cheias: a pessoa entrou na lista de espera." };
}

/** Coordenador cancela a participação de alguém (sem prazo, se a contribuição não foi confirmada); o primeiro da espera assume a vaga. */
export async function removerParticipante(evento: Evento, usuarioId: string, porId: string): Promise<Resultado> {
  const r = await sairDaFila(evento.$id, usuarioId, porId);
  if (r === "nao_inscrito") return { erro: "Essa pessoa não está neste evento." };
  if (r === "pago") return { erro: "A contribuição desta pessoa já foi confirmada. Reabra a contribuição antes de cancelar a participação." };
  await reorganizarInscricoes(evento, porId);
  return { ok: r === "saiu_com_credito" ? "Participação cancelada. O crédito foi devolvido." : r === "saiu_com_bonus" ? "Participação cancelada. O bônus de aniversário foi devolvido." : "Participação cancelada." };
}

/**
 * Coordenação exclui de vez a participação de alguém, com a contribuição ainda pendente (serve também para
 * rituais já realizados). Apaga a inscrição e o comprovante anexado; o histórico fica registrado.
 */
export async function excluirInscricao(evento: Evento, inscricaoId: string, porId: string): Promise<Resultado> {
  const { tablesDB, storage } = createAdminClient();
  const row = await tablesDB.getRow({ ...base, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!row || row.evento_id !== evento.$id) return { erro: "Inscrição não encontrada neste evento." };
  if (row.pagamento !== "pendente") return { erro: "Só dá para excluir a participação com a contribuição pendente. Marque como pendente antes." };
  await registrarHistorico({ inscricao_id: row.$id, evento_id: evento.$id, usuario_id: row.usuario_id, acao: "remocao", pagamento_de: row.pagamento, por: porId });
  await tablesDB.deleteRow({ ...base, rowId: row.$id });
  if (row.comprovante_file_id) await storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: row.comprovante_file_id }).catch(() => {});
  await reorganizarInscricoes(evento, porId);
  return { ok: "Participação excluída." };
}

/** O próprio participante avisa que contribuiu (comprovante opcional); fica aguardando confirmação da coordenação. */
export async function informarPagamento(inscricaoId: string, usuarioId: string, valor: number | null, comprovanteFileId: string | null): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  const row = await tablesDB.getRow({ ...base, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!row || row.usuario_id !== usuarioId) return { erro: "Inscrição não encontrada." };
  const bloqueio = participantePodeInformar(row);
  if (bloqueio) return { erro: bloqueio };
  await tablesDB.updateRow({
    ...base, rowId: inscricaoId,
    data: { pagamento: "informado", valor, informado_em: new Date().toISOString(), comprovante_file_id: comprovanteFileId, alterado_por: usuarioId },
  });
  await registrarHistorico({
    inscricao_id: inscricaoId, evento_id: row.evento_id, usuario_id: usuarioId, acao: "pagamento_informado",
    pagamento_de: row.pagamento, pagamento_para: "informado", valor, por: usuarioId,
  });
  return { ok: "Contribuição informada! A coordenação vai confirmar em breve." };
}

/** O participante avisa que vai contribuir no dia do ritual (ou desfaz o aviso e volta a "pendente"). */
export async function contribuirNaHora(inscricaoId: string, usuarioId: string, desfazer = false): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  const row = await tablesDB.getRow({ ...base, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!row || row.usuario_id !== usuarioId) return { erro: "Inscrição não encontrada." };
  if (row.situacao === "cancelada") return { erro: "Esta inscrição foi cancelada." };
  const historico = { inscricao_id: inscricaoId, evento_id: row.evento_id, usuario_id: usuarioId, pagamento_de: row.pagamento, por: usuarioId };
  // Só muda enquanto a contribuição não foi informada, confirmada ou isentada
  if (desfazer) {
    if (row.pagamento !== "na_hora") return { erro: "Nada a desfazer." };
    await tablesDB.updateRow({ ...base, rowId: inscricaoId, data: { pagamento: "pendente", alterado_por: usuarioId } });
    await registrarHistorico({ ...historico, acao: "pagamento_desfeito", pagamento_para: "pendente" });
    return { ok: "Combinado, a escolha foi desfeita." };
  }
  if (row.pagamento !== "pendente" && row.pagamento !== "na_hora") return { erro: "A contribuição desta inscrição já foi resolvida." };
  await tablesDB.updateRow({ ...base, rowId: inscricaoId, data: { pagamento: "na_hora", alterado_por: usuarioId } });
  await registrarHistorico({ ...historico, acao: "pagamento_na_hora", pagamento_para: "na_hora" });
  return { ok: "Combinado! Você contribui na hora, no dia do ritual." };
}

/**
 * Coordenador confirma, isenta ou reabre um pagamento. A inscrição precisa ser do evento indicado e
 * estar ativa. Ao confirmar, `valor` (já validado) registra quanto foi recebido; sem ele, fica o valor informado.
 * Reabrir apaga a data da confirmação.
 */
export async function definirPagamento(
  eventoId: string, inscricaoId: string, situacao: DestinoCoordenacao, porId: string, valor: number | null = null,
  /** Confirmada com pacote: observação livre (ex.: "2/4 1"); o valor em R$ fica 0. */
  pacote: { obs: string } | null = null,
  /** Forma da contribuição confirmada: pix ou dinheiro. */
  forma: "pix" | "dinheiro" | null = null,
): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  const row = await tablesDB.getRow({ ...base, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!row || row.evento_id !== eventoId) return { erro: "Inscrição não encontrada neste evento." };
  if (row.pagamento === "aniversario") return { erro: "Esta participação usa o bônus de aniversário. Cancele a participação para devolver o bônus durante o mês vigente." };
  // Já confirmada: confirmar de novo é editar o valor (ou o pacote); a data da confirmação original fica
  const edicao = situacao === "pago" && row.pagamento === "pago" && row.situacao !== "cancelada";
  const bloqueio = edicao ? null : transicaoPermitida(row, situacao);
  if (bloqueio) return { erro: bloqueio };

  const dados: Record<string, unknown> = { pagamento: situacao, alterado_por: porId };
  // Trocar a forma de pagamento de uma participação paga com crédito devolve o crédito ao pacote
  if (row.pagamento === "credito" || row.credito_id) {
    await devolverCredito(row, porId, false, "Contribuição alterada pela coordenação");
    dados.credito_id = null;
    if (situacao !== "pago") dados.valor = null;
  }
  if (situacao === "pago") {
    if (!edicao) dados.pago_em = new Date().toISOString();
    if (pacote !== null) { dados.valor = 0; dados.usou_pacote = true; dados.observacao = pacote.obs || null; }
    else {
      if (valor !== null) dados.valor = valor;
      if (row.usou_pacote) { dados.usou_pacote = false; dados.observacao = null; }
    }
  } else {
    dados.pago_em = null;
    if (row.usou_pacote) { dados.usou_pacote = false; dados.observacao = null; }
  }
  // A forma acompanha a confirmação; ao sair de "pago" ela é apagada
  if (situacao === "pago") { if (forma) dados.forma_pagamento = forma; }
  else if (row.forma_pagamento) dados.forma_pagamento = null;
  try {
    await tablesDB.updateRow({ ...base, rowId: inscricaoId, data: dados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // Colunas do pacote ainda não existem no banco (falta rodar a criação delas)
    if (/Unknown attribute/i.test(msg) && /forma_pagamento/.test(msg)) return { erro: "A forma de pagamento ainda não está ativa no banco de dados. Avise o administrador." };
    if (/Unknown attribute/i.test(msg) && /usou_pacote/.test(msg)) return { erro: "O registro de pacote ainda não está ativo no banco de dados. Avise o administrador." };
    throw e;
  }
  await registrarHistorico({
    inscricao_id: inscricaoId, evento_id: eventoId, usuario_id: row.usuario_id,
    acao: { pago: "pagamento_confirmado", isento: "pagamento_isento", pendente: "pagamento_reaberto" }[situacao] as AcaoHistorico,
    pagamento_de: row.pagamento, pagamento_para: situacao, valor: situacao === "pago" ? (pacote !== null ? 0 : (valor ?? row.valor)) : null, por: porId,
  });
  const rotulo = { pago: edicao ? "atualizada" : pacote !== null ? `confirmada (pacote${pacote.obs ? ` ${pacote.obs}` : ""})` : "confirmada", isento: "marcada como isenta", pendente: "marcada como pendente" }[situacao];
  return { ok: `Contribuição ${rotulo}.` };
}
