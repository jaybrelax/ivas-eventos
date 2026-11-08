"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Carregando } from "@/components/ui";

/**
 * Busca de rituais pelo tema (título) ou pelo número geral. Atualiza `?q=` na URL enquanto digita
 * (com uma pequena espera) e mantém os outros filtros da tela.
 */
export function BuscaRituais({ inicial, manter }: { inicial: string; /** Outros parâmetros da URL a preservar (ex.: filtro). */ manter: Record<string, string> }) {
  const router = useRouter();
  const [valor, setValor] = useState(inicial);
  const [buscando, iniciar] = useTransition();
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = setTimeout(() => {
      const p = new URLSearchParams(manter);
      if (valor.trim()) p.set("q", valor.trim());
      const qs = p.toString();
      iniciar(() => router.replace(qs ? `/guarnicao?${qs}` : "/guarnicao", { scroll: false }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <label className="relative block min-w-0 flex-1">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400">
          {buscando ? <Carregando /> : <Search size={15} />}
        </span>
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Tema ou nº do ritual"
          aria-label="Buscar ritual por tema ou número"
          maxLength={60}
          className="campo h-9 rounded-full pr-9 pl-9 text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {valor && (
          <button type="button" onClick={() => setValor("")} aria-label="Limpar busca" className="absolute top-1/2 right-1 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 active:bg-stone-100">
            <X size={16} />
          </button>
        )}
    </label>
  );
}
