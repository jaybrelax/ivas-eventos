"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { aprovarGuardiao } from "../actions";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import type { PendenteGuardiao } from "@/lib/usuarios";

export function GuardioesPendentes({ pendentes }: { pendentes: PendenteGuardiao[] }) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  return (
    <section className="mx-4 mt-6 rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><UserRound size={21} /></span>
        <div>
          <h2 className="text-base font-semibold text-stone-900">Guardiões aguardando aprovação</h2>
          <p className="text-sm text-stone-500">{pendentes.length === 0 ? "Nenhum cadastro pendente." : `${pendentes.length} ${pendentes.length === 1 ? "cadastro pendente" : "cadastros pendentes"}`}</p>
        </div>
      </div>
      {pendentes.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100">
          {pendentes.map((p) => (
            <li key={p.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-semibold text-stone-900">{p.nome}</p>
                <p className="break-all text-sm text-stone-600">{p.email}</p>
                {p.telefone && <p className="text-sm text-stone-500">{p.telefone}</p>}
              </div>
              <button type="button" disabled={salvando} onClick={() => iniciar(async () => {
                const r = await aprovarGuardiao(p.id);
                if (r.erro) toast(r.erro);
                else { toast(r.ok ?? "Guardião aprovado.", "ok"); router.refresh(); }
              })} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
                {salvando ? <Carregando /> : <ShieldCheck size={17} />} Aprovar guardião
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
