"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE_TEMA, COOKIE_VISAO, contextoGuarnicao, type TemaGuarnicao, type VisaoGuarnicao } from "@/lib/guarnicao-app";
import { getEvento, listarTipos } from "@/lib/data";
import { adicionarGuardiao, ajustarGuarnicao, cancelar, candidatar, removerGuardiao, temGuarnicao, type Resultado } from "@/lib/guarnicao";
import { createAdminClient } from "@/lib/appwrite";
import { DB_ID, INSTITUTO_ROW_ID, TABLES } from "@/lib/config";
import { mapaUsuarios, salvarContato } from "@/lib/usuarios";
import { enviarPush, removerInscricao, salvarInscricao } from "@/lib/push";

/** Alterna entre a visão de coordenador e a de guardião (para quem tem as duas). */
export async function trocarVisao(visao: VisaoGuarnicao) {
  const ctx = await contextoGuarnicao();
  if (!ctx || !ctx.visoes.includes(visao)) return;
  (await cookies()).set(COOKIE_VISAO, visao, { path: "/guarnicao", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/guarnicao");
}

/** Guarda a preferência de tema (claro, escuro ou automático) neste aparelho. */
export async function salvarTema(tema: TemaGuarnicao) {
  if (tema !== "claro" && tema !== "escuro" && tema !== "auto") return;
  (await cookies()).set(COOKIE_TEMA, tema, { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax" });
  revalidatePath("/guarnicao", "layout");
}

function revalidar(eventoId: string) {
  revalidatePath("/guarnicao", "layout");
  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath("/admin/eventos");
  revalidatePath("/admin/guarnicao");
}

async function ritual(eventoId: string) {
  const [evento, tipos] = await Promise.all([getEvento(eventoId), listarTipos()]);
  return { evento, tipo: evento ? tipos.find((t) => t.$id === evento.tipo_id) : undefined };
}

/** Exige a visão de coordenador (perfil admin ou coordenador). */
async function coordenador() {
  const ctx = await contextoGuarnicao();
  return ctx?.visoes.includes("coordenador") ? ctx.u : null;
}

/** Quem pode colocar e retirar guardiões neste ritual: a coordenação, ou um dos mestres do próprio ritual. */
async function escalador(evento: { mestres: string[] | null }) {
  const ctx = await contextoGuarnicao();
  if (!ctx) return null;
  if (ctx.visoes.includes("coordenador")) return ctx.u;
  if (ctx.visoes.includes("mestre") && (evento.mestres ?? []).includes(ctx.u.id)) return ctx.u;
  return null;
}

export async function candidatarGuarnicao(eventoId: string): Promise<Resultado> {
  const ctx = await contextoGuarnicao();
  if (!ctx?.visoes.includes("guardiao")) return { erro: "Só guardiões podem se candidatar." };
  const { evento, tipo } = await ritual(eventoId);
  if (!evento) return { erro: "Ritual não encontrado." };
  const r = await candidatar(evento, tipo, { id: ctx.u.id, funcaoRitual: ctx.u.funcaoRitual, sexo: ctx.u.sexo });
  revalidar(eventoId);
  return r;
}

export async function cancelarGuarnicao(eventoId: string): Promise<Resultado> {
  const ctx = await contextoGuarnicao();
  if (!ctx) return { erro: "Sem acesso." };
  const { evento } = await ritual(eventoId);
  if (!evento) return { erro: "Ritual não encontrado." };
  const r = await cancelar(evento, ctx.u.id);
  revalidar(eventoId);
  return r;
}

export async function colocarGuardiao(eventoId: string, usuarioId: string): Promise<Resultado> {
  const [{ evento, tipo }, usuarios] = await Promise.all([ritual(eventoId), mapaUsuarios()]);
  if (!evento || !temGuarnicao(tipo)) return { erro: "Ritual não encontrado." };
  const u = await escalador(evento);
  if (!u) return { erro: "Só a coordenação ou um mestre deste ritual pode escalar." };
  const alvo = usuarios.get(usuarioId);
  if (!alvo || alvo.funcao !== "guardiao") return { erro: "Escolha uma pessoa com a função Guardião." };
  const r = await adicionarGuardiao(evento, { id: alvo.id, sexo: alvo.sexo }, u.id);
  revalidar(eventoId);
  return r;
}

export async function retirarGuardiao(eventoId: string, usuarioId: string): Promise<Resultado> {
  const { evento, tipo } = await ritual(eventoId);
  if (!evento || !temGuarnicao(tipo)) return { erro: "Ritual não encontrado." };
  const u = await escalador(evento);
  if (!u) return { erro: "Só a coordenação ou um mestre deste ritual pode escalar." };
  const r = await removerGuardiao(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}

export async function ajustarVagas(eventoId: string, mudar: { masculino?: number; feminino?: number; abertas?: boolean }): Promise<Resultado> {
  const u = await coordenador();
  if (!u) return { erro: "Só a coordenação pode mudar as vagas." };
  const { evento, tipo } = await ritual(eventoId);
  if (!evento || !temGuarnicao(tipo)) return { erro: "Ritual não encontrado." };
  const r = await ajustarGuarnicao(evento, mudar, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenação: prazo de cancelamento (horas antes do início) e limite de participações por mês. */
export async function salvarConfigGuarnicao(dados: { horas: number; limiteMes: number }): Promise<Resultado> {
  const u = await coordenador();
  if (!u) return { erro: "Só a coordenação pode mudar as configurações." };
  const horas = Math.round(Number(dados.horas));
  const limite = Math.round(Number(dados.limiteMes));
  if (!Number.isFinite(horas) || horas < 0 || horas > 72) return { erro: "O prazo deve ficar entre 0 e 72 horas." };
  if (!Number.isFinite(limite) || limite < 0 || limite > 31) return { erro: "O limite deve ficar entre 0 e 31 por mês." };
  const { tablesDB } = createAdminClient();
  try {
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.instituto, rowId: INSTITUTO_ROW_ID, data: { guarnicao_horas_cancelamento: horas, guarnicao_limite_mes: limite } });
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}

/** Troca ou remove a foto de perfil pelo menu do cartão do Perfil (mantém o resto do cadastro). */
export async function trocarFotoGuarnicao(form: FormData): Promise<Resultado> {
  const ctx = await contextoGuarnicao();
  if (!ctx) return { erro: "Sem acesso." };
  const dados = new FormData();
  // salvarContato sempre grava o telefone: reenvia o atual para não apagá-lo
  dados.set("telefone", ctx.u.telefone ?? "");
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0) dados.set("foto", foto);
  else if (form.get("remover_foto") === "on") dados.set("remover_foto", "on");
  else return { erro: "Escolha uma foto." };
  const r = await salvarContato(ctx.u.id, dados);
  if (r.erro) return { erro: r.erro };
  revalidatePath("/guarnicao", "layout");
  return { ok: foto instanceof File && foto.size > 0 ? "Foto atualizada." : "Foto removida." };
}

/** Liga as notificações neste aparelho (guarda a inscrição de push do navegador). */
export async function ativarNotificacoes(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<Resultado> {
  const ctx = await contextoGuarnicao();
  if (!ctx) return { erro: "Sem acesso." };
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { erro: "Inscrição inválida." };
  try {
    await salvarInscricao(ctx.u.id, sub);
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível ativar as notificações." };
  }
  return { ok: "Notificações ativadas neste aparelho." };
}

export async function desativarNotificacoes(endpoint: string): Promise<Resultado> {
  const ctx = await contextoGuarnicao();
  if (!ctx) return { erro: "Sem acesso." };
  await removerInscricao(endpoint, ctx.u.id);
  return { ok: "Notificações desativadas neste aparelho." };
}

/** Manda um aviso de teste só para quem pediu (confirma que o aparelho recebe). */
export async function testarNotificacao(): Promise<Resultado> {
  const ctx = await contextoGuarnicao();
  if (!ctx) return { erro: "Sem acesso." };
  const n = await enviarPush([ctx.u.id], { titulo: "Notificações ativadas", corpo: "Você vai receber avisos de vagas, escalas e lembretes dos rituais.", url: "/guarnicao" });
  return n ? { ok: "Aviso de teste enviado." } : { erro: "Nenhum aparelho inscrito recebeu o aviso." };
}
