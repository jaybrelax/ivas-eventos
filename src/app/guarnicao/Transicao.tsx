"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useNavegacaoApp } from "./NavegacaoApp";
import Esqueleto from "./loading";

/** Cada troca de tela entra deslizando de leve, como nos apps nativos. */
export function Transicao({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { pendente } = useNavegacaoApp();
  // Troca de aba em andamento: esqueleto na hora, até o conteúdo novo chegar
  if (pendente) return <Esqueleto />;
  return (
    <div key={path} className="animate-tela">
      {children}
    </div>
  );
}
