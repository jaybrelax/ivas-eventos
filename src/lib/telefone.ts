/** Formata telefone brasileiro: (43) 99999-0000 (celular) ou (43) 3333-0000 (fixo). */
export function mascararTelefone(valor: string): string {
  let d = valor.replace(/\D/g, "");
  // Colado com DDI (+55): descarta o 55 quando passa de 11 dígitos.
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  if (d.length <= 10) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}
