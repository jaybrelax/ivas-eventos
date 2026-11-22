"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Search, Shield, UserRound, Users } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export type Papel = "mestre" | "guardiao" | "participante";
export type PessoaPresenca = { id: string; nome: string; foto: string | null; papel: Papel };

const PAPEL: Record<Papel, { rotulo: string; plural: string; cor: string; anel: string; Icone: typeof Crown }> = {
  mestre: { rotulo: "Mestre", plural: "Mestres", cor: "bg-mata-100 text-mata-800", anel: "ring-mata-400", Icone: Crown },
  guardiao: { rotulo: "Guardião", plural: "Guardiões", cor: "bg-sky-100 text-sky-800", anel: "ring-sky-400", Icone: Shield },
  participante: { rotulo: "Participante", plural: "Participantes", cor: "bg-stone-100 text-stone-600", anel: "ring-stone-200", Icone: UserRound },
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Todos que estarão no ritual numa lista só: mestres, guardiões e participantes confirmados,
 * nessa ordem, com filtro por papel e busca. Para a coordenação, cada nome abre a ficha.
 */
export function ListaPresenca({ pessoas, espera, vagas, linkFicha }: {
  pessoas: PessoaPresenca[];
  espera: number;
  /** Vagas de participantes: quem é da equipe e também se inscreveu aparece uma vez só, mas ocupa vaga. */
  vagas: { ocupadas: number; total: number } | null;
  linkFicha: boolean;
}) {
  const [papel, setPapel] = useState<Papel | "todos">("todos");
  const [busca, setBusca] = useState("");

  const contagem = useMemo(() => {
    const c = { todos: pessoas.length, mestre: 0, guardiao: 0, participante: 0 };
    for (const p of pessoas) c[p.papel]++;
    return c;
  }, [pessoas]);

  const termo = semAcento(busca.trim());
  const lista = pessoas.filter((p) => (papel === "todos" || p.papel === papel) && (!termo || semAcento(p.nome).includes(termo)));

  return (
    <section id="presenca" className="cartao scroll-mt-6 p-0 sm:p-0">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-100 px-5 pt-5 pb-4 sm:px-6">
        <div>
          <h2 className="cartao-titulo flex items-center gap-2"><Users size={18} className="text-mata-600" /> Lista de presença</h2>
          <p className="cartao-sub">Todos que estarão no ritual: equipe e participantes confirmados.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl leading-none font-semibold tracking-tight text-stone-900 tabular-nums">{pessoas.length}</p>
          <p className="mt-1 text-xs text-stone-500">
            {pessoas.length === 1 ? "pessoa" : "pessoas"}
            {vagas && <> · {vagas.ocupadas}/{vagas.total} vagas de participantes</>}
            {espera > 0 && <> · <span className="font-medium text-amber-700">{espera} na espera</span></>}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filtrar por papel">
          {(["todos", "mestre", "guardiao", "participante"] as const).map((id) => {
            const ativo = papel === id;
            if (id !== "todos" && !contagem[id]) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPapel(id)}
                aria-pressed={ativo}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ring-1 transition ${
                  ativo ? "bg-mata-700 text-white ring-mata-700" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
                }`}
              >
                {id === "todos" ? "Todos" : PAPEL[id].plural}
                <span className={`rounded-full px-1.5 tabular-nums ${ativo ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{contagem[id]}</span>
              </button>
            );
          })}
        </div>
        {pessoas.length > 10 && (
          <div className="relative sm:w-52">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome" aria-label="Buscar na lista" className="campo h-9 pl-8 text-sm" />
          </div>
        )}
      </div>

      {lista.length ? (
        <ul className="grid gap-1 px-3 pb-4 sm:grid-cols-2 sm:px-4 xl:grid-cols-3">
          {lista.map((p) => {
            const info = PAPEL[p.papel];
            const conteudo = (
              <>
                <Avatar nome={p.nome} foto={p.foto} tamanho={38} className={`ring-2 ${info.anel}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-900">{p.nome}</span>
                  <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold ${info.cor}`}>
                    <info.Icone size={10} /> {info.rotulo}
                  </span>
                </span>
              </>
            );
            const classe = "flex items-center gap-3 rounded-xl px-2.5 py-2";
            return (
              <li key={`${p.papel}-${p.id}`}>
                {linkFicha && p.papel === "participante" ? (
                  <Link href={`/admin/participantes/${p.id}`} className={`${classe} transition hover:bg-mata-50/70`}>{conteudo}</Link>
                ) : (
                  <div className={classe}>{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-6 pb-6 text-sm text-stone-400">{pessoas.length ? "Ninguém encontrado." : "Ninguém confirmado ainda."}</p>
      )}
    </section>
  );
}
