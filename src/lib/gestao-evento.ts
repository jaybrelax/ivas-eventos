import "server-only";
import { exigir, pode, type Usuario } from "./auth";
import type { PerfilAdmin } from "./acesso-admin";
import { PODE } from "./config";
import { getEvento, getInstituto } from "./data";
import { dentroDaJanelaDeGestao, lerEscopoMestre, lerRegrasGestaoGuardiao } from "./gestao-guardiao-regras";
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

/** Regras da gestão do ritual pelo guardião, definidas pelo admin em Configurações. */
export async function regrasGestaoGuardiao() {
  return lerRegrasGestaoGuardiao(await getInstituto());
}

/**
 * Guardião escalado neste ritual, dentro do período de gestão (dia do ritual + a duração definida pelo admin):
 * ganha o acesso de gestão daquele evento (financeiro, consumo, central e participantes). Fora disso, nada muda.
 */
export async function guardiaoEmGestao(u: Pick<Usuario, "id" | "funcaoRitual"> | null, evento: Evento): Promise<boolean> {
  if (!u || u.funcaoRitual !== "guardiao") return false;
  if (!dentroDaJanelaDeGestao(evento, await regrasGestaoGuardiao())) return false;
  const { guardioesDoEvento } = await import("./central");
  return (await guardioesDoEvento(evento)).includes(u.id);
}

/** Mestre com a gestão liberada a todos os mestres (escopo "todos" em Configurações). Vale em qualquer ritual, sem prazo. */
export async function mestreLiberado(u: Pick<Usuario, "funcaoRitual"> | null): Promise<boolean> {
  if (!u || u.funcaoRitual !== "mestre") return false;
  return lerEscopoMestre(await getInstituto()) === "todos";
}

/** Gestão do evento por perfil (admin, coordenação, mestre escalado), pelo guardião no período ou pelos mestres liberados. */
export async function podeGerenciarOuGuardiao(u: Usuario | null, evento: Evento): Promise<boolean> {
  return podeGerenciarEvento(u, evento) || (await guardiaoEmGestao(u, evento)) || (await mestreLiberado(u));
}

/** Para ações do painel: somente admin e coordenação podem gerenciar eventos. */
export async function exigirGestaoDoEvento(eventoId: string): Promise<{ u: Usuario & { perfil: PerfilAdmin }; evento: Evento; erro?: undefined } | { erro: string }> {
  const u = await exigir();
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  return { u, evento };
}
