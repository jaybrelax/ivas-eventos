import type { Instituto } from "./types";

export type PreferenciasCreditos = {
  cessaoAtiva: boolean;
  permitirRecessao: boolean;
  quitarDebitosNaCompra: boolean;
  quitarDebitosAoReceberCessao: boolean;
};

export function lerPreferenciasCreditos(instituto: Pick<Instituto, "config_creditos">): PreferenciasCreditos {
  try {
    const valor = JSON.parse(instituto.config_creditos ?? "{}");
    return {
      cessaoAtiva: valor?.cessaoAtiva !== false,
      permitirRecessao: valor?.permitirRecessao === true,
      quitarDebitosNaCompra: valor?.quitarDebitosNaCompra === true,
      quitarDebitosAoReceberCessao: valor?.quitarDebitosAoReceberCessao === true,
    };
  } catch {
    return { cessaoAtiva: true, permitirRecessao: false, quitarDebitosNaCompra: false, quitarDebitosAoReceberCessao: false };
  }
}
