"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Mars, Search, UsersRound, Venus, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import type { Funcao, Sexo } from "@/lib/types";

type Pessoa = {
  id: string; nome: string; foto: string | null; sexo: Sexo | null; funcao: Funcao;
  total: number; ultimoTexto: string; suspenso: boolean;
};

const CATEGORIAS = [
  { id: "todos", nome: "Todos" },
  { id: "guardioes", nome: "Guardiões" },
  { id: "mestres", nome: "Mestres" },
] as const;

const GENEROS = [
  { id: "todos", nome: "Todos os gêneros", Icone: UsersRound },
  { id: "masculino", nome: "Masculino", Icone: Mars },
  { id: "feminino", nome: "Feminino", Icone: Venus },
] as const;

const semAcentos = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Busca, função e gênero se combinam no navegador; a URL permite compartilhar e voltar aos filtros. */
export function ListaSoldados({ pessoas }: { pessoas: Pessoa[] }) {
  const caminho = usePathname();
  const params = useSearchParams();
  const busca = params.get("q") ?? "";
  const [buscaAberta, setBuscaAberta] = useState(false);
  const campoBusca = useRef<HTMLInputElement>(null);
  const buscando = buscaAberta || !!busca;
  const cat = params.get("categoria");
  const categoria = cat === "guardioes" || cat === "mestres" ? cat : "todos";
  const gen = params.get("genero");
  const genero = gen === "masculino" || gen === "feminino" ? gen : "todos";

  function filtrar(chave: string, valor: string, substituir = false) {
    const p = new URLSearchParams(window.location.search);
    if (!valor || valor === "todos") p.delete(chave);
    else p.set(chave, valor);
    const qs = p.toString();
    const url = qs ? `${caminho}?${qs}` : caminho;
    // O histórico nativo integra com useSearchParams sem buscar novamente a lista no servidor.
    if (substituir) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }

  function cancelarBusca() {
    filtrar("q", "", true);
    setBuscaAberta(false);
    campoBusca.current?.blur();
  }

  const encontradas = useMemo(() => {
    const termo = semAcentos(busca.trim());
    return pessoas.filter((p) => (genero === "todos" || p.sexo === genero) && (!termo || semAcentos(p.nome).includes(termo)));
  }, [busca, genero, pessoas]);
  const daCategoria = (p: Pessoa) => categoria === "todos" || p.funcao === (categoria === "mestres" ? "mestre" : "guardiao");
  const filtradas = encontradas.filter(daCategoria);
  const totalCategoria = (id: string) => encontradas.filter((p) => id === "todos" || p.funcao === (id === "mestres" ? "mestre" : "guardiao")).length;
  const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";

  return (
    <>
      <div role="group" aria-label="Filtrar por função" className="flex gap-2 overflow-x-auto px-4 pb-3 sem-barra">
        {CATEGORIAS.map((c) => (
          <button key={c.id} type="button" aria-pressed={categoria === c.id} onClick={() => filtrar("categoria", c.id)}
            className={`chip-app min-h-11 shrink-0 ${foco} ${categoria === c.id ? "chip-app-on" : ""}`}>
            {c.nome} · {totalCategoria(c.id)}
          </button>
        ))}
      </div>

      <div className="mx-4 mb-3 flex items-center gap-2">
        <label className="relative block min-w-0 flex-1">
          <Search aria-hidden size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
          <input ref={campoBusca} type="search" value={busca} onFocus={() => setBuscaAberta(true)}
            onChange={(e) => filtrar("q", e.target.value, true)}
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); cancelarBusca(); } }}
            aria-label="Buscar soldado pelo nome" placeholder="Buscar nome" inputMode="search" maxLength={100}
            className="campo h-12 rounded-2xl pr-10 pl-9 text-base [&::-webkit-search-cancel-button]:hidden" />
          {buscando && (
            <button type="button" aria-label="Cancelar busca" onClick={cancelarBusca}
              className={`absolute top-1/2 right-0 grid h-11 w-10 -translate-y-1/2 place-items-center rounded-full text-stone-500 active:bg-stone-100 ${foco}`}>
              <X aria-hidden size={16} />
            </button>
          )}
        </label>

        {!buscando && <div role="group" aria-label="Filtrar por gênero" className="flex shrink-0 gap-0.5 rounded-2xl bg-white p-0.5 ring-1 ring-stone-200/70">
          {GENEROS.map(({ id, nome, Icone }) => (
            <button key={id} type="button" title={nome} aria-label={nome} aria-pressed={genero === id}
              onClick={() => filtrar("genero", id)}
              className={`grid h-11 w-11 place-items-center rounded-xl transition active:scale-95 ${foco} ${genero === id ? "bg-emerald-600 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
              <Icone aria-hidden size={19} />
            </button>
          ))}
        </div>}
      </div>

      <p role="status" aria-live="polite" className="sr-only">{filtradas.length} {filtradas.length === 1 ? "soldado encontrado" : "soldados encontrados"}</p>
      {filtradas.length === 0 ? (
        <div className="mx-4 rounded-3xl bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-stone-200/70">
          <p>{pessoas.length === 0 ? "Ninguém aqui ainda. Guardiões, guardiãs e mestres ativos aparecem nesta lista." : "Nenhum soldado encontrado com os filtros selecionados."}</p>
          {pessoas.length > 0 && <button type="button" onClick={() => window.history.pushState(null, "", caminho)} className={`mt-3 min-h-11 rounded-xl px-3 font-semibold text-emerald-700 ${foco}`}>Limpar filtros</button>}
        </div>
      ) : (
        <ul className="mx-4 divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-cartao ring-1 ring-stone-200/70">
          {filtradas.map((p) => (
            <li key={p.id}>
              <Link href={`/guarnicao/guardioes/${p.id}`} className={`flex items-center gap-3 px-4 py-3 active:bg-stone-50 ${foco}`}>
                <Avatar nome={p.nome} foto={p.foto} tamanho={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-semibold text-stone-900"><span className="truncate">{p.nome}</span>{p.sexo && <IconeGenero genero={p.sexo} size={12} />}</span>
                  <span className="block text-xs font-medium text-emerald-700">{p.funcao === "mestre" ? p.sexo === "feminino" ? "Mestra" : "Mestre" : p.sexo === "feminino" ? "Guardiã" : "Guardião"}</span>
                  <span className="block text-xs text-stone-500">{p.suspenso ? "Suspenso · " : ""}{p.ultimoTexto}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg leading-none font-bold text-stone-900 tabular-nums">{p.total}</span>
                  <span className="text-[10px] text-stone-400">rituais</span>
                </span>
                <ChevronRight aria-hidden size={16} className="shrink-0 text-stone-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
