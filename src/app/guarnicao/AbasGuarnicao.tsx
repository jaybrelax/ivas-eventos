"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarCheck, Flame, Settings, Ticket, UsersRound } from "lucide-react";
import type { VisaoGuarnicao } from "@/lib/guarnicao-app";

const ABAS = {
  guardiao: [
    { href: "/guarnicao", rotulo: "Rituais", Icone: Flame },
    { href: "/guarnicao/escalas", rotulo: "Escalas", Icone: CalendarCheck },
    { href: "/guarnicao/guardioes", rotulo: "Guardiões", Icone: UsersRound },
    { href: "/guarnicao/estatisticas", rotulo: "Estatísticas", Icone: BarChart3 },
    { href: "/guarnicao/pacotes", rotulo: "Pacotes", Icone: Ticket },
  ],
  coordenador: [
    { href: "/guarnicao", rotulo: "Rituais", Icone: Flame },
    { href: "/guarnicao/guardioes", rotulo: "Guardiões", Icone: UsersRound },
    { href: "/guarnicao/estatisticas", rotulo: "Estatísticas", Icone: BarChart3 },
    { href: "/guarnicao/pacotes", rotulo: "Pacotes", Icone: Ticket },
    { href: "/guarnicao/configuracoes", rotulo: "Configurações", Icone: Settings },
  ],
} as const;

/** Barra de abas fixa embaixo, como num app nativo (respeita a área segura do iPhone). O Perfil abre pela foto no topo. */
export function AbasGuarnicao({ visao }: { visao: VisaoGuarnicao }) {
  const path = usePathname();
  const ativa = (href: string) => (href === "/guarnicao" ? path === "/guarnicao" || path.startsWith("/guarnicao/ritual") : path.startsWith(href));

  return (
    // Barra flutuante e sólida (com sombra), para ter presença nos dois temas
    <nav aria-label="Navegação do app" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <ul className={`dock-app pointer-events-auto mx-auto grid max-w-xl rounded-[26px] px-1 ${ABAS[visao].length > 4 ? "grid-cols-5" : "grid-cols-4"}`}>
        {ABAS[visao].map(({ href, rotulo, Icone }) => {
          const on = ativa(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex h-[4.5rem] flex-col items-center justify-center gap-1 font-semibold transition active:scale-95 ${ABAS[visao].length > 4 ? "text-[10px] tracking-tight" : "text-[11px]"}`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-all duration-300 ${
                    on ? "bg-white text-emerald-700 shadow-[0_6px_16px_-4px_rgb(0_0_0/0.35)]" : "text-white/75"
                  }`}
                >
                  <Icone size={20} strokeWidth={on ? 2.4 : 2.2} />
                </span>
                <span className={on ? "font-bold text-white" : "text-white/70"}>{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
