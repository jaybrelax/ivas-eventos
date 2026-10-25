"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, IdCard } from "lucide-react";

/** "Exibir ficha completa": mostra os demais dados do cadastro e o botão de editar. */
export function FichaCompleta({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-mata-700 ring-1 ring-mata-200 transition hover:bg-mata-50"
      >
        <IdCard size={16} /> {aberta ? "Ocultar ficha completa" : "Exibir ficha completa"}
        <ChevronDown size={15} className={`transition-transform ${aberta ? "rotate-180" : ""}`} />
      </button>
      {aberta && <div className="mt-4 animate-surgir">{children}</div>}
    </div>
  );
}
