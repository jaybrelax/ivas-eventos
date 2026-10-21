"use client";

import { useMemo, useState, useTransition } from "react";
import { Lock, LockOpen, Minus, Plus, Search, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { toast } from "@/components/Toaster";
import type { Sexo } from "@/lib/types";
import { ajustarVagas, colocarGuardiao, retirarGuardiao } from "../../actions";
import { Folha } from "../../Folha";
import { vibrar } from "../../nativo";

type Pessoa = { id: string; nome: string; foto: string | null };

type Props = {
  eventoId: string;
  vagas: Record<Sexo, number>;
  abertas: boolean;
  confirmados: Record<Sexo, Pessoa[]>;
  espera: Record<Sexo, Pessoa[]>;
  disponiveis: (Pessoa & { sexo: Sexo })[];
};

const GRUPO: Record<Sexo, string> = { masculino: "Guardiões", feminino: "Guardiãs" };

/** Escala do ritual pela coordenação: vagas por gênero, abrir/fechar, colocar e retirar guardiões. */
export function PainelEscala({ eventoId, vagas, abertas, confirmados, espera, disponiveis }: Props) {
  const [pendente, iniciar] = useTransition();
  const [colocando, setColocando] = useState<Sexo | null>(null);
  const [retirando, setRetirando] = useState<Pessoa | null>(null);
  const [busca, setBusca] = useState("");

  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>, silencioso = false) =>
    iniciar(async () => {
      const r = await fn();
      if (r.erro) toast(r.erro);
      else {
        vibrar();
        if (r.ok && !silencioso) toast(r.ok, "ok");
      }
    });

  const opcoes = useMemo(() => {
    if (!colocando) return [];
    const termo = busca.trim().toLowerCase();
    return disponiveis.filter((p) => p.sexo === colocando && (!termo || p.nome.toLowerCase().includes(termo)));
  }, [colocando, busca, disponiveis]);

  return (
    <div className={`space-y-4 ${pendente ? "opacity-70" : ""}`}>
      {/* Abrir / fechar candidaturas */}
      <button
        type="button"
        onClick={() => rodar(() => ajustarVagas(eventoId, { abertas: !abertas }))}
        className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-cartao ring-1 ring-stone-200/70 active:scale-[0.99]"
      >
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${abertas ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
          {abertas ? <LockOpen size={20} /> : <Lock size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-stone-900">{abertas ? "Candidaturas abertas" : "Candidaturas fechadas"}</span>
          <span className="block text-xs text-stone-500">{abertas ? "Guardiões podem se candidatar pelo app" : "Só a coordenação escala neste ritual"}</span>
        </span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${abertas ? "bg-emerald-500" : "bg-stone-300"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${abertas ? "left-[1.375rem]" : "left-0.5"}`} />
        </span>
      </button>

      {(["masculino", "feminino"] as const).map((s) => {
        const conf = confirmados[s];
        const fila = espera[s];
        return (
          <section key={s} className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-1.5 text-base font-semibold text-stone-900">
                <IconeGenero genero={s} size={16} /> {GRUPO[s]}
                <span className="text-sm font-medium text-stone-500 tabular-nums">· {conf.length}/{vagas[s]}</span>
              </h3>
              {/* Vagas */}
              <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1">
                <button type="button" aria-label={`Menos uma vaga de ${GRUPO[s]}`} disabled={vagas[s] <= 0} onClick={() => rodar(() => ajustarVagas(eventoId, { [s]: vagas[s] - 1 }), true)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-stone-700 shadow-2xs active:scale-90 disabled:opacity-40">
                  <Minus size={16} />
                </button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">{vagas[s]}</span>
                <button type="button" aria-label={`Mais uma vaga de ${GRUPO[s]}`} onClick={() => rodar(() => ajustarVagas(eventoId, { [s]: vagas[s] + 1 }), true)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-stone-700 shadow-2xs active:scale-90">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <ul className="mt-3 space-y-1">
              {conf.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl px-1 py-1.5">
                  <Avatar nome={p.nome} foto={p.foto} tamanho={40} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}</span>
                  <button type="button" onClick={() => setRetirando(p)} aria-label={`Retirar ${p.nome}`} className="grid h-9 w-9 place-items-center rounded-full text-stone-400 active:scale-90 active:bg-red-50 active:text-red-600">
                    <X size={18} />
                  </button>
                </li>
              ))}
              {Array.from({ length: Math.max(0, vagas[s] - conf.length) }).map((_, i) => (
                <li key={`v${i}`}>
                  <button type="button" onClick={() => { setBusca(""); setColocando(s); }} className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-stone-200 px-2 py-2 text-left text-sm font-medium text-stone-500 active:bg-stone-50">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-stone-100"><UserPlus size={17} /></span>
                    Vaga livre · toque para escalar
                  </button>
                </li>
              ))}
            </ul>

            {fila.length > 0 && (
              <div className="mt-3 border-t border-stone-100 pt-3">
                <p className="mb-1 text-xs font-semibold tracking-wider text-amber-700 uppercase">Lista de espera</p>
                <ul className="space-y-1">
                  {fila.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3 py-1">
                      <span className="w-5 text-center text-xs font-bold text-stone-400 tabular-nums">{i + 1}º</span>
                      <Avatar nome={p.nome} foto={p.foto} tamanho={32} />
                      <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{p.nome}</span>
                      <button type="button" onClick={() => setRetirando(p)} aria-label={`Retirar ${p.nome}`} className="grid h-8 w-8 place-items-center rounded-full text-stone-400 active:bg-red-50 active:text-red-600">
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-stone-400">Aumente as vagas para chamar o próximo da espera.</p>
              </div>
            )}

            {vagas[s] <= conf.length && (
              <button type="button" onClick={() => { setBusca(""); setColocando(s); }} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <UserPlus size={16} /> Colocar na espera
              </button>
            )}
          </section>
        );
      })}

      {/* Escolher guardião */}
      <Folha aberta={!!colocando} aoFechar={() => setColocando(null)} titulo={colocando ? `Escalar ${colocando === "masculino" ? "guardião" : "guardiã"}` : undefined}>
        <label className="relative mb-3 block">
          <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" className="campo h-12 rounded-2xl pl-10 text-base" />
        </label>
        {opcoes.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">Ninguém disponível{busca ? " com esse nome" : ""}.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {opcoes.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setColocando(null);
                    rodar(() => colocarGuardiao(eventoId, p.id));
                  }}
                  className="flex w-full items-center gap-3 py-2.5 text-left active:bg-stone-50"
                >
                  <Avatar nome={p.nome} foto={p.foto} tamanho={40} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}</span>
                  <Plus size={18} className="text-emerald-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Folha>

      {/* Confirmar retirada */}
      <Folha aberta={!!retirando} aoFechar={() => setRetirando(null)} titulo={retirando ? `Retirar ${retirando.nome.split(" ")[0]}?` : undefined}>
        <p className="text-sm text-stone-600">Se houver alguém na lista de espera, essa pessoa assume a vaga automaticamente.</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              const p = retirando!;
              setRetirando(null);
              rodar(() => retirarGuardiao(eventoId, p.id));
            }}
            className="h-12 rounded-2xl bg-red-600 text-sm font-bold text-white active:scale-[0.98]"
          >
            Sim, retirar
          </button>
          <button type="button" onClick={() => setRetirando(null)} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">Voltar</button>
        </div>
      </Folha>
    </div>
  );
}
