/** Endereço e data de nascimento: obrigatórios para concluir o cadastro de guardião. */
export function conferirDadosObrigatorios(form: FormData): string | null {
  const endereco = String(form.get("endereco") ?? "").trim().replace(/\s+/g, " ");
  if (endereco.length < 8) return "Informe o endereço completo (rua, número, bairro e cidade).";
  const nascimento = String(form.get("data_nascimento") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return "Informe a data de nascimento.";
  if (nascimento > new Date().toISOString().slice(0, 10)) return "A data de nascimento não pode ser no futuro.";
  return null;
}
