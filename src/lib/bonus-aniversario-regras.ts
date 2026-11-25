/** Regras puras do bônus anual de aniversário, sem acesso ao banco. */

function partes(iso: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) } : null;
}

/** O bônus vale somente para ritual no mês de aniversário e durante esse mesmo mês. */
export function podeUsarBonusAniversario({
  nascimento,
  dataEvento,
  hoje,
  ritualElegivel,
}: {
  nascimento: string | null | undefined;
  dataEvento: string;
  hoje: string;
  ritualElegivel: boolean;
}) {
  const n = partes(nascimento);
  const evento = partes(dataEvento);
  const atual = partes(hoje);
  if (!n || !evento || !atual || !ritualElegivel) return false;
  return atual.mes === n.mes && evento.mes === n.mes && evento.ano === atual.ano;
}

export function anoDoBonus(hoje: string) {
  return partes(hoje)?.ano ?? null;
}

export function chaveBonusAniversario(usuarioId: string, ano: number) {
  return `${usuarioId}:${ano}`;
}

