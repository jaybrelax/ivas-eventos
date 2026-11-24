/** Prioriza a label first e, dentro dela, pessoas do sexo masculino. */
export function compararFirst(a: { first?: boolean; sexo?: string | null } | undefined, b: { first?: boolean; sexo?: string | null } | undefined) {
  return Number(!!b?.first) - Number(!!a?.first) || (a?.first && b?.first ? Number(b.sexo === "masculino") - Number(a.sexo === "masculino") : 0);
}
