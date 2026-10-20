/** Formata CPF enquanto digita: 000.000.000-00. */
export function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Valida os dígitos verificadores do CPF (rejeita sequências repetidas, ex.: 111.111.111-11). */
export function validarCpf(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (let verificador = 9; verificador <= 10; verificador++) {
    let soma = 0;
    for (let i = 0; i < verificador; i++) soma += Number(d[i]) * (verificador + 1 - i);
    const resto = (soma * 10) % 11;
    if ((resto === 10 ? 0 : resto) !== Number(d[verificador])) return false;
  }
  return true;
}
