"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Dose } from "@/lib/doses";
import { Dosagem } from "./Dosagem";
import { salvarDosesEquipeAction } from "./participantes-actions";

/** Modal de dosagem de quem é da equipe do ritual (sem inscrição): só o card Dosagem. */
export function ModalDosagemEquipe({ eventoId, pessoa, rotulo, inicial, fechar }: {
  eventoId: string; pessoa: { id: string; nome: string; foto: string | null }; rotulo: string; inicial: Dose[]; fechar: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = rolagem; };
  }, [fechar]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Dosagem de ${pessoa.nome}`} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg animate-surgir flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="relative flex shrink-0 items-center gap-3.5 border-b border-stone-100 bg-gradient-to-b from-mata-50/80 to-white px-5 pt-5 pb-4">
          <button type="button" onClick={fechar} className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
            <X size={17} />
          </button>
          <Avatar nome={pessoa.nome} foto={pessoa.foto} tamanho={56} />
          <div className="min-w-0 pr-8">
            <p className="text-[11px] font-semibold tracking-wider text-mata-600 uppercase">{rotulo} do ritual</p>
            <h3 className="truncate text-lg font-semibold text-stone-900">{pessoa.nome}</h3>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <Dosagem salvarDoses={(l) => salvarDosesEquipeAction(eventoId, pessoa.id, l)} inicial={inicial} aoSalvar={() => {}} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
