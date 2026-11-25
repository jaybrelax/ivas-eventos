import "server-only";
import { exigir, pode, type Usuario } from "./auth";
import { PODE } from "./config";
import { getDadosInstituto, getEvento } from "./data";
import { candidaturasDoEvento, ehReuniao, guardioesDaReuniao, temGuarnicao } from "./guarnicao";
import type { Evento } from "./types";

/**
 * Acesso à Central de informações do evento: admin e coordenação (todos os eventos), mestres escalados
 * e os guardiões daquele ritual (confirmados na guarnição ou escalados na reunião). Todos veem e publicam.
 */

/** Guardiões que fazem parte deste evento. */
export async function guardioesDoEvento(evento: Evento): Promise<string[]> {
  const { tipos } = await getDadosInstituto();
  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  if (ehReuniao(tipo)) return guardioesDaReuniao(evento);
  if (!temGuarnicao(tipo)) return [];
  const candidaturas = await candidaturasDoEvento(evento.$id);
  return candidaturas.filter((c) => c.situacao === "confirmada").map((c) => c.usuario_id);
}

export function podeVerCentral(u: Pick<Usuario, "id" | "perfil"> | null, evento: Pick<Evento, "mestres">, guardioes: string[]): boolean {
  if (!u?.perfil) return false;
  return pode(u, PODE.editarEventos) || (evento.mestres ?? []).includes(u.id) || guardioes.includes(u.id);
}

/** Para Server Actions da área administrativa: somente admin e coordenação. */
export async function exigirCentral(eventoId: string): Promise<
  { u: Usuario & { perfil: NonNullable<Usuario["perfil"]> }; evento: Evento; gestao: boolean; erro?: undefined } | { erro: string }
> {
  const u = await exigir();
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  return { u, evento, gestao: true };
}
