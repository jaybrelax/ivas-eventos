"use server";

import { revalidatePath } from "next/cache";
import { exigirGestaoDoEvento } from "@/lib/gestao-evento";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { COMPROVANTES_BUCKET_ID, DB_ID, LABEL_PARTICIPANTE, TABLES } from "@/lib/config";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { conferirImagem } from "@/lib/imagem";
import { lerDosesEquipe, validarDoses } from "@/lib/doses";
import { candidaturasDoEvento } from "@/lib/guarnicao";
import { listar } from "@/lib/data";
import type { Inscricao } from "@/lib/types";
import { ehParticipante, salvarContato } from "@/lib/usuarios";
import { definirPagamento, incluirParticipante, removerParticipante, type Resultado } from "@/lib/inscricoes";
import { lerValor } from "@/lib/pagamento-regras";

function revalidar(eventoId: string) {
  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath("/admin/eventos");
  revalidatePath("/admin/pagamentos");
  revalidatePath(`/eventos/${eventoId}`);
  revalidatePath("/minha-conta");
  revalidatePath("/admin/participantes", "layout");
}

/** Coordenação (ou o mestre do evento) inclui um participante manualmente. */
export async function incluirParticipanteAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { u, evento } = g;
  const r = await incluirParticipante(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}

/**
 * Inclui alguém que ainda não tem cadastro: cria uma conta só com o nome (sem e-mail nem senha, então
 * não entra no sistema), marcada como participante e "avulso", e inscreve no evento. Assim a pessoa
 * aparece em todas as listas e contribuições como qualquer outra.
 */
export async function incluirAvulsoAction(eventoId: string, nomeBruto: string): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { u, evento } = g;
  const nome = String(nomeBruto ?? "").trim().replace(/\s+/g, " ").slice(0, 128);
  if (nome.length < 3) return { erro: "Digite o nome da pessoa (pelo menos 3 letras)." };

  const { users } = createAdminClient();
  let userId: string | null = null;
  try {
    const conta = await users.create({ userId: ID.unique(), name: nome });
    userId = conta.$id;
    await users.updateLabels({ userId, labels: [LABEL_PARTICIPANTE, "avulso"] });
    await users.updatePrefs({ userId, prefs: { avulso: true, funcao_ritual: "nenhuma", incluido_por: u.id } });
  } catch (e) {
    if (userId) await users.delete({ userId }).catch(() => {});
    console.error("Incluir sem cadastro:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível incluir agora. Tente de novo." };
  }
  const r = await incluirParticipante(evento, userId, u.id);
  if (r.erro) await users.delete({ userId }).catch(() => {});
  revalidar(eventoId);
  return r.erro ? r : { ok: r.ok?.replace("Participante incluído", `${nome} incluído(a) sem cadastro`) ?? "Incluído." };
}

/** Coordenação (ou o mestre do evento) cancela a participação de alguém (bloqueado se a contribuição já foi confirmada). */
export async function removerParticipanteAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { u, evento } = g;
  const r = await removerParticipante(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenação (ou o mestre do evento) confirma o pagamento de uma inscrição, com o valor recebido (vazio mantém o valor informado). */
export async function confirmarPagamentoAction(eventoId: string, inscricaoId: string, valorBruto?: unknown): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { u } = g;
  const lido = lerValor(valorBruto);
  if ("erro" in lido) return { erro: lido.erro };
  const r = await definirPagamento(eventoId, inscricaoId, "pago", u.id, lido.valor);
  revalidar(eventoId);
  return r;
}

/** Coordenação (ou o mestre do evento) marca a inscrição como isenta da contribuição. */
export async function isentarPagamentoAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { u } = g;
  const r = await definirPagamento(eventoId, inscricaoId, "isento", u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenação (ou o mestre do evento) desfaz a confirmação/isenção, voltando o pagamento para pendente. */
export async function reabrirPagamentoAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { u } = g;
  const r = await definirPagamento(eventoId, inscricaoId, "pendente", u.id);
  revalidar(eventoId);
  return r;
}

/**
 * Coordenação (ou o mestre do evento) informa os dados de contato de um participante inscrito
 * neste evento: nome, e-mail, WhatsApp, cidade/estado e CPF. Útil para quem foi incluído sem cadastro.
 * Trocar um e-mail que já existe continua só com o Admin (o "esqueci a senha" iria para o novo endereço).
 */
export async function informarDadosAction(eventoId: string, usuarioId: string, form: FormData): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { u } = g;

  const inscrito = await listar<Inscricao>(TABLES.inscricoes, [Query.equal("evento_id", eventoId), Query.equal("usuario_id", usuarioId), Query.limit(1)]);
  if (!inscrito.length) return { erro: "Essa pessoa não está inscrita neste evento." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };
  const nome = form.has("nome") ? String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 128) : null;
  if (nome !== null && nome.length < 3) return { erro: "Informe o nome (pelo menos 3 letras)." };

  const { users } = createAdminClient();
  try {
    const conta = await users.get({ userId: usuarioId });
    if (!ehParticipante(conta.labels)) return { erro: "Só é possível informar dados de participantes." };
    if (nome && nome !== conta.name) await users.updateName({ userId: usuarioId, name: nome });
    const atual = (conta.email ?? "").toLowerCase();
    if (email && email !== atual) {
      if (atual && u.perfil !== "admin") return { erro: "Só o Admin pode trocar um e-mail já cadastrado." };
      try {
        await users.updateEmail({ userId: usuarioId, email });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        return { erro: msg.includes("already") || msg.includes("exists") ? "Já existe outra conta com esse e-mail." : "Não foi possível salvar o e-mail." };
      }
    }
  } catch (e) {
    console.error("Informar dados:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível salvar agora. Tente de novo." };
  }

  // Só os campos de contato: o resto da ficha fica como está
  const contato = new FormData();
  for (const k of ["telefone", "estado", "cidade", "cpf"]) contato.set(k, String(form.get(k) ?? ""));
  const r = await salvarContato(usuarioId, contato);
  if (r.erro) return { erro: r.erro };
  revalidar(eventoId);
  return { ok: "Dados do participante salvos." };
}

/**
 * Coordenação (ou o mestre do evento) anexa ou troca o comprovante de uma inscrição: foto da galeria
 * ou da câmera, reduzida no navegador antes do envio. Não muda a situação da contribuição: quem
 * anexa confirma, isenta ou reabre depois, se quiser. O comprovante anterior é apagado.
 */
export async function anexarComprovanteAction(eventoId: string, inscricaoId: string, form: FormData): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };

  const arquivo = form.get("comprovante");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem do comprovante." };
  const invalida = conferirImagem(arquivo, "comprovante");
  if (invalida) return { erro: invalida };

  const { tablesDB, storage } = createAdminClient();
  const row = (await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: inscricaoId }).catch(() => null)) as unknown as Inscricao | null;
  if (!row || row.evento_id !== eventoId) return { erro: "Inscrição não encontrada neste evento." };
  if (row.situacao === "cancelada") return { erro: "Esta inscrição foi cancelada." };

  let novoId: string;
  try {
    const novo = await storage.createFile({
      bucketId: COMPROVANTES_BUCKET_ID, fileId: ID.unique(), file: (await arquivoOtimizado(arquivo, arquivo.name, "comprovante")).input,
    });
    novoId = novo.$id;
  } catch (e) {
    console.error("Anexar comprovante:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível enviar o comprovante. Use PNG, JPG ou WEBP." };
  }
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: inscricaoId, data: { comprovante_file_id: novoId, alterado_por: g.u.id } });
  if (row.comprovante_file_id) await storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: row.comprovante_file_id }).catch(() => {});
  revalidar(eventoId);
  return { ok: "Comprovante anexado." };
}

/**
 * Coordenação (ou o mestre do evento) registra as doses consumidas na participação: 1ª, 2ª e,
 * se houver, 3ª, cada uma de 0 a 70 ml. Grava em JSON na inscrição.
 */
export async function salvarDosesAction(eventoId: string, inscricaoId: string, entrada: unknown): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const lido = validarDoses(entrada);
  if ("erro" in lido) return { erro: lido.erro };

  const { tablesDB } = createAdminClient();
  const row = (await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: inscricaoId }).catch(() => null)) as unknown as Inscricao | null;
  if (!row || row.evento_id !== eventoId) return { erro: "Inscrição não encontrada neste evento." };
  if (row.situacao === "cancelada") return { erro: "Esta inscrição foi cancelada." };
  try {
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: inscricaoId, data: { doses: JSON.stringify(lido.doses), alterado_por: g.u.id } });
  } catch (e) {
    console.error("Salvar doses:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível salvar as doses agora." };
  }
  revalidar(eventoId);
  return { ok: "Dosagem salva." };
}

/**
 * Doses de quem é da equipe do ritual (mestres e guardiões escalados), que não tem inscrição:
 * ficam no próprio evento, por pessoa. Mesmas regras e mesma permissão das doses da inscrição.
 */
export async function salvarDosesEquipeAction(eventoId: string, usuarioId: string, entrada: unknown): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const lido = validarDoses(entrada);
  if ("erro" in lido) return { erro: lido.erro };

  // Só quem está escalado neste evento
  const candidaturas = await candidaturasDoEvento(eventoId);
  const escalados = new Set([
    ...(g.evento.mestres ?? []), ...(g.evento.guardioes ?? []), ...(g.evento.guardioes_escalados_reuniao ?? []),
    ...candidaturas.filter((c) => c.situacao === "confirmada").map((c) => c.usuario_id),
  ]);
  if (!escalados.has(usuarioId)) return { erro: "Essa pessoa não está na equipe deste ritual." };

  const { tablesDB } = createAdminClient();
  try {
    // Lê o valor mais recente imediatamente antes de gravar (outras pessoas da equipe podem ter mudado)
    const atual = (await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: eventoId })) as unknown as { doses_equipe?: string | null };
    const todas = lerDosesEquipe(atual.doses_equipe);
    if (lido.doses.some((d) => d.ml > 0)) todas[usuarioId] = lido.doses;
    else delete todas[usuarioId];
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: eventoId, data: { doses_equipe: JSON.stringify(todas), atualizado_por: g.u.id } });
  } catch (e) {
    console.error("Salvar doses da equipe:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível salvar as doses agora." };
  }
  revalidar(eventoId);
  return { ok: "Dosagem salva." };
}
