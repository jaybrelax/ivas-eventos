/**
 * Regras puras da gestão do ritual pelo guardião (sem banco). Testadas em scripts/gestao-guardiao.test.mjs.
 *
 * O guardião escalado num ritual ganha, por um período, o mesmo acesso de gestão daquele evento
 * (financeiro, consumo, central, participantes). O período começa à 00:00 (Brasília) do dia do ritual
 * e dura `horas` (padrão 48: o dia do ritual e o dia seguinte). A coordenação liga/desliga e define a duração.
 */
export const HORAS_GESTAO_PADRAO = 48;
export const HORAS_GESTAO_MAXIMO = 240;

export type RegrasGestaoGuardiao = { ativa: boolean; horas: number };

/** Lê as regras do Instituto; colunas ausentes ou inválidas viram o padrão (ligada, 48 h). */
export function lerRegrasGestaoGuardiao(i: { gestao_guardiao_ativa?: boolean | null; gestao_guardiao_horas?: number | null }): RegrasGestaoGuardiao {
  const bruto = Number(i.gestao_guardiao_horas);
  const horas = Number.isFinite(i.gestao_guardiao_horas ?? NaN) ? Math.min(HORAS_GESTAO_MAXIMO, Math.max(0, Math.round(bruto))) : HORAS_GESTAO_PADRAO;
  return { ativa: i.gestao_guardiao_ativa !== false, horas };
}

/** Período de gestão: do começo do dia do ritual (Brasília, UTC−3) até `horas` depois. */
export function janelaGestao(evento: { data: string }, horas: number): { inicio: number; fim: number } {
  const inicio = new Date(`${evento.data}T00:00:00-03:00`).getTime();
  return { inicio, fim: inicio + horas * 3_600_000 };
}

export function dentroDaJanelaDeGestao(evento: { data: string }, regras: RegrasGestaoGuardiao, agora = Date.now()): boolean {
  if (!regras.ativa || regras.horas <= 0) return false;
  const { inicio, fim } = janelaGestao(evento, regras.horas);
  return agora >= inicio && agora < fim;
}
