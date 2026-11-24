import "server-only";
import { exigir, getUsuario, pode, type Usuario } from "./auth";
import { PODE } from "./config";
import { getDadosInstituto, getEvento } from "./data";
import { comoUsuarioDePainel, guardiaoEmGestao, podeGerenciarEvento } from "./gestao-evento";
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

/** Para Server Actions: usuário, evento e se ele gerencia o evento — ou um erro se não puder ver a Central. */
export async function exigirCentral(eventoId: string): Promise<
  { u: Usuario & { perfil: NonNullable<Usuario["perfil"]> }; evento: Evento; gestao: boolean; erro?: undefined } | { erro: string }
> {
  const sessao = await getUsuario();
  if (!sessao) await exigir(); // redireciona para o login
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  // Guardião no período de gestão do ritual age como gestão, mesmo sem perfil de painel
  const emGestao = await guardiaoEmGestao(sessao, evento);
  if (!sessao!.perfil && !emGestao) await exigir(); // participante: vai para a própria área
  const u = comoUsuarioDePainel(sessao!);
  const gestao = (!!sessao!.perfil && podeGerenciarEvento(u, evento)) || emGestao;
  if (!gestao && !podeVerCentral(u, evento, await guardioesDoEvento(evento))) return { erro: "Você não faz parte da equipe deste evento." };
  return { u, evento, gestao };
}
