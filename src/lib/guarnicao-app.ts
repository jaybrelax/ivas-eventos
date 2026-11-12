import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUsuario, podeSolicitarGuarnicao, type Usuario } from "./auth";
import { getDadosInstituto, listarEventos } from "./data";
import { candidaturasDosEventos, guardioesDaReuniao, comEquipeAutomatica, ehReuniao, inicioDe, registrosDasReunioes, temAppGuarnicao, vagasDe } from "./guarnicao";
import { hoje } from "./format";
import { mapaUsuarios } from "./usuarios";
import type { Endereco, Evento, Sexo, SituacaoCandidatura } from "./types";

/**
 * Quem entra no app da Guarnição e com qual visão:
 * - coordenador: perfil admin ou coordenador (escala, vagas, estatísticas gerais);
 * - guardião: função ritual = guardião (candidata-se às vagas e acompanha o próprio histórico);
 * - mestre: função ritual = mestre (vê os rituais, não se candidata e escala guardiões só nos rituais que conduz).
 * Quem tem mais de uma alterna em Perfil; a escolha fica num cookie.
 */
export type VisaoGuarnicao = "coordenador" | "guardiao" | "mestre";
export const COOKIE_VISAO = "ivas-guarnicao-visao";

/** Tema do app: claro, escuro ou automático (segue o celular). */
export type TemaGuarnicao = "claro" | "escuro" | "auto";
export const COOKIE_TEMA = "ivas-guarnicao-tema";

export async function temaGuarnicao(): Promise<TemaGuarnicao> {
  const t = (await cookies()).get(COOKIE_TEMA)?.value;
  return t === "claro" || t === "escuro" ? t : "auto";
}

/** Classe CSS do tema (ver o fim de globals.css). */
export function classeTema(t: TemaGuarnicao) {
  return t === "escuro" ? "tema-escuro" : t === "auto" ? "tema-auto" : "";
}

export type ContextoGuarnicao = { u: Usuario; visoes: VisaoGuarnicao[]; visao: VisaoGuarnicao };

export function visoesDe(u: Pick<Usuario, "perfil" | "funcaoRitual">): VisaoGuarnicao[] {
  const v: VisaoGuarnicao[] = [];
  if (u.perfil === "admin" || u.perfil === "coordenador") v.push("coordenador");
  if (u.funcaoRitual === "guardiao") v.push("guardiao");
  // A coordenação já pode tudo o que o mestre pode: a visão de mestre é só para quem não é da coordenação
  if (u.funcaoRitual === "mestre" && !v.includes("coordenador")) v.push("mestre");
  return v;
}

/** Sessão + visões do app. Sem login vai para o login (voltando para cá); sem acesso devolve `null`. */
export async function contextoGuarnicao(next = "/guarnicao"): Promise<ContextoGuarnicao | null> {
  const u = await getUsuario();
  if (!u) redirect(`/login-guarnicao?next=${encodeURIComponent(next)}`);
  if (u.aprovacaoPendente) redirect("/aguardando-aprovacao");
  if (u.cadastroIncompleto) redirect(`/cadastro-guarnicao?completar=1&next=${encodeURIComponent(next)}`);
  const visoes = visoesDe(u);
  if (!visoes.length && podeSolicitarGuarnicao(u)) redirect(`/cadastro-guarnicao?completar=1&next=${encodeURIComponent(next)}`);
  if (!visoes.length) return null;
  const salva = (await cookies()).get(COOKIE_VISAO)?.value as VisaoGuarnicao | undefined;
  const visao = salva && visoes.includes(salva) ? salva : visoes[0];
  return { u, visoes, visao };
}

// ───────── Dados dos rituais com a situação das vagas ─────────

export type RitualGuarnicao = {
  evento: Evento;
  local: string | null;
  vagas: Record<Sexo, number>;
  confirmados: Record<Sexo, number>;
  /** Quem ocupa as vagas (para mostrar as fotos nos círculos). */
  escalados: Record<Sexo, { id: string; nome: string; foto: string | null }[]>;
  espera: number;
  /** Situação de quem está vendo (guardião), se já se candidatou. */
  minha: SituacaoCandidatura | null;
  /** Ainda dá para se candidatar (aberto e não começou). */
  aberto: boolean;
  /** Reunião: sem vagas; vale a presença de todos os guardiões. */
  reuniao: boolean;
  /** Reunião: quem marcou presença. */
  presentes: { id: string; nome: string; foto: string | null }[];
  /** Reunião: quantos justificaram a ausência. */
  justificados: number;
  /** Reunião: guardiões e mestres ativos que não confirmaram nem justificaram. */
  semResposta: number;
};

/**
 * Rituais com vagas por gênero, confirmados e espera. Por padrão, os próximos (até `dias` à frente);
 * com `anteriores`, os que já aconteceram no último ano, do mais recente ao mais antigo.
 */
export async function rituaisComVagas(usuarioId: string | null, dias = 120, anteriores = false, maximo?: number): Promise<RitualGuarnicao[]> {
  const hj = hoje();
  const deslocar = (n: number) => new Date(Date.parse(`${hj}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const [{ tipos, enderecos }, eventos] = await Promise.all([
    getDadosInstituto(),
    anteriores ? listarEventos({ inicio: deslocar(-365), fim: hj }) : listarEventos({ inicio: hj, fim: deslocar(dias) }),
  ]);
  const ritual = new Set(tipos.filter((t) => temAppGuarnicao(t)).map((t) => t.$id));
  const reunioes = new Set(tipos.filter((t) => ehReuniao(t)).map((t) => t.$id));
  const rituais = eventos
    .filter((e) => ritual.has(e.tipo_id) && (anteriores ? e.data < hj : e.data >= hj))
    .sort((a, b) => (anteriores ? -1 : 1) * (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio))
    // Só os primeiros `maximo` (a tela pede de 12 em 12 ao rolar); sem limite, todos
    .slice(0, maximo);
  const idsReunioes = rituais.filter((e) => reunioes.has(e.tipo_id)).map((e) => e.$id);
  const [cand, usuarios, registrosReunioes] = await Promise.all([candidaturasDosEventos(rituais.map((e) => e.$id), true), mapaUsuarios(), registrosDasReunioes(idsReunioes)]);
  const pessoa = (id: string) => ({ id, nome: usuarios.get(id)?.nome ?? "Guardião", foto: usuarios.get(id)?.foto ?? null });
  const doGenero = (e: Evento, s: Sexo) => (e.guardioes ?? []).filter((id) => usuarios.get(id)?.sexo === s).map(pessoa);
  const endPorId = new Map<string, Endereco>(enderecos.map((e) => [e.$id, e]));
  return rituais.map((e) => {
    const reuniao = reunioes.has(e.tipo_id);
    // Reunião: mestres e guardiões escalados contam como confirmados, até responderem de outro jeito
    const doEvento = reuniao
      ? comEquipeAutomatica(e, registrosReunioes.filter((c) => c.evento_id === e.$id)).filter((c) => !c.$id.startsWith("auto-") || usuarios.get(c.usuario_id)?.ativo)
      : cand.filter((c) => c.evento_id === e.$id);
    const conf = (s: Sexo) => doEvento.filter((c) => c.sexo === s && c.situacao === "confirmada").length;
    const end = e.endereco_id ? endPorId.get(e.endereco_id) : undefined;
    const presentes = reuniao ? doEvento.filter((c) => c.situacao === "confirmada").sort((a, b) => Number(usuarios.get(b.usuario_id)?.funcao === "mestre") - Number(usuarios.get(a.usuario_id)?.funcao === "mestre") || a.ordem - b.ordem).map((c) => pessoa(c.usuario_id)) : [];
    return {
      reuniao,
      presentes,
      justificados: reuniao ? doEvento.filter((c) => c.situacao === "justificada").length : 0,
      semResposta: reuniao ? [...new Set([...(e.mestres ?? []), ...guardioesDaReuniao(e)])].filter((id) => usuarios.get(id)?.ativo && !doEvento.some((c) => c.usuario_id === id)).length : 0,
      evento: e,
      local: end ? end.apelido : e.endereco_livre,
      vagas: reuniao ? { masculino: 0, feminino: 0 } : vagasDe(e),
      // Nos rituais passados vale a lista `guardioes` do evento (traz também o histórico importado)
      confirmados: reuniao ? { masculino: presentes.length, feminino: 0 } : anteriores ? { masculino: doGenero(e, "masculino").length, feminino: doGenero(e, "feminino").length } : { masculino: conf("masculino"), feminino: conf("feminino") },
      escalados: reuniao ? { masculino: [], feminino: [] } : anteriores
        ? { masculino: doGenero(e, "masculino"), feminino: doGenero(e, "feminino") }
        : {
            masculino: doEvento.filter((c) => c.sexo === "masculino" && c.situacao === "confirmada").sort((a, b) => a.ordem - b.ordem).map((c) => pessoa(c.usuario_id)),
            feminino: doEvento.filter((c) => c.sexo === "feminino" && c.situacao === "confirmada").sort((a, b) => a.ordem - b.ordem).map((c) => pessoa(c.usuario_id)),
          },
      espera: doEvento.filter((c) => c.situacao === "espera").length,
      minha: usuarioId ? (doEvento.find((c) => c.usuario_id === usuarioId)?.situacao ?? null) : null,
      aberto: e.candidaturas_abertas !== false && inicioDe(e).getTime() > Date.now(),
    };
  });
}
