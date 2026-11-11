/** Termo da justificativa de ausência: o mesmo texto aparece ao justificar, ao copiar e ao abrir a justificativa de alguém. */

const FUSO = "America/Sao_Paulo";

/** "2026-11-08" vira "08/11/2026". */
export function dataBR(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "8 de novembro de 2026 às 19:00" (horário de Brasília). */
export function dataHoraExtenso(d: Date) {
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "numeric", month: "long", year: "numeric" }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(d);
  return `${data} às ${hora}`;
}

/** Os parágrafos do termo. `dataEvento` é a data do ritual (AAAA-MM-DD); `quando` é o momento em que a justificativa foi feita (já formatado). */
export function paragrafosTermo({ nome, dataEvento, motivo, quando }: { nome: string; dataEvento: string; motivo: string; quando: string }) {
  return [
    "JUSTIFICATIVA DE FALTA NO RITUAL E REUNIÃO DOS MESTRES E GUARDIÕES",
    `Eu, ${nome}, venho justificar minha ausência no Ritual e na Reunião do dia ${dataBR(dataEvento)}, ciente de que tenho direito a até cinco justificativas durante o ano.`,
    `MOTIVO: ${motivo}`,
    "Peço que esta justificativa seja analisada e considerada, em razão de um impedimento legítimo, justo e honesto que me impossibilitou de estar presente.",
    "Renovo meu compromisso de respeitar o JURAMENTO e as REGRAS dos Mestres e Guardiões do Instituto das Virtudes da Ayahuasca e do Sol (IVAS), mantendo meu empenho com os princípios e valores da instituição.",
    ...(quando ? [`Data: ${quando}`] : []),
  ];
}
