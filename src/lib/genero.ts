import type { Sexo } from "./types";

/** Concordância de gênero: "escalado"/"escalada" conforme o gênero da pessoa; sem gênero informado, a forma "escalado(a)". */
export function concordar(sexo: Sexo | null | undefined, masculino: string, feminino: string) {
  return sexo === "masculino" ? masculino : sexo === "feminino" ? feminino : `${masculino}(${feminino.slice(-1)})`;
}
