"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Link2, MoreVertical, Pencil, Share2 } from "lucide-react";
import { toast } from "@/components/Toaster";

/**
 * Menu de ações do evento no mobile (substitui os botões do cabeçalho): editar/visualizar,
 * ver a página pública, copiar o link e compartilhar.
 */
export function MenuEventoMobile({ url, caminho, titulo, editarHref, visualizarHref, claro = false }: {
  url: string; caminho: string; titulo: string; editarHref?: string; visualizarHref?: string;
  /** Botão claro, para ficar sobre a imagem do evento. */
  claro?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [aberto]);

  async function copiar() {
    setAberto(false);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = url;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand("copy");
      campo.remove();
      if (!ok) return toast("Não foi possível copiar o link.");
    }
    toast("Link público copiado.", "ok");
  }

  async function compartilhar() {
    setAberto(false);
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: titulo, url }); } catch { /* cancelado pela pessoa */ }
    } else {
      await copiar();
    }
  }

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
        <MoreVertical size={20} aria-hidden />
      </button>
      {aberto && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-1 w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-elevado">
          {editarHref && <Link role="menuitem" href={editarHref} className={item}><Pencil size={16} className="text-mata-600" aria-hidden /> Editar evento</Link>}
          {visualizarHref && <Link role="menuitem" href={visualizarHref} className={item}><Eye size={16} className="text-mata-600" aria-hidden /> Visualizar evento</Link>}
          <Link role="menuitem" href={caminho} target="_blank" rel="noopener noreferrer" className={item}><Eye size={16} className="text-mata-600" aria-hidden /> Ver página</Link>
          <button role="menuitem" type="button" onClick={copiar} className={item}><Link2 size={16} className="text-mata-600" aria-hidden /> Copiar link</button>
          <button role="menuitem" type="button" onClick={compartilhar} className={item}><Share2 size={16} className="text-mata-600" aria-hidden /> Compartilhar</button>
        </div>
      )}
    </div>
  );
}
