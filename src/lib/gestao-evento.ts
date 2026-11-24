import "server-only";
import { exigir, pode, type Usuario } from "./auth";
import { PODE } from "./config";
import { getEvento } from "./data";
import type { Evento } from "./types";

/**
 * Quem gerencia um evento específico: admin e coordenação (todos os eventos) ou o mestre
 * escalado nele (só aquele evento). Vale para editar o evento, participantes, contribuições,
 * guardiões e mestres. Excluir e numerar continuam com as permissões próprias.
 */
export function podeGerenciarEvento(u: Pick<Usuario, "id" | "perfil"> | null, evento: Pick<Evento, "mestres">): boolean {
  if (!u?.perfil) return false;
  return pode(u, PODE.editarEventos) || (evento.mestres ?? []).includes(u.id);
}

/** Isentar a contribuição: o Admin e o mestre escalado neste evento. Coordenador comum não isenta. */
export function podeIsentarContribuicao(u: Pick<Usuario, "id" | "perfil"> | null, evento: Pick<Evento, "mestres">): boolean {
  if (!u?.perfil) return false;
  return u.perfil === "admin" || (evento.mestres ?? []).includes(u.id);
}

/** Para Server Actions: devolve o usuário e o evento, ou um erro se ele não puder gerenciar este evento. */
export async function exigirGestaoDoEvento(eventoId: string): Promise<{ u: Usuario & { perfil: NonNullable<Usuario["perfil"]> }; evento: Evento; erro?: undefined } | { erro: string }> {
  const u = await exigir();
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  if (!podeGerenciarEvento(u, evento)) return { erro: "Você não tem permissão para gerenciar este evento." };
  return { u, evento };
}
