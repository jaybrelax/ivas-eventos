"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Star } from "lucide-react";
import type { TipoEvento } from "@/lib/types";
import { Carregando } from "@/components/ui";

/** Filtros da agenda: aplicam na hora, sem botão. */
export function Filtros({ tipos }: { tipos: Pick<TipoEvento, "$id" | "nome" | "cor">[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const tipo = sp.get("tipo") ?? "";
  const destaque = sp.get("destaque") === "1";

  const mudar = (chave: string, valor: string | null) => {
    const p = new URLSearchParams(sp);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    p.delete("ok");
    iniciar(() => router.replace(`/eventos?${p}`, { scroll: false }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={tipo} onChange={(e) => mudar("tipo", e.target.value || null)} className="campo w-auto min-w-44" aria-label="Filtrar por tipo">
        <option value="">Todos os tipos</option>
        {tipos.map((t) => <option key={t.$id} value={t.$id}>{t.nome}</option>)}
      </select>
      <button
        type="button"
        onClick={() => mudar("destaque", destaque ? null : "1")}
        aria-pressed={destaque}
        className={`btn h-10 border px-3.5 ${destaque ? "border-ouro-300 bg-ouro-50 text-ouro-700" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
      >
        <Star size={15} className={destaque ? "fill-ouro-500 text-ouro-500" : ""} />
        Destaques
      </button>
      {pendente && <span className="text-stone-400"><Carregando /></span>}
    </div>
  );
}
