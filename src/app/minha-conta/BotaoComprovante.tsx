"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileImage, X } from "lucide-react";

/** "Ver comprovante": abre a imagem num lightbox por cima da página, em vez de uma aba nova. */
export function BotaoComprovante({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="inline-flex items-center gap-1 text-mata-700 hover:underline">
        <FileImage size={13} /> Ver comprovante
      </button>

      {aberto && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Comprovante de pagamento" className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAberto(false)}>
          <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-sm" />
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/comprovante/${id}`}
            alt="Comprovante de pagamento"
            className="relative z-10 max-h-[90dvh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
