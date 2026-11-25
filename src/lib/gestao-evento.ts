import "server-only";
import { redirect } from "next/navigation";
import { exigir, getUsuario, pode, type Usuario } from "./auth";
import { PODE, type Perfil } from "./config";
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

/** Guardião sem perfil de painel passa a agir como perfil "normal" no evento em que está em gestão. */
export function comoUsuarioDePainel(u: Usuario): Usuario & { perfil: Perfil } {
  return { ...u, perfil: u.perfil ?? "normal" };
}

/**
 * Página do evento: devolve o usuário e se ele está ali como guardião em gestão. Quem não tem perfil de painel
 * e não está em gestão neste evento é mandado para a própria área (como antes).
 */
export async function acessoAoEvento(u: Usuario, evento: Evento): Promise<{ u: Usuario & { perfil: Perfil }; emGestao: boolean }> {
  const emGestao = !(u.perfil && podeGerenciarEvento(u, evento)) && ((await guardiaoEmGestao(u, evento)) || (await mestreLiberado(u)));
  if (!u.perfil && !emGestao) await exigir(); // redireciona
  return { u: comoUsuarioDePainel(u), emGestao };
}

/**
 * Para Server Actions: devolve o usuário e o evento, ou um erro se ele não puder gerenciar este evento.
 * `guardiao: false` deixa de fora o guardião em gestão (editar o evento e a escala continuam com coordenação e mestres).
 */
export async function exigirGestaoDoEvento(eventoId: string, opcoes: { guardiao?: boolean } = {}): Promise<{ u: Usuario & { perfil: NonNullable<Usuario["perfil"]> }; evento: Evento; erro?: undefined } | { erro: string }> {
  const u = await getUsuario();
  if (!u) redirect("/login");
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  if (u.perfil && podeGerenciarEvento(u, evento)) return { u: comoUsuarioDePainel(u), evento };
  if (opcoes.guardiao !== false && ((await guardiaoEmGestao(u, evento)) || (await mestreLiberado(u)))) return { u: comoUsuarioDePainel(u), evento };
  if (!u.perfil) await exigir(); // participante sem gestão: vai para a própria área
  return { erro: "Você não tem permissão para gerenciar este evento." };
}
