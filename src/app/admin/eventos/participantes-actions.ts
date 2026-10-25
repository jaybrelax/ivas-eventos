"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getEvento } from "@/lib/data";
import { definirPagamento, incluirParticipante, removerParticipante, type Resultado } from "@/lib/inscricoes";

function revalidar(eventoId: string) {
  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath("/admin/eventos");
  revalidatePath("/admin/pagamentos");
  revalidatePath(`/eventos/${eventoId}`);
  revalidatePath("/minha-conta");
  revalidatePath("/admin/participantes", "layout");
}

/** Coordenador inclui um participante manualmente. */
export async function incluirParticipanteAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await incluirParticipante(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador cancela a participação de alguém (bloqueado se a contribuição já foi confirmada). */
export async function removerParticipanteAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await removerParticipante(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador confirma o pagamento de uma inscrição. */
export async function confirmarPagamentoAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const r = await definirPagamento(inscricaoId, "pago", u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador marca a inscrição como isenta da contribuição. */
export async function isentarPagamentoAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const r = await definirPagamento(inscricaoId, "isento", u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador desfaz a confirmação/isenção, voltando o pagamento para pendente. */
export async function reabrirPagamentoAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const r = await definirPagamento(inscricaoId, "pendente", u.id);
  revalidar(eventoId);
  return r;
}
