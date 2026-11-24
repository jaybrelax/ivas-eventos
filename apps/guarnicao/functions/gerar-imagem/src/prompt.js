/** Mesmos marcadores do formulário de Eventos. Substituição em uma única passagem. */
export function montarPromptIA(prompt, valores) {
  return prompt.replace(/\{\{(art_direction|titulo_ritual|data_ritual|horario_ritual|numero_ritual|local_ritual)\}\}/g, (_, nome) => {
    if (!valores[nome]) throw new Error(`Preencha ${nome} antes de gerar a imagem.`);
    return valores[nome];
  });
}

export function horarioParaPrompt(valor) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valor) ? valor : "";
}

export function dataParaPrompt(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "";
  const data = new Date(valor + "T12:00:00Z");
  if (!Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== valor) return "";
  return valor.slice(8, 10) + "/" + valor.slice(5, 7) + "/" + valor.slice(0, 4);
}
