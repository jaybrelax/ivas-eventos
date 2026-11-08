/** Suspensões são avaliadas na leitura: ao vencer o prazo, o acesso volta sem cron. */
export function suspensaoAtiva(ate: string | null | undefined, agora = Date.now()): boolean {
  return !!ate && Number.isFinite(Date.parse(ate)) && Date.parse(ate) > agora;
}

/** Soma meses de calendário, preservando o horário e limitando o dia ao fim do mês. */
export function fimSuspensao(meses: 3 | 6, agora = new Date()): string {
  const fim = new Date(agora);
  const dia = fim.getUTCDate();
  fim.setUTCDate(1);
  fim.setUTCMonth(fim.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() + 1, 0)).getUTCDate();
  fim.setUTCDate(Math.min(dia, ultimoDia));
  return fim.toISOString();
}
