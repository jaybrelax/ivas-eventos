"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import type { Perfil } from "@/lib/config";
import { BarChart3, CalendarDays, Download, Image as ImageIcon, LogOut, Menu as MenuIcone, PanelLeftClose, PanelLeftOpen, Plus, Receipt, Settings, Share, Shield, Users, UsersRound, X } from "lucide-react";
import { useInstalar } from "@/components/useInstalar";

const ICONES = { calendar: CalendarDays, plus: Plus, chart: BarChart3, image: ImageIcon, settings: Settings, users: Users, shield: Shield, receipt: Receipt, participantes: UsersRound };

export type ItemMenu = { href: string; rotulo: string; icone: keyof typeof ICONES; /** contador ao lado (ex.: cadastros pendentes) */ aviso?: number };
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

type Props = {
  grupos: GrupoMenu[];
  marca: ReactNode;
  usuario: { nome: string; perfil: string; perfilId: Perfil; foto: string | null };
  sair: () => Promise<void>;
};

export function Menu({ grupos, marca, usuario, sair }: Props) {
  const path = usePathname();
  // Visualização e edição do evento: no mobile a página tem a própria barra (voltar + menu ⋮)
  const semBarra = /^\/admin\/eventos\/(?!novo$)[^/]+(\/editar)?$/.test(path);
  const [aberto, setAberto] = useState(false);
  // Menu lateral fino (só ícones): escolha guardada; sem escolha, fica fino em tablet (< 1024 px)
  const [fino, setFino] = useState(false);
  useEffect(() => { setFino(document.documentElement.dataset.menu === "colapsado"); }, []);
  const alternarFino = () => {
    const novo = !fino;
    setFino(novo);
    if (novo) document.documentElement.dataset.menu = "colapsado"; else delete document.documentElement.dataset.menu;
    try { localStorage.setItem("menu-colapsado", novo ? "1" : "0"); } catch { /* sem armazenamento: vale só nesta visita */ }
  };
  const [dicaIos, setDicaIos] = useState(false);
  const inst = useInstalar();
  useEffect(() => setAberto(false), [path]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const ativo = (href: string) =>
    href === "/admin/eventos" ? path === "/admin/eventos" || /^\/admin\/eventos\/(?!novo)/.test(path) : path.startsWith(href);

  const montar = (fino: boolean) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-mata-950 text-mata-100">
      {/* brilho decorativo */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-ouro-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-mata-500/20 blur-3xl" />

      <div className={`relative ${fino ? "flex justify-center px-2 pt-6 pb-5" : "px-5 pt-6 pb-5"}`}>
        {fino ? <div className="h-10 w-10 shrink-0 overflow-hidden [&_img]:!h-10 [&_img]:!w-auto [&_img]:max-w-none [&_p]:hidden">{marca}</div> : marca}
      </div>
      <div className="relative mx-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <nav className={`relative flex-1 overflow-y-auto py-5 ${fino ? "space-y-3 px-2" : "space-y-6 px-3"}`}>
        {grupos.map((g) => (
          <div key={g.titulo}>
            {fino ? <div className="mx-3 mb-2 h-px bg-white/10" aria-hidden /> : <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-mata-300/70 uppercase">{g.titulo}</p>}
            <div className="space-y-0.5">
              {g.itens.map((i) => {
                const Icone = ICONES[i.icone];
                const on = ativo(i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    aria-current={on ? "page" : undefined}
                    title={fino ? i.rotulo : undefined}
                    aria-label={fino ? i.rotulo : undefined}
                    className={`group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition ${fino ? "justify-center px-0" : "gap-3 px-3"} ${
                      on ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" : "text-mata-200/90 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {on && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-ouro-400" />}
                    <Icone size={18} className={on ? "text-ouro-400" : "text-mata-300/80 transition group-hover:text-mata-100"} />
                    {!fino && i.rotulo}
                    {!!i.aviso && fino && <span className="absolute top-1.5 right-2 h-2.5 w-2.5 rounded-full bg-ouro-400 ring-2 ring-mata-950" aria-hidden />}
                    {!!i.aviso && !fino && (
                      <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-ouro-400 px-1.5 text-[11px] font-bold text-mata-950 tabular-nums" title="Cadastros aguardando aprovação">
                        {i.aviso}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative p-3">
        {inst.disponivel && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => (inst.nativo ? void inst.instalar() : setDicaIos((v) => !v))}
              title={fino ? "Instalar app do painel" : undefined}
              aria-label={fino ? "Instalar app do painel" : undefined}
              className={`flex w-full items-center rounded-xl border border-ouro-400/30 bg-ouro-400/10 py-2.5 text-sm font-medium text-ouro-200 transition hover:bg-ouro-400/20 ${fino ? "justify-center px-0" : "gap-3 px-3"}`}
            >
              <Download size={18} className="text-ouro-400" /> {!fino && "Instalar app do painel"}
            </button>
            {dicaIos && !inst.nativo && !fino && (
              <p className="mt-1.5 px-1 text-xs leading-relaxed text-mata-200/80">
                Toque em <Share size={12} className="mx-0.5 inline -translate-y-px" aria-label="Compartilhar" /> no Safari e depois em <strong>Adicionar à Tela de Início</strong>.
              </p>
            )}
          </div>
        )}
        {/* Recolher / expandir (só no computador e tablet) */}
        <button
          type="button"
          onClick={alternarFino}
          title={fino ? "Expandir menu" : "Recolher menu"}
          aria-label={fino ? "Expandir menu" : "Recolher menu"}
          className={`mb-2 hidden w-full items-center rounded-xl py-2 text-sm font-medium text-mata-300 transition hover:bg-white/[0.06] hover:text-white md:flex ${fino ? "justify-center px-0" : "gap-3 px-3"}`}
        >
          {fino ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Recolher menu</>}
        </button>
        {fino ? (
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
            <Link href="/admin/perfil" title={`${usuario.nome} · Meu perfil`} aria-label="Meu perfil" className="rounded-xl p-0.5 transition hover:bg-white/[0.06]">
              <Avatar nome={usuario.nome} foto={usuario.foto} perfil={usuario.perfilId} tamanho={34} className="ring-white/20" />
            </Link>
            <form action={sair}>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-mata-300 transition hover:bg-white/10 hover:text-white" aria-label="Sair" title="Sair"><LogOut size={16} /></button>
            </form>
          </div>
        ) : (
          <div className={`flex items-center gap-1 rounded-2xl border p-1.5 transition ${path.startsWith("/admin/perfil") ? "border-ouro-400/40 bg-white/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
            <Link href="/admin/perfil" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition hover:bg-white/[0.06]" title="Meu perfil">
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
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 md:block ${fino ? "w-[4.5rem]" : "w-64 xl:w-72"}`}>{montar(fino)}</aside>

      {/* Mobile: barra no topo + gaveta */}
      <div className={`sticky top-0 z-30 items-center justify-between gap-3 border-b border-white/10 bg-mata-950 px-4 py-3 md:hidden ${semBarra ? "hidden" : "flex"}`}>
        <div className="min-w-0 [&_img]:!h-9 [&_p.text-xs]:hidden">{marca}</div>
        <button onClick={() => setAberto(true)} className="grid h-10 w-10 place-items-center rounded-xl text-mata-100 hover:bg-white/10" aria-label="Abrir menu">
          <MenuIcone size={22} />
        </button>
      </div>
      {aberto && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-mata-950/60 backdrop-blur-sm" aria-label="Fechar menu" onClick={() => setAberto(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] animate-gaveta shadow-2xl">
            {montar(false)}
            <button onClick={() => setAberto(false)} className="absolute top-5 right-3 grid h-9 w-9 place-items-center rounded-lg text-mata-200 hover:bg-white/10" aria-label="Fechar menu">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
