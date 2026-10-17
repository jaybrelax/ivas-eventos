const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** "2026-10-17" → partes, sem depender do fuso do servidor. */
export function partesData(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return { ano: a, mes: m, dia: d, diaSemana: DIAS[dia], mesNome: MESES[m - 1], mesCurto: MESES_CURTOS[m - 1] };
}

export function dataPorExtenso(iso: string) {
  const p = partesData(iso);
  return `${p.diaSemana}, ${p.dia} de ${p.mesNome}`;
}

export function dataCurta(iso: string) {
  const p = partesData(iso);
  return `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}/${p.ano}`;
}

export function nomeMes(mes: number) {
  return MESES[mes - 1];
}

export function hoje() {
  // Data de hoje no fuso de São Paulo
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function limitesMes(anoMes: string) {
  const [a, m] = anoMes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { inicio: `${anoMes}-01`, fim: `${anoMes}-${String(ultimo).padStart(2, "0")}` };
}

export function somarMes(anoMes: string, n: number) {
  const [a, m] = anoMes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatarIdRitual(geral: number | null, ano: number | null, numAno: number | null) {
  if (!geral) return null;
  const g = `R-${String(geral).padStart(4, "0")}`;
  return ano && numAno ? `${g} · ${ano}/${String(numAno).padStart(2, "0")}` : g;
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
