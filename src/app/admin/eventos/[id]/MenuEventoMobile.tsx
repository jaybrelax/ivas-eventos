"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Copy, Eye, LayoutDashboard, Menu, Pencil, Settings, Share2, X } from "lucide-react";
import { toast } from "@/components/Toaster";
import { urlImagem } from "@/lib/links";

/** Resumo do evento mostrado nos cards do modal "Compartilhar". */
export type ResumoCompartilhar = {
  capaFileId: string | null;
  /** Ex.: "domingo, 22 de novembro · 15:00". */
  data: string;
  /** Ex.: "N° 535 · 90/2026" (vazio quando o evento não tem numeração). */
  numeros: string | null;
  /** Endereço completo da página de gestão deste evento. */
  gestaoUrl: string;
};

/** Copia o texto; sem permissão da área de transferência, tenta o método antigo. */
async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand("copy");
    campo.remove();
    return ok;
  }
}

/**
 * Menu de ações do evento no mobile (substitui os botões do cabeçalho): editar/visualizar, ver a
 * página pública, compartilhar (modal com os links) e voltar ao dashboard.
 */
export function MenuEventoMobile({ url, caminho, titulo, resumo, editarHref, visualizarHref, claro = false }: {
  url: string; caminho: string; titulo: string; resumo?: ResumoCompartilhar; editarHref?: string; visualizarHref?: string;
  /** Botão claro, para ficar sobre a imagem do evento. */
  claro?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [aberto]);

  const item = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100";

  return (
    <div ref={raiz} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Ações do evento"
        className={`grid h-11 w-11 place-items-center rounded-full transition ${claro ? "bg-black/15 text-white backdrop-blur-md active:scale-95 active:bg-black/25" : "text-stone-600 hover:bg-stone-100 active:bg-stone-200"}`}
      >
        {/* O ícone gira ao abrir/fechar */}
        <Menu size={22} aria-hidden className={`transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${aberto ? "rotate-90" : ""}`} />
      </button>
      {aberto && (
        <div role="menu" className="menu-pop absolute top-full right-0 z-30 mt-2 w-56 rounded-2xl border border-black/[0.06] bg-white/95 p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.06),0_18px_40px_-10px_rgb(20_42_29/0.35)] backdrop-blur-xl">
          {editarHref && <Link role="menuitem" href={editarHref} className={item}><Pencil size={16} className="text-mata-600" aria-hidden /> Editar evento</Link>}
          {visualizarHref && <Link role="menuitem" href={visualizarHref} className={item}><Eye size={16} className="text-mata-600" aria-hidden /> Visualizar evento</Link>}
          <Link role="menuitem" href={caminho} target="_blank" rel="noopener noreferrer" className={item}><Eye size={16} className="text-mata-600" aria-hidden /> Ver página</Link>
          {resumo && (
            <button role="menuitem" type="button" onClick={() => { setAberto(false); setCompartilhando(true); }} className={item}><Share2 size={16} className="text-mata-600" aria-hidden /> Compartilhar</button>
          )}
          <Link role="menuitem" href="/admin" className={item}><LayoutDashboard size={16} className="text-mata-600" aria-hidden /> Dashboard</Link>
        </div>
      )}
      {compartilhando && resumo && <ModalCompartilhar titulo={titulo} urlPublica={url} resumo={resumo} fechar={() => setCompartilhando(false)} />}
    </div>
  );
}

/** Modal com os dois links do evento, cada um num card com botão de copiar. */
function ModalCompartilhar({ titulo, urlPublica, resumo, fechar }: { titulo: string; urlPublica: string; resumo: ResumoCompartilhar; fechar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", tecla);
    const corpo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = corpo; };
  }, [fechar]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="compartilhar-titulo" className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-mata-950/50 backdrop-blur-sm" onClick={fechar} />
      <div className="relative max-h-[92vh] w-full max-w-md animate-surgir overflow-y-auto rounded-t-3xl bg-fundo p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-elevado sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="compartilhar-titulo" className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-mata-50 text-mata-600"><Share2 size={16} aria-hidden /></span> Compartilhar
          </h2>
          <button type="button" onClick={fechar} className="grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <CartaoLink rotulo="Link público de divulgação" link={urlPublica} titulo={titulo} resumo={resumo} aviso="Link público copiado." />
          <CartaoLink rotulo="Link de gestão" link={resumo.gestaoUrl} titulo={titulo} resumo={resumo} aviso="Link de gestão copiado." ajuda="Só abre para quem tem acesso ao painel." gestao />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CartaoLink({ rotulo, link, titulo, resumo, aviso, ajuda, gestao = false }: {
  rotulo: string; link: string; titulo: string; resumo: ResumoCompartilhar; aviso: string; ajuda?: string;
  /** Versão de gestão: imagem desfocada com ícone de engrenagem e "Gestão:" antes do título. */
  gestao?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function copiar() {
    if (!(await copiarTexto(link))) return toast("Não foi possível copiar o link. Copie manualmente abaixo.");
    toast(aviso, "ok");
    setCopiado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 2200);
  }

  return (
    <section>
      <h3 className="mb-1.5 px-1 text-xs font-semibold tracking-wider text-stone-500 uppercase">{rotulo}</h3>
      <div className="cartao space-y-3 p-3 sm:p-3">
        <div className="flex items-center gap-3">
          <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-mata-900 ring-1 ring-black/[0.06]">
            {resumo.capaFileId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlImagem(resumo.capaFileId, 320)} alt="" className={`h-full w-full object-cover ${gestao ? "scale-110 blur-[4px] saturate-125" : ""}`} />
            )}
            {gestao && (
              <span className="absolute inset-0 grid place-items-center bg-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-mata-950/45 backdrop-blur-sm">
                  <Settings size={22} strokeWidth={2} className="text-white" aria-hidden />
                </span>
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-display text-[15px] leading-tight font-semibold text-stone-900">{gestao && <span className="text-mata-700">Gestão: </span>}{titulo}</p>
            <p className="mt-1 text-xs text-stone-500 first-letter:uppercase">{resumo.data}</p>
            {resumo.numeros && <p className="mt-0.5 text-xs font-semibold text-mata-700 tabular-nums">{resumo.numeros}</p>}
          </div>
        </div>
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={rotulo} className="campo h-10 text-xs text-stone-600" />
        {ajuda && <p className="-mt-1 px-0.5 text-[11px] text-stone-400">{ajuda}</p>}
        <button
          type="button"
          onClick={copiar}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.99] ${copiado ? "bg-emerald-600 text-white" : "btn-primario"}`}
        >
          {copiado ? <><Check size={16} strokeWidth={2.6} aria-hidden /> Link copiado</> : <><Copy size={16} aria-hidden /> Copiar link</>}
        </button>
      </div>
    </section>
  );
}
