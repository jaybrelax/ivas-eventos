"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Hash } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { dataCurta } from "@/lib/format";
import type { PlanoRenumeracao } from "@/lib/renumerar";
import { previaRenumeracao, renumerarProximos } from "./actions";

/** Recalcula os números dos rituais seguintes a este, em ordem de data. Mostra o antes e o depois antes de gravar. */
export function RenumerarProximos({ eventoId, numero }: { eventoId: string; numero: number }) {
  const router = useRouter();
  const [plano, setPlano] = useState<PlanoRenumeracao | null>(null);
  const [pendente, iniciar] = useTransition();

  const calcular = () => iniciar(async () => setPlano(await previaRenumeracao(eventoId)));
  const aplicar = () =>
    iniciar(async () => {
      const r = await renumerarProximos(eventoId);
      if ("erro" in r) return toast(r.erro);
      toast(r.ok, "ok");
      setPlano(null);
      router.refresh();
    });

  return (
    <details className="group cartao xl:mr-[23.5rem]">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-stone-800 select-none">
        <Hash size={16} className="text-mata-700" /> Renumerar os próximos rituais
        <span className="ml-auto text-xs font-normal text-stone-500 group-open:hidden">Recalcular a partir do Nº {numero}…</span>
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm leading-relaxed text-stone-600">
          Este ritual mantém o Nº {numero}. Os rituais que vêm depois, em ordem de data e horário, recebem {numero + 1}, {numero + 2}… e o número do ano acompanha. Eventos que não contam como ritual ficam de fora.
        </p>
        <button type="button" onClick={calcular} disabled={pendente} className="btn-secundario">
          {pendente && !plano ? <><Carregando /> Calculando…</> : "Ver o que vai mudar"}
        </button>

        {plano && !plano.ok && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800 ring-1 ring-red-100">{plano.erro}</p>}

        {plano?.ok && (
          plano.itens.length === 0 ? (
            <p className="rounded-xl bg-mata-50 px-3.5 py-2.5 text-sm text-mata-800 ring-1 ring-mata-100">A numeração dos próximos já está na ordem. Nada a mudar.</p>
          ) : (
            <>
              <ul className="divide-y divide-stone-100 rounded-xl ring-1 ring-stone-200">
                {plano.itens.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-stone-900">{i.titulo}</span>
                      <span className="text-xs text-stone-500">{dataCurta(i.data)} · {i.hora}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                      <span className="text-stone-500 line-through">{i.geralAtual ?? "—"}</span>
                      <ArrowRight size={12} className="text-stone-400" />
                      <strong className="text-mata-800">{i.geralNovo}</strong>
                      <span className="text-stone-400">· {i.numeroAnoNovo}/{i.anoNovo}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-relaxed text-amber-800">
                Atenção: o endereço público de cada ritual usa o número (…/ritual/{plano.itens[0].geralNovo}), então links já compartilhados dos rituais que mudam passam a apontar para outro ritual.
              </p>
              <button type="button" onClick={aplicar} disabled={pendente} className="btn-primario">
                {pendente ? <><Carregando /> Renumerando…</> : `Renumerar ${plano.itens.length} ${plano.itens.length === 1 ? "ritual" : "rituais"}`}
              </button>
            </>
          )
        )}
      </div>
    </details>
  );
}
