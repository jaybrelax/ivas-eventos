import "server-only";
import { exigir, getUsuario, pode, type Usuario } from "./auth";
import { PODE } from "./config";
import { getDadosInstituto, getEvento } from "./data";
import { candidaturasDoEvento, ehReuniao, guardioesDaReuniao, temGuarnicao } from "./guarnicao";
import { guardiaoComLeituraGeral, guardiaoEmGestao } from "./gestao-evento";
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

/** Autorização centralizada das ações da Central, incluindo leitores gerais dos guardiões. */
export async function exigirCentral(eventoId: string): Promise<
  { u: Usuario; evento: Evento; gestao: boolean; somenteLeitura?: boolean; erro?: undefined } | { erro: string }
> {
  const atual = await getUsuario();
  if (!atual) return { erro: "Entre novamente para acessar a Central." };
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  if (pode(atual, PODE.editarEventos)) return { u: atual, evento, gestao: true };
  if (await guardiaoEmGestao(atual, evento)) return { u: atual, evento, gestao: true };
  if (await guardiaoComLeituraGeral(atual)) return { u: atual, evento, gestao: false, somenteLeitura: true };
  const guardioes = await guardioesDoEvento(evento);
  if ((evento.mestres ?? []).includes(atual.id) || guardioes.includes(atual.id)) return { u: atual, evento, gestao: false };
  return { erro: "Você não tem acesso à Central deste ritual." };
}
