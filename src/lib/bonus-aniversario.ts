import "server-only";
import { AppwriteException, ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { devolverCredito } from "./creditos";
import { consomeCredito } from "./creditos-regras";
import { getEvento, listar, listarTipos } from "./data";
import { anoDoBonus, chaveBonusAniversario, podeUsarBonusAniversario } from "./bonus-aniversario-regras";
import { hoje } from "./format";
import { inicioDe } from "./guarnicao";
import { registrarHistorico } from "./historico-inscricoes";
import type { Evento, Inscricao, TipoEvento } from "./types";

export type BonusAniversario = {
  $id: string;
  chave: string;
  usuario_id: string;
  ano: number;
  situacao: "disponivel" | "utilizado" | "expirado";
  evento_id: string | null;
  inscricao_id: string | null;
  utilizado_em: string | null;
  trava: number | null;
  $createdAt: string;
  $updatedAt: string;
};

export type BonusAniversarioDisponivel = { disponivel: boolean; mesNome: string | null };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const base = { databaseId: DB_ID, tableId: TABLES.bonusAniversario };
const db = () => createAdminClient().tablesDB;

function nascimentoDasPrefs(prefs: unknown) {
  const valor = (prefs as { data_nascimento?: unknown } | null)?.data_nascimento;
  return typeof valor === "string" ? valor : null;
}

function mesNome(nascimento: string | null | undefined) {
  const n = /^(?:\d{4})-(\d{2})-\d{2}$/.exec(nascimento ?? "");
  return n ? MESES[Number(n[1]) - 1] ?? null : null;
}

async function bonusDoAno(usuarioId: string, ano: number) {
  const linhas = await listar<BonusAniversario>(TABLES.bonusAniversario, [Query.equal("chave", chaveBonusAniversario(usuarioId, ano)), Query.limit(1)]);
  return linhas[0] ?? null;
}

function elegivel(nascimento: string | null | undefined, evento: Evento, tipo: TipoEvento | undefined, dataHoje = hoje()) {
  return podeUsarBonusAniversario({ nascimento, dataEvento: evento.data, hoje: dataHoje, ritualElegivel: consomeCredito(tipo) });
}

/** Dados mínimos para renderizar a opção no ritual, sem criar um registro de bônus prematuramente. */
export async function bonusAniversarioDisponivel(
  usuario: { id: string; dataNascimento: string | null }, evento: Evento, tipo: TipoEvento | undefined,
): Promise<BonusAniversarioDisponivel> {
  const dataHoje = hoje();
  if (!elegivel(usuario.dataNascimento, evento, tipo, dataHoje)) return { disponivel: false, mesNome: mesNome(usuario.dataNascimento) };
  const ano = anoDoBonus(dataHoje);
  if (!ano) return { disponivel: false, mesNome: mesNome(usuario.dataNascimento) };
  try {
    const bonus = await bonusDoAno(usuario.id, ano);
    return { disponivel: !bonus || bonus.situacao === "disponivel", mesNome: mesNome(usuario.dataNascimento) };
  } catch (e) {
    // A página pública continua funcional enquanto a migração ainda não foi executada.
    if (e instanceof AppwriteException && e.code === 404) return { disponivel: false, mesNome: mesNome(usuario.dataNascimento) };
    throw e;
  }
}

/** Resumo para Minha conta: só aparece no mês de aniversário e não cria nenhum registro novo. */
export async function resumoBonusAniversario(usuario: { id: string; dataNascimento: string | null }) {
  const dataHoje = hoje();
  const mes = mesNome(usuario.dataNascimento);
  if (!mes || usuario.dataNascimento?.slice(5, 7) !== dataHoje.slice(5, 7)) return null;
  const ano = anoDoBonus(dataHoje);
  if (!ano) return null;
  try {
    const bonus = await bonusDoAno(usuario.id, ano);
    return { disponivel: !bonus || bonus.situacao === "disponivel", utilizado: bonus?.situacao === "utilizado", mesNome: mes };
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return null;
    throw e;
  }
}

/** Verifica se se deve aguardar a escolha do participante antes de gastar um crédito de pacote automaticamente. */
export async function deveAguardarEscolhaDoBonus(usuarioId: string, evento: Evento, tipo: TipoEvento | undefined) {
  try {
    const { users } = createAdminClient();
    const usuario = await users.get({ userId: usuarioId });
    const bonus = await bonusAniversarioDisponivel({ id: usuarioId, dataNascimento: nascimentoDasPrefs(usuario.prefs) }, evento, tipo);
    return bonus.disponivel;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return false;
    throw e;
  }
}

async function reservarBonus(usuarioId: string, ano: number) {
  let bonus = await bonusDoAno(usuarioId, ano);
  if (!bonus) {
    try {
      const rowId = ID.unique();
      await db().createRow({ ...base, rowId, data: {
        chave: chaveBonusAniversario(usuarioId, ano), usuario_id: usuarioId, ano, situacao: "disponivel", trava: 1,
      } });
      bonus = await db().getRow({ ...base, rowId }) as unknown as BonusAniversario;
    } catch (e) {
      if (!(e instanceof AppwriteException && e.code === 409)) throw e;
      bonus = await bonusDoAno(usuarioId, ano);
    }
  }
  if (!bonus) return { erro: "Não foi possível preparar o bônus agora. Tente novamente." } as const;
  if (bonus.situacao === "utilizado") return { erro: "Seu bônus de aniversário deste ano já foi utilizado." } as const;
  if (bonus.situacao === "expirado") return { erro: "O prazo do bônus de aniversário deste ano terminou." } as const;
  try {
    await db().decrementRowColumn({ ...base, rowId: bonus.$id, column: "trava", value: 1, min: 0 });
  } catch (e) {
    if (e instanceof AppwriteException && (e.code === 400 || e.code === 409)) {
      const atual = await bonusDoAno(usuarioId, ano);
      return { erro: atual?.situacao === "utilizado" ? "Seu bônus de aniversário deste ano já foi utilizado." : "Seu bônus está sendo aplicado. Aguarde um instante e atualize a página." } as const;
    }
    throw e;
  }
  const travado = await db().getRow({ ...base, rowId: bonus.$id }) as unknown as BonusAniversario;
  if (travado.situacao !== "disponivel") return { erro: "Seu bônus de aniversário deste ano já foi utilizado." } as const;
  return { bonus: travado } as const;
}

async function soltarBonus(bonusId: string) {
  await db().updateRow({ ...base, rowId: bonusId, data: { trava: 1 } }).catch(() => {});
}

/** Aplica o benefício sem criar movimento financeiro ou afetar saldo de pacotes. */
async function aplicarBonusAniversario(
  inscricao: Inscricao,
  usuario: { id: string; dataNascimento: string | null },
  porId: string,
  /** O painel pode regularizar uma inscrição mesmo depois do início; o fluxo público continua bloqueado. */
  permitirAposInicio = false,
) {
  if (inscricao.situacao !== "confirmada") return { erro: "O bônus pode ser usado quando sua vaga estiver confirmada." };
  if (inscricao.pagamento === "aniversario") return { ok: "Seu bônus de aniversário já está aplicado nesta participação." };
  if (inscricao.pagamento === "pago" || inscricao.pagamento === "isento" || inscricao.pagamento === "informado") return { erro: "Esta contribuição já foi resolvida e não pode ser trocada pelo bônus." };

  const [evento, tipos] = await Promise.all([getEvento(inscricao.evento_id), listarTipos()]);
  const tipo = evento ? tipos.find((t) => t.$id === evento.tipo_id) : undefined;
  if (!evento || !elegivel(usuario.dataNascimento, evento, tipo)) return { erro: "O bônus só vale durante o mês do seu aniversário, em rituais desse mesmo mês." };
  if (!permitirAposInicio && inicioDe(evento).getTime() <= Date.now()) return { erro: "O ritual já começou." };
  const ano = anoDoBonus(hoje());
  if (!ano) return { erro: "Não foi possível identificar o período do bônus." };

  const reserva = await reservarBonus(usuario.id, ano);
  if ("erro" in reserva) return reserva;
  const bonus = reserva.bonus;
  try {
    if (inscricao.credito_id) await devolverCredito(inscricao, porId, false, "Trocado por bônus de aniversário");
    await db().updateRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: inscricao.$id, data: {
      pagamento: "aniversario", valor: 0, informado_em: null, pago_em: null, comprovante_file_id: null,
      credito_id: null, forma_pagamento: null, bonus_aniversario_id: bonus.$id, alterado_por: porId,
    } });
    await db().updateRow({ ...base, rowId: bonus.$id, data: {
      situacao: "utilizado", evento_id: evento.$id, inscricao_id: inscricao.$id, utilizado_em: new Date().toISOString(), trava: 0,
    } });
    await registrarHistorico({ inscricao_id: inscricao.$id, evento_id: evento.$id, usuario_id: usuario.id, acao: "bonus_aniversario_usado", pagamento_de: inscricao.pagamento, pagamento_para: "aniversario", valor: 0, por: porId });
    return { ok: "Bônus de aniversário aplicado! Sua participação está confirmada." };
  } catch (e) {
    await soltarBonus(bonus.$id);
    throw e;
  }
}

/** Aplica o bônus do próprio participante. */
export async function usarBonusAniversario(inscricaoId: string, usuario: { id: string; dataNascimento: string | null }) {
  const inscricao = await db().getRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!inscricao || inscricao.usuario_id !== usuario.id) return { erro: "Inscrição não encontrada." };
  return aplicarBonusAniversario(inscricao, usuario, usuario.id);
}

/** A coordenação aplica o bônus a um participante elegível da inscrição. A permissão é verificada na Server Action chamadora. */
export async function bonificarParticipanteAniversario(inscricaoId: string, porId: string) {
  const inscricao = await db().getRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: inscricaoId }).catch(() => null) as unknown as Inscricao | null;
  if (!inscricao) return { erro: "Inscrição não encontrada." };
  try {
    const { users } = createAdminClient();
    const participante = await users.get({ userId: inscricao.usuario_id });
    return aplicarBonusAniversario(inscricao, { id: inscricao.usuario_id, dataNascimento: nascimentoDasPrefs(participante.prefs) }, porId, true);
  } catch (e) {
    console.error("Bonificar aniversário:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível consultar o bônus de aniversário deste participante." };
  }
}

/** Devolve o bônus ao cancelar a participação. Fora do mês, ele permanece expirado. */
export async function devolverBonusAniversario(inscricao: Pick<Inscricao, "$id" | "usuario_id" | "evento_id" | "bonus_aniversario_id">, porId: string) {
  if (!inscricao.bonus_aniversario_id) return false;
  const bonus = await db().getRow({ ...base, rowId: inscricao.bonus_aniversario_id }).catch(() => null) as unknown as BonusAniversario | null;
  if (!bonus || bonus.inscricao_id !== inscricao.$id || bonus.situacao !== "utilizado") return false;
  const evento = await getEvento(inscricao.evento_id);
  const dataHoje = hoje();
  const aindaNoMes = !!evento && evento.data.slice(5, 7) === dataHoje.slice(5, 7) && evento.data.slice(0, 4) === dataHoje.slice(0, 4);
  const situacao = aindaNoMes ? "disponivel" : "expirado";
  await db().updateRow({ ...base, rowId: bonus.$id, data: {
    situacao, evento_id: null, inscricao_id: null, utilizado_em: null, trava: aindaNoMes ? 1 : 0,
  } });
  await registrarHistorico({ inscricao_id: inscricao.$id, evento_id: inscricao.evento_id, usuario_id: inscricao.usuario_id, acao: "bonus_aniversario_devolvido", pagamento_de: "aniversario", pagamento_para: "pendente", valor: 0, por: porId });
  return true;
}

