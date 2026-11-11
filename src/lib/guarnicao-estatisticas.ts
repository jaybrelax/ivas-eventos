import "server-only";
import { cache } from "react";
import { getDadosInstituto, listarEventos } from "./data";
import { hoje } from "./format";
import { ehReuniao, inicioDe, temGuarnicao } from "./guarnicao";
import { suspensaoAtiva } from "./suspensao-guarnicao";
import { mapaUsuarios } from "./usuarios";
import type { Evento, Sexo } from "./types";

/**
 * Estatísticas da guarnição. Quem serviu num ritual = quem está em `evento.guardioes`
 * (lista mantida igual às candidaturas confirmadas e que também traz o histórico importado).
 */

export type Guardiao = { id: string; nome: string; foto: string | null; sexo: Sexo | null; suspensoAte: string | null };
export type LinhaRanking = Guardiao & { total: number; ano: number; ultimo: string | null };

/** Rituais que já aconteceram (com a guarnição registrada), do mais recente ao mais antigo. */
export const rituaisPassados = cache(async (): Promise<Evento[]> => {
  const [{ tipos }, eventos] = await Promise.all([getDadosInstituto(), listarEventos({ fim: hoje() })]);
  const ritual = new Set(tipos.filter((t) => temGuarnicao(t)).map((t) => t.$id));
  // Reunião também conta como ritual servido, mas só quando tem guardião do dia marcado
  const reuniao = new Set(tipos.filter((t) => ehReuniao(t)).map((t) => t.$id));
  const agora = Date.now();
  return eventos.filter((e) => (ritual.has(e.tipo_id) || (reuniao.has(e.tipo_id) && !!e.guardioes?.length)) && inicioDe(e).getTime() <= agora).reverse();
});

/** Guardiões e guardiãs ativos. */
export const guardioesAtivos = cache(async (): Promise<Guardiao[]> => {
  const usuarios = await mapaUsuarios();
  return [...usuarios.values()].filter((u) => u.ativo && u.funcao === "guardiao").map((u) => ({ id: u.id, nome: u.nome, foto: u.foto, sexo: u.sexo, suspensoAte: suspensaoAtiva(u.suspensoAte) ? u.suspensoAte : null }));
});

/** Ranking de quem mais serviu (no total e no ano), com a data do último ritual. */
export const rankingGuarnicao = cache(async (): Promise<LinhaRanking[]> => {
  const [passados, guardioes] = await Promise.all([rituaisPassados(), guardioesAtivos()]);
  const ano = hoje().slice(0, 4);
  return guardioes
    .map((g) => {
      const meus = passados.filter((e) => e.guardioes?.includes(g.id));
      return { ...g, total: meus.length, ano: meus.filter((e) => e.data.startsWith(ano)).length, ultimo: meus[0]?.data ?? null };
    })
    .sort((a, b) => b.total - a.total || b.ano - a.ano || a.nome.localeCompare(b.nome));
});

/** Rituais servidos por uma pessoa (mais recente primeiro) e a contagem por mês do ano atual. */
export async function historicoDe(usuarioId: string) {
  const passados = await rituaisPassados();
  const meus = passados.filter((e) => e.guardioes?.includes(usuarioId));
  const ano = hoje().slice(0, 4);
  const porMes = Array.from({ length: 12 }, (_, i) => meus.filter((e) => e.data.startsWith(`${ano}-${String(i + 1).padStart(2, "0")}`)).length);
  return { rituais: meus, total: meus.length, ano: meus.filter((e) => e.data.startsWith(ano)).length, porMes, ultimo: meus[0]?.data ?? null };
}

/** Dias desde uma data (AAAA-MM-DD) até hoje. */
export function diasDesde(data: string) {
  return Math.round((Date.parse(`${hoje()}T12:00:00Z`) - Date.parse(`${data}T12:00:00Z`)) / 86_400_000);
}

/** Marcos de quantidade de rituais servidos. */
export const MARCOS = [1, 5, 10, 25, 50, 100, 200];
