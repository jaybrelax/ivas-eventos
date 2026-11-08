"use client";

import Link from "next/link";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { rolarAte } from "./Carrossel";

type Contexto = { pendente: boolean; alvo: string | null; ir: (href: string) => void };
const Ctx = createContext<Contexto>({ pendente: false, alvo: null, ir: () => {} });

/**
 * Troca de filtro da tela Rituais: na hora do toque a lista vira esqueletos e o chip tocado já fica ativo;
 * quando os dados novos chegam, o esqueleto some. Envolve os chips e a lista.
 */
export function NavegacaoRituais({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [alvo, setAlvo] = useState<string | null>(null);
  const ir = (href: string) => {
    setAlvo(href);
    iniciar(() => router.push(href, { scroll: false }));
  };
  return <Ctx.Provider value={{ pendente, alvo: pendente ? alvo : null, ir }}>{children}</Ctx.Provider>;
}

/** Chip de filtro: link normal (abre em nova aba etc.), mas o toque simples passa pela transição com esqueleto. */
export function ChipFiltro({ href, ativo, className = "", children }: { href: string; ativo: boolean; className?: string; children: ReactNode }) {
  const { alvo, ir } = useContext(Ctx);
  const on = alvo ? alvo === href : ativo;
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        // O carrossel rola já no toque (o React só o redesenharia quando os dados chegassem)
        const nav = e.currentTarget.closest("nav");
        if (nav) rolarAte(nav, e.currentTarget);
        if (!on || alvo) ir(href);
      }}
      className={`chip-app ${className} ${on ? "chip-app-on" : ""}`}
    >
      {children}
    </Link>
  );
}

/** Área da lista: mostra esqueletos enquanto a troca de filtro carrega. */
export function AreaLista({ children }: { children: ReactNode }) {
  const { pendente } = useContext(Ctx);
  if (!pendente) return <>{children}</>;
  const bloco = "animate-pulse rounded-2xl bg-stone-200/80";
  return (
    <ul aria-busy="true" aria-label="Carregando" className="space-y-3 px-4">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/70">
          <div className="h-40 w-[6.5rem] shrink-0 animate-pulse bg-stone-200" />
          <div className="flex-1 space-y-2.5 p-4">
            <div className={`${bloco} h-4 w-4/5 rounded-lg`} />
            <div className={`${bloco} h-3 w-1/2 rounded-lg`} />
            <div className="flex gap-1.5 pt-2">
              {[0, 1, 2, 3].map((j) => <div key={j} className={`${bloco} h-9 w-9 rounded-full`} />)}
            </div>
            <div className={`${bloco} h-6 w-32 rounded-full`} />
          </div>
        </li>
      ))}
    </ul>
  );
}
