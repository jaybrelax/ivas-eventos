"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarCheck, Flame, Lightbulb, Settings, Ticket, UsersRound } from "lucide-react";
import type { VisaoGuarnicao } from "@/lib/guarnicao-app";
import { useNavegacaoApp } from "./NavegacaoApp";

const ABAS = {
  guardiao: [
    { href: "/guarnicao", rotulo: "Rituais", Icone: Flame },
    { href: "/guarnicao/reunioes", rotulo: "Reuniões", Icone: Lightbulb },
    { href: "/guarnicao/escalas", rotulo: "Escalas", Icone: CalendarCheck },
    { href: "/guarnicao/guardioes", rotulo: "Soldados", Icone: UsersRound },
    { href: "/guarnicao/estatisticas", rotulo: "Estatísticas", Icone: BarChart3 },
    { href: "/guarnicao/pacotes", rotulo: "Pacotes", Icone: Ticket },
  ],
  mestre: [
    { href: "/guarnicao", rotulo: "Rituais", Icone: Flame },
    { href: "/guarnicao/reunioes", rotulo: "Reuniões", Icone: Lightbulb },
    { href: "/guarnicao/escalas", rotulo: "Escalas", Icone: CalendarCheck },
    { href: "/guarnicao/guardioes", rotulo: "Soldados", Icone: UsersRound },
    { href: "/guarnicao/estatisticas", rotulo: "Estatísticas", Icone: BarChart3 },
  ],
  coordenador: [
    { href: "/guarnicao", rotulo: "Rituais", Icone: Flame },
    { href: "/guarnicao/reunioes", rotulo: "Reuniões", Icone: Lightbulb },
    { href: "/guarnicao/guardioes", rotulo: "Soldados", Icone: UsersRound },
    { href: "/guarnicao/estatisticas", rotulo: "Estatísticas", Icone: BarChart3 },
    { href: "/guarnicao/pacotes", rotulo: "Pacotes", Icone: Ticket },
    { href: "/guarnicao/configuracoes", rotulo: "Configurações", Icone: Settings },
  ],
} as const;

function IndicadorNavegacao() {
  const { pending } = useLinkStatus();
  return (
    <span
      role="status"
      className={`pointer-events-none absolute top-1 right-2 left-2 flex justify-center transition-opacity duration-150 ${pending ? "opacity-100 delay-300" : "opacity-0"}`}
    >
      {pending && <span className="sr-only">Carregando página</span>}
      <span aria-hidden className="h-0.5 w-5 rounded-full bg-white/80 motion-safe:animate-pulse" />
    </span>
  );
}

/** Barra de abas fixa embaixo, como num app nativo (respeita a área segura do iPhone). O Perfil abre pela foto no topo. */
export function AbasGuarnicao({ visao }: { visao: VisaoGuarnicao }) {
  const real = usePathname();
  const { alvo, ir } = useNavegacaoApp();
  // Na troca em andamento, a aba tocada já aparece ativa
  const path = alvo ?? real;
  const ativa = (href: string) => (href === "/guarnicao" ? path === "/guarnicao" || path.startsWith("/guarnicao/ritual") : path.startsWith(href));

  return (
    // Barra flutuante e sólida (com sombra), para ter presença nos dois temas
    <nav aria-label="Navegação do app" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <ul className={`dock-app pointer-events-auto mx-auto grid max-w-xl rounded-[26px] px-1 backdrop-blur-xl backdrop-saturate-[1.7] ${ABAS[visao].length > 5 ? "grid-cols-6" : ABAS[visao].length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {ABAS[visao].map(({ href, rotulo, Icone }) => {
          const on = ativa(href);
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={href === "/guarnicao/configuracoes" ? false : true}
                aria-current={on ? "page" : undefined}
                aria-label={href === "/guarnicao/configuracoes" ? "Configurações" : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  if (href !== real || alvo) ir(href);
                }}
                className={`relative flex h-[4.5rem] flex-col items-center justify-center gap-1 font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${ABAS[visao].length >= 5 ? "text-[9px] tracking-tight min-[375px]:text-[10px]" : "text-[11px]"}`}
              >
                <IndicadorNavegacao />
                <span
                  className={`grid h-8 w-10 place-items-center rounded-full transition-all duration-300 ${
                    on ? "bg-white text-emerald-700 shadow-[0_6px_16px_-4px_rgb(0_0_0/0.35)]" : "text-white/75"
                  }`}
                >
                  <Icone size={20} strokeWidth={on ? 2.4 : 2.2} />
                </span>
                <span className={`max-w-full truncate px-0.5 ${on ? "font-bold text-white" : "text-white/70"}`}>
                  {rotulo === "Configurações" ? <><span className="min-[420px]:hidden">Config.</span><span className="hidden min-[420px]:inline">Configurações</span></> : rotulo}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
