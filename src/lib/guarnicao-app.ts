import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUsuario, type Usuario } from "./auth";
import { getDadosInstituto, listarEventos } from "./data";
import { candidaturasDosEventos, inicioDe, vagasDe } from "./guarnicao";
import { hoje } from "./format";
import { mapaUsuarios } from "./usuarios";
import type { Endereco, Evento, Sexo, SituacaoCandidatura } from "./types";

/**
 * Quem entra no app da Guarnição e com qual visão:
 * - coordenador: perfil admin ou coordenador (escala, vagas, estatísticas gerais);
 * - guardião: função ritual = guardião (candidata-se às vagas e acompanha o próprio histórico).
 * Quem tem as duas alterna em Perfil; a escolha fica num cookie.
 */
export type VisaoGuarnicao = "coordenador" | "guardiao";
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
  return v;
}

/** Sessão + visões do app. Sem login vai para o login (voltando para cá); sem acesso devolve `null`. */
export async function contextoGuarnicao(next = "/guarnicao"): Promise<ContextoGuarnicao | null> {
  const u = await getUsuario();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  const visoes = visoesDe(u);
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
};

/**
 * Rituais com vagas por gênero, confirmados e espera. Por padrão, os próximos (até `dias` à frente);
 * com `anteriores`, os que já aconteceram no último ano, do mais recente ao mais antigo.
 */
export async function rituaisComVagas(usuarioId: string | null, dias = 120, anteriores = false): Promise<RitualGuarnicao[]> {
  const hj = hoje();
  const deslocar = (n: number) => new Date(Date.parse(`${hj}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const [{ tipos, enderecos }, eventos] = await Promise.all([
    getDadosInstituto(),
    anteriores ? listarEventos({ inicio: deslocar(-365), fim: hj }) : listarEventos({ inicio: hj, fim: deslocar(dias) }),
  ]);
  const ritual = new Set(tipos.filter((t) => t.conta_como_ritual).map((t) => t.$id));
  const limite = Date.now() - 6 * 3_600_000;
  const rituais = eventos
    .filter((e) => ritual.has(e.tipo_id) && (anteriores ? inicioDe(e).getTime() <= limite : inicioDe(e).getTime() > limite))
    .sort((a, b) => (anteriores ? -1 : 1) * (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio))
    // A lista de anteriores mostra só os 40 mais recentes (o resto fica no histórico de cada guardião)
    .slice(0, anteriores ? 40 : undefined);
  const [cand, usuarios] = await Promise.all([candidaturasDosEventos(rituais.map((e) => e.$id)), mapaUsuarios()]);
  const pessoa = (id: string) => ({ id, nome: usuarios.get(id)?.nome ?? "Guardião", foto: usuarios.get(id)?.foto ?? null });
  const doGenero = (e: Evento, s: Sexo) => (e.guardioes ?? []).filter((id) => usuarios.get(id)?.sexo === s).map(pessoa);
  const endPorId = new Map<string, Endereco>(enderecos.map((e) => [e.$id, e]));
  return rituais.map((e) => {
    const doEvento = cand.filter((c) => c.evento_id === e.$id);
    const conf = (s: Sexo) => doEvento.filter((c) => c.sexo === s && c.situacao === "confirmada").length;
    const end = e.endereco_id ? endPorId.get(e.endereco_id) : undefined;
    return {
      evento: e,
      local: end ? end.apelido : e.endereco_livre,
      vagas: vagasDe(e),
      // Nos rituais passados vale a lista `guardioes` do evento (traz também o histórico importado)
      confirmados: anteriores ? { masculino: doGenero(e, "masculino").length, feminino: doGenero(e, "feminino").length } : { masculino: conf("masculino"), feminino: conf("feminino") },
      escalados: anteriores
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
