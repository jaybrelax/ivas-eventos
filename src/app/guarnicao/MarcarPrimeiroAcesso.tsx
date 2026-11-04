"use client";

import { useEffect } from "react";

export const CHAVE_PRIMEIRO_ACESSO = "ivas-guarnicao-acessou";

/**
 * Marca que o app já foi aberto neste aparelho. A gravação espera o fim dos efeitos da tela (setTimeout),
 * para a tela ainda ver se era o primeiro acesso.
 */
export function MarcarPrimeiroAcesso() {
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CHAVE_PRIMEIRO_ACESSO, "1");
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);
  return null;
}
