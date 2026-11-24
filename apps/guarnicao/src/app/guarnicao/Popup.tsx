"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Pop-up flutuante no meio da tela (a Folha, ao contrário, sobe de baixo). Sempre no estilo escuro.
 * Fecha tocando fora, no X ou com Esc.
 */
export function Popup({ aberto, aoFechar, titulo, children }: { aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = antes;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return createPortal(
    <div className="tema-escuro fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 animate-aparecer bg-black/60 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[85dvh] w-full max-w-md animate-surgir flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)] ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="text-lg font-bold text-stone-900">{titulo}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-600 active:scale-90">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
