"use client";

import { usePathname } from "next/navigation";
import { SeletorTema } from "@/components/SeletorTema";

/** Nas telas administrativas móveis sem a barra do painel, mantém acesso ao tema. */
export function AtalhoTemaMobile() {
  const path = usePathname();
  const semMenu = path === "/admin/configuracoes" || /^\/admin\/eventos\/(?!novo$)[^/]+(\/editar)?$/.test(path);
  if (!semMenu) return null;
  return (
    <div className="pointer-events-none fixed top-3 right-14 z-[65] md:hidden">
      <div className="pointer-events-auto"><SeletorTema compacto /></div>
    </div>
  );
}
