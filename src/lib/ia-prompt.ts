/** Substitui só marcadores conhecidos, em uma passagem, sem interpretar valores como novos marcadores. */
export function montarPromptIA(prompt: string, valores: Record<string, string>): string {
  return prompt.replace(/\{\{(art_direction|titulo_ritual|data_ritual|horario_ritual|numero_ritual|local_ritual)\}\}/g, (_, nome: string) => {
    if (!valores[nome]) {
      const campos: Record<string, string> = { art_direction: "a direção artística nas configurações de IA", titulo_ritual: "o título", data_ritual: "a data", horario_ritual: "o horário de início", numero_ritual: "o número geral (salve o ritual primeiro se ainda não foi numerado)", local_ritual: "o local" };
      throw new Error("Preencha " + campos[nome] + " antes de gerar a imagem com {{" + nome + "}}.");
    }
    return valores[nome];
  });
}

export function dataParaPrompt(valor: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "";
  const data = new Date(valor + "T12:00:00Z");
  if (!Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== valor) return "";
  return valor.slice(8, 10) + "/" + valor.slice(5, 7) + "/" + valor.slice(0, 4);
}

export function horarioParaPrompt(valor: string): string {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valor) ? valor : "";
}
