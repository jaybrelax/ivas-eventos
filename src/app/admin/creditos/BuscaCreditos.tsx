"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Carregando } from "@/components/ui";

/**
 * Busca de pessoa da página de créditos, isolada acima das abas. Vale para as quatro abas (Pacotes, Saldos,
 * Débitos e Histórico): o termo fica na URL (?q=) e as abas o mantêm ao trocar.
 */
export function BuscaCreditos({ className = "w-full sm:w-80" }: { className?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const atual = sp.get("q") ?? "";
  const [valor, setValor] = useState(atual);
  const [pendente, iniciar] = useTransition();
  const ultimo = useRef(atual);

  // Quando a URL muda por outro caminho (ex.: voltar no navegador), o campo acompanha
  useEffect(() => { setValor(atual); ultimo.current = atual; }, [atual]);

  // Espera a pessoa parar de digitar antes de buscar
  useEffect(() => {
    const termo = valor.trim();
    if (termo === ultimo.current) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams(sp.toString());
      if (termo) p.set("q", termo); else p.delete("q");
      p.delete("paginas");
      ultimo.current = termo;
      iniciar(() => router.replace(`/admin/creditos?${p}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className={`relative ${className}`}>
      <label htmlFor="busca-creditos" className="sr-only">Buscar pessoa nos créditos</label>
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400" aria-hidden />
      <input
        id="busca-creditos"
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar pessoa…"
        autoComplete="off"
        enterKeyHint="search"
        className="campo h-11 w-full pr-10 pl-10 text-base sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 place-items-center">
        {pendente ? (
          <Carregando />
        ) : valor ? (
          <button type="button" onClick={() => { setValor(""); }} className="grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Limpar a busca">
            <X size={15} aria-hidden />
          </button>
        ) : null}
      </span>
    </form>
  );
}
