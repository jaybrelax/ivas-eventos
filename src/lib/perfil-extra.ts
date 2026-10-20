/** Dados complementares do cadastro: localização, profissão e o que a pessoa conta sobre a sua caminhada. */

export const UFS = [
  { uf: "AC", nome: "Acre" }, { uf: "AL", nome: "Alagoas" }, { uf: "AP", nome: "Amapá" }, { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" }, { uf: "CE", nome: "Ceará" }, { uf: "DF", nome: "Distrito Federal" }, { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" }, { uf: "MA", nome: "Maranhão" }, { uf: "MT", nome: "Mato Grosso" }, { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" }, { uf: "PA", nome: "Pará" }, { uf: "PB", nome: "Paraíba" }, { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" }, { uf: "PI", nome: "Piauí" }, { uf: "RJ", nome: "Rio de Janeiro" }, { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" }, { uf: "RO", nome: "Rondônia" }, { uf: "RR", nome: "Roraima" }, { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" }, { uf: "SE", nome: "Sergipe" }, { uf: "TO", nome: "Tocantins" },
] as const;

export type Experiencia = "nenhuma" | "pouca" | "moderada" | "muita";

export const EXPERIENCIAS: { valor: Experiencia; rotulo: string }[] = [
  { valor: "nenhuma", rotulo: "Nenhuma" },
  { valor: "pouca", rotulo: "Pouca (1-3 vezes)" },
  { valor: "moderada", rotulo: "Moderada (4-10 vezes)" },
  { valor: "muita", rotulo: "Muita (10+ vezes)" },
];

export const LIMITE_TEXTO_LONGO = 1000;

export function ehUf(v: string): boolean {
  return UFS.some((u) => u.uf === v);
}

export function ehExperiencia(v: string): v is Experiencia {
  return EXPERIENCIAS.some((e) => e.valor === v);
}

export function rotuloExperiencia(v: string | null | undefined): string | null {
  return EXPERIENCIAS.find((e) => e.valor === v)?.rotulo ?? null;
}
