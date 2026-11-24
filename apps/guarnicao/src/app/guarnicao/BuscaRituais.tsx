"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Carregando } from "@/components/ui";

type ControleBusca = { aberta: boolean; abrir: (aberta: boolean) => void; gatilho: RefObject<HTMLButtonElement | null>; input: RefObject<HTMLInputElement | null> };
const ContextoBusca = createContext<ControleBusca | null>(null);

export function BuscaRecolhivel({ inicial, children }: { inicial: string; children: ReactNode }) {
  const [aberta, abrir] = useState(!!inicial);
  const gatilho = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  return <ContextoBusca.Provider value={{ aberta, abrir, gatilho, input }}>{children}</ContextoBusca.Provider>;
}

/** A mesma lupa e o mesmo fundo da busca, recolhidos ao lado do título. */
export function AbrirBuscaRituais() {
  const busca = useContext(ContextoBusca)!;
  return <button ref={busca.gatilho} type="button" aria-label="Buscar ritual" aria-expanded={busca.aberta} aria-controls="busca-rituais-recolhivel" tabIndex={busca.aberta ? -1 : 0} onClick={() => {
    flushSync(() => busca.abrir(true));
    busca.input.current?.focus({ preventScroll: true });
  }} className={`campo campo-busca-rituais mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl p-0 text-stone-400 transition-opacity motion-reduce:transition-none ${busca.aberta ? "pointer-events-none opacity-0" : "opacity-100"}`}><Search size={15} /></button>;
}

/**
 * Busca de rituais pelo tema (título) ou pelo número geral. Atualiza `?q=` na URL enquanto digita
 * (com uma pequena espera) e mantém os outros filtros da tela.
 */
export function BuscaRituais({ inicial, manter }: { inicial: string; /** Outros parâmetros da URL a preservar (ex.: filtro). */ manter: Record<string, string> }) {
  const router = useRouter();
  const caminho = usePathname();
  const [valor, setValor] = useState(inicial);
  const [buscando, iniciar] = useTransition();
  const primeira = useRef(true);
  const controle = useContext(ContextoBusca);
  const campo = useRef<HTMLDivElement>(null);
  const montou = useRef(false);
  const aberta = controle?.aberta;

  useLayoutEffect(() => {
    if (!controle || !campo.current || !controle.gatilho.current) return;
    if (!montou.current) { montou.current = true; return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const origem = controle.gatilho.current.getBoundingClientRect();
    const destino = campo.current.getBoundingClientRect();
    const recolhido = { transform: `translate(${origem.left - destino.left}px, ${origem.top - destino.top}px) scale(${origem.width / destino.width}, ${origem.height / destino.height})`, borderRadius: "16px", opacity: 0.7, visibility: "visible" as const };
    const expandido = { transform: "translate(0, 0) scale(1, 1)", borderRadius: "24px", opacity: 1, visibility: "visible" as const };
    const animacao = campo.current.animate(aberta ? [recolhido, expandido] : [expandido, recolhido], { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    return () => animacao.cancel();
    // As refs são estáveis; a animação só acompanha abrir/recolher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta]);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = setTimeout(() => {
      const p = new URLSearchParams(manter);
      if (valor.trim()) p.set("q", valor.trim());
      const qs = p.toString();
      iniciar(() => router.replace(qs ? `${caminho}?${qs}` : caminho, { scroll: false }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const conteudo = (
    <label className="relative block min-w-0 flex-1">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400">
          {buscando ? <Carregando /> : <Search size={15} />}
        </span>
        <input
          ref={controle?.input}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape" && controle) { e.preventDefault(); setValor(""); controle.abrir(false); controle.gatilho.current?.focus({ preventScroll: true }); } }}
          placeholder="Tema ou nº do ritual"
          aria-label="Buscar ritual por tema ou número"
          maxLength={60}
          className="campo campo-busca-rituais h-9 rounded-full border-stone-200/70 pr-9 pl-9 text-sm shadow-none focus:border-mata-300 focus:ring-1 focus:ring-mata-100 [&::-webkit-search-cancel-button]:hidden"
        />
        {(valor || controle) && (
          <button type="button" onClick={() => { setValor(""); if (controle) { controle.abrir(false); controle.gatilho.current?.focus({ preventScroll: true }); } }} aria-label={controle ? "Fechar e limpar busca" : "Limpar busca"} className="absolute top-1/2 right-1 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 active:bg-stone-100">
            <X size={16} />
          </button>
        )}
    </label>
  );
  if (!controle) return conteudo;
  return <div id="busca-rituais-recolhivel" inert={!controle.aberta} className="relative mx-5 transition-[height] duration-300 ease-out motion-reduce:transition-none" style={{ height: controle.aberta ? 52 : 0 }}>
    <div ref={campo} className="absolute inset-x-0 top-1 z-20 flex origin-top-left" style={{ visibility: controle.aberta ? "visible" : "hidden" }}>{conteudo}</div>
  </div>;
}
