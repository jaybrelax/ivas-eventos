/**
 * Doses consumidas numa participação (1ª, 2ª e, às vezes, 3ª), em ml, com o horário em que foi
 * bebida (`em`, ISO). Guardadas em JSON na inscrição: [{"n":1,"ml":40,"em":"2026-11-22T21:15:00.000Z"}].
 */
export type Dose = { n: 1 | 2 | 3; ml: number; em?: string };

export const DOSE_MAX_ML = 70;
export const DOSES_MAX = 3;

const horarioValido = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && Number.isFinite(Date.parse(v));

/** Lê o JSON salvo na inscrição. Qualquer coisa inválida vira lista vazia (nunca derruba a página). */
export function lerDoses(json: string | null | undefined): Dose[] {
  if (!json) return [];
  try {
    const bruto: unknown = JSON.parse(json);
    if (!Array.isArray(bruto)) return [];
    const vistos = new Set<number>();
    const lista: Dose[] = [];
    for (const d of bruto) {
      const n = Number((d as Dose)?.n);
      const ml = Number((d as Dose)?.ml);
      if (![1, 2, 3].includes(n) || vistos.has(n) || !Number.isFinite(ml)) continue;
      vistos.add(n);
      const dose: Dose = { n: n as Dose["n"], ml: Math.min(DOSE_MAX_ML, Math.max(0, Math.round(ml))) };
      if (horarioValido((d as Dose).em)) dose.em = new Date((d as Dose).em!).toISOString();
      lista.push(dose);
    }
    return lista.sort((a, b) => a.n - b.n);
  } catch {
    return [];
  }
}

/**
 * Confere a lista vinda do navegador antes de salvar: doses 1..3 sem repetir, em sequência
 * (a 3ª só com a 1ª e a 2ª), ml inteiro entre 0 e 70 e horário válido (não no futuro; dose
 * com ml sem horário ganha `agora`). Devolve a lista limpa ou um erro.
 */
export function validarDoses(entrada: unknown, agora = new Date()): { doses: Dose[] } | { erro: string } {
  if (!Array.isArray(entrada) || entrada.length > DOSES_MAX) return { erro: "Doses inválidas." };
  const limite = agora.getTime() + 5 * 60_000; // tolera relógio do celular um pouco adiantado
  const doses: Dose[] = [];
  for (const d of entrada) {
    const n = Number((d as Dose)?.n);
    const ml = Number((d as Dose)?.ml);
    const em = (d as Dose)?.em;
    if (![1, 2, 3].includes(n)) return { erro: "Doses inválidas." };
    if (!Number.isInteger(ml) || ml < 0 || ml > DOSE_MAX_ML) return { erro: `Cada dose vai de 0 a ${DOSE_MAX_ML} ml.` };
    if (doses.some((x) => x.n === n)) return { erro: "Dose repetida." };
    if (em != null && (!horarioValido(em) || Date.parse(em) > limite)) return { erro: "Horário da dose inválido." };
    const dose: Dose = { n: n as Dose["n"], ml };
    if (ml > 0) dose.em = em ? new Date(em).toISOString() : agora.toISOString();
    doses.push(dose);
  }
  doses.sort((a, b) => a.n - b.n);
  if (doses.some((d, i) => d.n !== i + 1)) return { erro: "As doses precisam seguir a ordem (1ª, 2ª, 3ª)." };
  return { doses };
}

export const totalDoses = (doses: Dose[]) => doses.reduce((s, d) => s + d.ml, 0);

/** Histórico: doses bebidas (com ml), da mais antiga para a mais recente. */
export const historicoDoses = (doses: Dose[]) =>
  doses.filter((d) => d.ml > 0 && d.em).sort((a, b) => Date.parse(a.em!) - Date.parse(b.em!));

/** Doses da equipe guardadas no evento: { "<id da pessoa>": Dose[] }. Inválido vira vazio. */
export function lerDosesEquipe(json: string | null | undefined): Record<string, Dose[]> {
  if (!json) return {};
  try {
    const bruto: unknown = JSON.parse(json);
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
    const saida: Record<string, Dose[]> = {};
    for (const [id, lista] of Object.entries(bruto as Record<string, unknown>)) {
      const doses = lerDoses(JSON.stringify(lista));
      if (doses.length) saida[id] = doses;
    }
    return saida;
  } catch {
    return {};
  }
}
