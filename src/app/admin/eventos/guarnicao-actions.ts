"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/auth";
import { exigirGestaoDoEvento } from "@/lib/gestao-evento";
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
  // Mesmas travas do app da Guarnição: suspenso, aprovação pendente ou cargo retirado não se candidata.
  if (u.suspensoAte) return { erro: "Suas candidaturas estão suspensas. Fale com a coordenação." };
  if (u.aprovacaoPendente || u.cargoRemovido) return { erro: "Seu acesso à guarnição não está ativo. Fale com a coordenação." };
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

/** Coordenação (ou o mestre do evento) inclui um guardião. */
export async function adicionarGuardiaoAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId, { guardiao: false });
  if (g.erro !== undefined) return { erro: g.erro };
  const { u, evento } = g;
  const usuarios = await mapaUsuarios();
  const alvo = usuarios.get(usuarioId);
  if (!alvo || alvo.funcao !== "guardiao") return { erro: "Escolha uma pessoa com a função Guardião." };
  const r = await adicionarGuardiao(evento, { id: alvo.id, sexo: alvo.sexo }, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenação (ou o mestre do evento) retira um guardião. */
export async function removerGuardiaoAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const g = await exigirGestaoDoEvento(eventoId, { guardiao: false });
  if (g.erro !== undefined) return { erro: g.erro };
  const { u, evento } = g;
  const r = await removerGuardiao(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}
