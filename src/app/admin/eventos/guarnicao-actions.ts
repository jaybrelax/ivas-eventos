"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getEvento, listarTipos } from "@/lib/data";
import { adicionarGuardiao, cancelar, candidatar, removerGuardiao, type Resultado } from "@/lib/guarnicao";
import { mapaUsuarios } from "@/lib/usuarios";

async function contexto(eventoId: string) {
  const [evento, tipos] = await Promise.all([getEvento(eventoId), listarTipos()]);
  return { evento, tipo: evento ? tipos.find((t) => t.$id === evento.tipo_id) : undefined };
}

function revalidar(eventoId: string) {
  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath("/admin/eventos");
  revalidatePath("/admin/guarnicao");
  revalidatePath("/admin/perfil");
  revalidatePath("/admin/usuarios");
}

/** Guardião se candidata a uma vaga. */
export async function candidatarAction(eventoId: string): Promise<Resultado> {
  const u = await exigir();
  const { evento, tipo } = await contexto(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await candidatar(evento, tipo, { id: u.id, funcaoRitual: u.funcaoRitual, sexo: u.sexo });
  revalidar(eventoId);
  return r;
}

/** Guardião cancela a própria participação (até 4 h antes). */
export async function cancelarAction(eventoId: string): Promise<Resultado> {
  const u = await exigir();
  const { evento } = await contexto(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await cancelar(evento, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador inclui um guardião no evento. */
export async function adicionarGuardiaoAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const [{ evento }, usuarios] = await Promise.all([contexto(eventoId), mapaUsuarios()]);
  if (!evento) return { erro: "Evento não encontrado." };
  const alvo = usuarios.get(usuarioId);
  if (!alvo || alvo.funcao !== "guardiao") return { erro: "Escolha uma pessoa com a função Guardião." };
  const r = await adicionarGuardiao(evento, { id: alvo.id, sexo: alvo.sexo }, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador retira um guardião do evento. */
export async function removerGuardiaoAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const { evento } = await contexto(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await removerGuardiao(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}
