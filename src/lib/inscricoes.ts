import "server-only";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { listar, listarEventos, listarTipos } from "./data";
import { hoje } from "./format";
import { HORAS_LIMITE_CANCELAMENTO, inicioDe, prazoCancelamento } from "./guarnicao";
import { urlPublicaEvento } from "./links";
import type { Evento, Inscricao, SituacaoInscricao, SituacaoPagamento, TipoEvento } from "./types";

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
  for (const [i, insc] of fila.entries()) {
    const deveSer = i < vagas ? "confirmada" : "espera";
    if (insc.situacao !== deveSer) {
      await tablesDB.updateRow({ ...base, rowId: insc.$id, data: { situacao: deveSer, alterado_por: alteradoPor } });
    }
  }
}

async function entrarNaFila(eventoId: string, usuarioId: string, alteradoPor: string) {
  const { tablesDB } = createAdminClient();
  const existente = await inscricaoDe(eventoId, usuarioId);
  const dados = { situacao: "espera" as const, ordem: Date.now(), alterado_por: alteradoPor };
  if (existente) {
    if (existente.situacao === "confirmada" || existente.situacao === "espera") return { jaEstava: true };
    await tablesDB.updateRow({ ...base, rowId: existente.$id, data: dados });
  } else {
    await tablesDB.createRow({ ...base, rowId: ID.unique(), data: { ...dados, evento_id: eventoId, usuario_id: usuarioId, pagamento: "pendente" } });
  }
  return { jaEstava: false };
}

/** Cancela a inscrição ativa. Com a contribuição já confirmada, não cancela (só depois de reabrir a contribuição). */
async function sairDaFila(eventoId: string, usuarioId: string, alteradoPor: string): Promise<"saiu" | "nao_inscrito" | "pago"> {
  const { tablesDB } = createAdminClient();
  const existente = await inscricaoDe(eventoId, usuarioId);
  if (!existente || (existente.situacao !== "confirmada" && existente.situacao !== "espera")) return "nao_inscrito";
  if (existente.pagamento === "pago") return "pago";
  await tablesDB.updateRow({ ...base, rowId: existente.$id, data: { situacao: "cancelada", alterado_por: alteradoPor } });
  return "saiu";
}

export type Resultado = { ok?: string; erro?: string };

/** A própria pessoa confirma presença. */
export async function inscrever(evento: Evento, tipo: TipoEvento | undefined, usuarioId: string): Promise<Resultado> {
  if (!aceitaParticipantes(tipo)) return { erro: "Este evento não está aberto para inscrição pública." };
  if (evento.candidaturas_abertas === false) return { erro: "As inscrições deste evento estão fechadas." };
  if (inicioDe(evento).getTime() <= Date.now()) return { erro: "Este evento já começou." };
  const r = await entrarNaFila(evento.$id, usuarioId, usuarioId);
  if (r.jaEstava) return { erro: "Você já está inscrito neste evento." };
  await reorganizarInscricoes(evento, usuarioId);
  const minha = await inscricaoDe(evento.$id, usuarioId);
  return minha?.situacao === "confirmada"
    ? { ok: "Participação confirmada!" }
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
  return { ok: "Participação cancelada." };
}

/** Coordenador inclui alguém manualmente (entra na fila como qualquer inscrição). */
export async function incluirParticipante(evento: Evento, usuarioId: string, porId: string): Promise<Resultado> {
  const r = await entrarNaFila(evento.$id, usuarioId, porId);
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
  return { ok: "Participação cancelada." };
}

/** O próprio participante avisa que contribuiu (comprovante opcional); fica aguardando confirmação da coordenação. */
export async function informarPagamento(inscricaoId: string, usuarioId: string, valor: number | null, comprovanteFileId: string | null): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  const row = await tablesDB.getRow({ ...base, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!row || row.usuario_id !== usuarioId) return { erro: "Inscrição não encontrada." };
  if (row.pagamento === "pago") return { erro: "Esta contribuição já foi confirmada." };
  await tablesDB.updateRow({
    ...base, rowId: inscricaoId,
    data: { pagamento: "informado", valor, informado_em: new Date().toISOString(), comprovante_file_id: comprovanteFileId, alterado_por: usuarioId },
  });
  return { ok: "Contribuição informada! A coordenação vai confirmar em breve." };
}

/** O participante avisa que vai contribuir no dia do ritual (ou desfaz o aviso e volta a "pendente"). */
export async function contribuirNaHora(inscricaoId: string, usuarioId: string, desfazer = false): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  const row = await tablesDB.getRow({ ...base, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!row || row.usuario_id !== usuarioId) return { erro: "Inscrição não encontrada." };
  // Só muda enquanto a contribuição não foi informada, confirmada ou isentada
  if (desfazer) {
    if (row.pagamento !== "na_hora") return { erro: "Nada a desfazer." };
    await tablesDB.updateRow({ ...base, rowId: inscricaoId, data: { pagamento: "pendente", alterado_por: usuarioId } });
    return { ok: "Combinado, a escolha foi desfeita." };
  }
  if (row.pagamento !== "pendente" && row.pagamento !== "na_hora") return { erro: "A contribuição desta inscrição já foi resolvida." };
  await tablesDB.updateRow({ ...base, rowId: inscricaoId, data: { pagamento: "na_hora", alterado_por: usuarioId } });
  return { ok: "Combinado! Você contribui na hora, no dia do ritual." };
}

/** Coordenador confirma, isenta ou reabre um pagamento. */
export async function definirPagamento(inscricaoId: string, situacao: "pago" | "isento" | "pendente", porId: string): Promise<Resultado> {
  const { tablesDB } = createAdminClient();
  const dados: Record<string, unknown> = { pagamento: situacao, alterado_por: porId };
  if (situacao === "pago") dados.pago_em = new Date().toISOString();
  await tablesDB.updateRow({ ...base, rowId: inscricaoId, data: dados });
  const rotulo = { pago: "confirmada", isento: "marcada como isenta", pendente: "marcada como pendente" }[situacao];
  return { ok: `Contribuição ${rotulo}.` };
}
