"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import type { Sexo } from "@/lib/types";

type Pessoa = { id: string; nome: string; foto: string | null; sexo: Sexo | null; total: number; ultimoTexto: string };

/** Lista de guardiões com busca por nome (filtra enquanto digita, sem diferenciar acentos). */
export function ListaGuardioes({ pessoas }: { pessoas: Pessoa[] }) {
  const [busca, setBusca] = useState("");
  const sem = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const filtradas = useMemo(() => {
    const termo = sem(busca.trim());
    return termo ? pessoas.filter((p) => sem(p.nome).includes(termo)) : pessoas;
  }, [busca, pessoas]);

  return (
    <>
      <label className="relative mx-4 mb-3 block">
        <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pelo nome"
          inputMode="search"
          className="campo h-12 rounded-2xl pr-11 pl-11 text-base"
        />
        {busca && (
          <button type="button" aria-label="Limpar busca" onClick={() => setBusca("")} className="absolute top-1/2 right-2.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-stone-400 active:bg-stone-100">
            <X size={16} />
          </button>
        )}
      </label>

      {filtradas.length === 0 ? (
        <p className="mx-4 rounded-3xl bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-stone-200/70">Ninguém encontrado com “{busca}”.</p>
      ) : (
        <ul className="mx-4 divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-cartao ring-1 ring-stone-200/70">
          {filtradas.map((p) => (
            <li key={p.id}>
              <Link href={`/guarnicao/guardioes/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-stone-50">
                <Avatar nome={p.nome} foto={p.foto} tamanho={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-semibold text-stone-900">{p.nome} {p.sexo && <IconeGenero genero={p.sexo} size={12} />}</span>
                  <span className="block text-xs text-stone-500">{p.ultimoTexto}</span>
                </span>
                <span className="text-right">
                  <span className="block text-lg leading-none font-bold text-stone-900 tabular-nums">{p.total}</span>
                  <span className="text-[10px] text-stone-400">rituais</span>
                </span>
                <ChevronRight size={16} className="text-stone-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
