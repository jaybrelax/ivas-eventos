"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Cada troca de tela entra deslizando de leve, como nos apps nativos. */
export function Transicao({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div key={path} className="animate-tela">
      {children}
    </div>
  );
}
