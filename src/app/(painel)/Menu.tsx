"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import type { Perfil } from "@/lib/config";
import { BarChart3, CalendarDays, Image as ImageIcon, LogOut, Menu as MenuIcone, Plus, Settings, Users, X } from "lucide-react";

const ICONES = { calendar: CalendarDays, plus: Plus, chart: BarChart3, image: ImageIcon, settings: Settings, users: Users };

export type ItemMenu = { href: string; rotulo: string; icone: keyof typeof ICONES };
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

type Props = {
  grupos: GrupoMenu[];
  marca: ReactNode;
  usuario: { nome: string; perfil: string; perfilId: Perfil; foto: string | null };
  sair: () => Promise<void>;
};

export function Menu({ grupos, marca, usuario, sair }: Props) {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [path]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const ativo = (href: string) =>
    href === "/eventos" ? path === "/eventos" || /^\/eventos\/(?!novo)/.test(path) : path.startsWith(href);

  const conteudo = (
    <div className="relative flex h-full flex-col overflow-hidden bg-mata-950 text-mata-100">
      {/* brilho decorativo */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-ouro-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-mata-500/20 blur-3xl" />

      <div className="relative px-5 pt-6 pb-5">{marca}</div>
      <div className="relative mx-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-mata-300/70 uppercase">{g.titulo}</p>
            <div className="space-y-0.5">
              {g.itens.map((i) => {
                const Icone = ICONES[i.icone];
                const on = ativo(i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    aria-current={on ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      on ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" : "text-mata-200/90 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {on && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-ouro-400" />}
                    <Icone size={18} className={on ? "text-ouro-400" : "text-mata-300/80 transition group-hover:text-mata-100"} />
                    {i.rotulo}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative p-3">
        <div className={`flex items-center gap-1 rounded-2xl border p-1.5 transition ${path.startsWith("/perfil") ? "border-ouro-400/40 bg-white/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
          <Link href="/perfil" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition hover:bg-white/[0.06]" title="Meu perfil">
            <Avatar nome={usuario.nome} foto={usuario.foto} perfil={usuario.perfilId} tamanho={36} className="ring-white/20" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{usuario.nome}</p>
              <p className="text-xs text-mata-300">{usuario.perfil} · Meu perfil</p>
            </div>
          </Link>
          <form action={sair}>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-mata-300 transition hover:bg-white/10 hover:text-white" aria-label="Sair" title="Sair">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block xl:w-72">{conteudo}</aside>

      {/* Mobile: barra no topo + gaveta */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-mata-950 px-4 py-3 md:hidden">
        <div className="min-w-0 [&_img]:!h-9 [&_p.text-xs]:hidden">{marca}</div>
        <button onClick={() => setAberto(true)} className="grid h-10 w-10 place-items-center rounded-xl text-mata-100 hover:bg-white/10" aria-label="Abrir menu">
          <MenuIcone size={22} />
        </button>
      </div>
      {aberto && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-mata-950/60 backdrop-blur-sm" aria-label="Fechar menu" onClick={() => setAberto(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] animate-gaveta shadow-2xl">
            {conteudo}
            <button onClick={() => setAberto(false)} className="absolute top-5 right-3 grid h-9 w-9 place-items-center rounded-lg text-mata-200 hover:bg-white/10" aria-label="Fechar menu">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
