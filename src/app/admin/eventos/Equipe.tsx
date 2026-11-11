"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import type { Funcao, Pessoa, Sexo } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";

const SEXOS: { id: Sexo | null; rotulo: string }[] = [
  { id: "masculino", rotulo: "Masculino" },
  { id: "feminino", rotulo: "Feminino" },
  { id: null, rotulo: "Gênero não informado" },
];

export const NOME_FUNCAO: Record<Funcao, { um: string; varios: string }> = {
  mestre: { um: "Mestre", varios: "Mestres" },
  guardiao: { um: "Guardião", varios: "Guardiões" },
};

/** Escolha múltipla de mestres ou guardiões, separados em Masculino e Feminino. */
export function EscolhaEquipe({ funcao, equipe, inicial, campo }: { funcao: Funcao; equipe: Pessoa[]; inicial: string[]; campo?: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set(inicial));
  const [busca, setBusca] = useState("");
  const pessoas = equipe.filter((p) => p.funcao === funcao);
  const termo = busca.trim().toLowerCase();
  const visiveis = termo ? pessoas.filter((p) => p.nome.toLowerCase().includes(termo)) : pessoas;
  const alternar = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const nome = campo ?? (funcao === "mestre" ? "mestres" : "guardioes");
  const rotulo = NOME_FUNCAO[funcao];

  return (
    <div>
      {[...sel].map((id) => <input key={id} type="hidden" name={nome} value={id} />)}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          {rotulo.varios}
          <span className={`chip tabular-nums ${sel.size ? "bg-mata-100 text-mata-800" : "bg-stone-100 text-stone-500"}`}>{sel.size}</span>
        </h3>
        {pessoas.length > 8 && (
          <label className="relative">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-stone-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="campo h-8 w-40 pl-8 text-xs" aria-label={`Buscar ${rotulo.varios.toLowerCase()}`} />
          </label>
        )}
      </div>

      {!pessoas.length ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-4 py-3 text-sm text-stone-500">
          Nenhum usuário com a função {rotulo.um}. Defina em <a href="/admin/usuarios" className="font-medium text-mata-700 underline-offset-2 hover:underline">Usuários</a> (lápis → Função do usuário).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {SEXOS.filter((sx) => sx.id || pessoas.some((p) => !p.sexo)).map((sx) => {
            const grupo = visiveis.filter((p) => p.sexo === sx.id);
            const marcados = pessoas.filter((p) => p.sexo === sx.id && sel.has(p.$id)).length;
            return (
              <div key={sx.id ?? "sem"} className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3">
                <p className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wide text-stone-500 uppercase">
                  <span className="inline-flex items-center gap-1.5">
                    {sx.id && <IconeGenero genero={sx.id} size={15} />}
                    {sx.rotulo}
                  </span>
                  {marcados > 0 && <span className="tabular-nums normal-case text-mata-700">{marcados} escolhido{marcados > 1 ? "s" : ""}</span>}
                </p>
                {grupo.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {grupo.map((p) => {
                      const on = sel.has(p.$id);
                      return (
                        <button
                          key={p.$id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => alternar(p.$id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm transition ${
                            on ? "border-mata-600 bg-mata-700 text-white shadow-sm" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                          }`}
                        >
                          {on ? (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20"><Check size={13} strokeWidth={3} /></span>
                          ) : (
                            <Avatar nome={p.nome} foto={p.foto} tamanho={24} className="ring-0" />
                          )}
                          <span className="sm:hidden">{p.nome.split(" ")[0]}</span>
                          <span className="hidden sm:inline">{p.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">{termo ? "Ninguém com esse nome." : "Ninguém cadastrado."}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
