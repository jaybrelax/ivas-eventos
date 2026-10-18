"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Filter, Star, X } from "lucide-react";
import type { TipoEvento } from "@/lib/types";
import { Carregando } from "@/components/ui";

/**
 * Filtros da agenda atrás de um botão com ícone. Nada é aplicado ao abrir o painel:
 * o filtro só muda quando o usuário toca num tipo ou em Destaques.
 */
export function Filtros({ tipos }: { tipos: Pick<TipoEvento, "$id" | "nome" | "cor">[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);

  const tipo = sp.get("tipo") ?? "";
  const destaque = sp.get("destaque") === "1";
  const ativos = (tipo ? 1 : 0) + (destaque ? 1 : 0);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const aplicar = (chave: string, valor: string | null) => {
    const p = new URLSearchParams(sp);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    p.delete("ok");
    iniciar(() => router.replace(`/admin/eventos?${p}`, { scroll: false }));
  };

  const limpar = () => {
    const p = new URLSearchParams(sp);
    p.delete("tipo");
    p.delete("destaque");
    p.delete("ok");
    iniciar(() => router.replace(`/admin/eventos?${p}`, { scroll: false }));
  };

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className={`btn h-10 border px-3.5 ${
          ativos ? "border-mata-300 bg-mata-50 text-mata-800" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
        }`}
      >
        {pendente ? <Carregando /> : <Filter size={16} />}
        Filtros
        {ativos > 0 && <span className="chip min-w-5 justify-center bg-mata-700 px-1.5 text-[11px] text-white tabular-nums">{ativos}</span>}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Filtrar eventos"
          className="absolute top-full right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-surgir rounded-2xl border border-stone-200 bg-white p-4 shadow-elevado"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-900">Filtrar eventos</p>
            <button type="button" onClick={() => setAberto(false)} className="btn-icone h-8 w-8" aria-label="Fechar filtros">
              <X size={15} />
            </button>
          </div>

          <p className="mb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Tipo de evento</p>
          <div className="flex flex-wrap gap-1.5">
            {tipos.map((t) => {
              const on = tipo === t.$id;
              return (
                <button
                  key={t.$id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => aplicar("tipo", on ? null : t.$id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    on ? "border-transparent text-white shadow-sm" : "border-stone-200 text-stone-700 hover:border-stone-300"
                  }`}
                  style={on ? { background: t.cor } : undefined}
                >
                  {on ? <Check size={12} strokeWidth={3} /> : <span className="h-2 w-2 rounded-full" style={{ background: t.cor }} />}
                  {t.nome}
                </button>
              );
            })}
          </div>

          <p className="mt-4 mb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Destaque</p>
          <button
            type="button"
            aria-pressed={destaque}
            onClick={() => aplicar("destaque", destaque ? null : "1")}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
              destaque ? "border-ouro-300 bg-ouro-50" : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <Star size={16} className={destaque ? "fill-ouro-500 text-ouro-500" : "text-stone-400"} />
            <span className="flex-1 text-sm font-medium text-stone-800">Só eventos em destaque</span>
            <span className={`grid h-5 w-5 place-items-center rounded-full border ${destaque ? "border-ouro-500 bg-ouro-500 text-white" : "border-stone-300"}`}>
              {destaque && <Check size={12} strokeWidth={3} />}
            </span>
          </button>

          {ativos > 0 && (
            <div className="mt-4 flex justify-end border-t border-stone-100 pt-3">
              <button type="button" onClick={limpar} className="text-xs font-medium text-stone-500 hover:text-stone-900">
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
