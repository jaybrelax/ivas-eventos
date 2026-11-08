"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Contexto = { pendente: boolean; alvo: string | null; ir: (href: string) => void };
const Ctx = createContext<Contexto>({ pendente: false, alvo: null, ir: () => {} });
export const useNavegacaoApp = () => useContext(Ctx);

/**
 * Troca de aba do app: no toque a tela vira esqueleto e a aba tocada já fica ativa;
 * quando o conteúdo novo chega, o esqueleto some. Envolve a tela (Transicao) e a barra de abas.
 */
export function NavegacaoApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [alvo, setAlvo] = useState<string | null>(null);
  const ir = (href: string) => {
    setAlvo(href);
    iniciar(() => router.push(href));
  };
  return <Ctx.Provider value={{ pendente, alvo: pendente ? alvo : null, ir }}>{children}</Ctx.Provider>;
}
