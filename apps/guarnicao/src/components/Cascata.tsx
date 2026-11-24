"use client";

import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

/**
 * Bloco que se abre e fecha (cascata): o cabeçalho fica sempre à vista. Os campos continuam no formulário
 * mesmo com o bloco fechado (só ficam escondidos), então são salvos normalmente.
 */
export function Cascata({ titulo, icone: Icone, children }: { titulo: string; icone?: LucideIcon; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-2xl ring-1 ring-stone-200/80 bg-white/60">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-stone-800"
      >
        {Icone && <Icone size={17} className="shrink-0 text-stone-500" aria-hidden />}
        <span className="flex-1">{titulo}</span>
        <ChevronDown size={18} className={`shrink-0 text-stone-400 transition ${aberto ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <div className={`space-y-4 px-4 pb-4 ${aberto ? "" : "hidden"}`}>{children}</div>
    </div>
  );
}
