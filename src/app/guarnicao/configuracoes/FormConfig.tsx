"use client";

import { useState, useTransition } from "react";
import { CalendarRange, Clock, Minus, Plus } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { salvarConfigGuarnicao } from "../actions";

/** Ajuste com botões − e + (toque grande, como num app nativo). */
function Passo({ valor, min, max, aoMudar, rotulo }: { valor: number; min: number; max: number; aoMudar: (v: number) => void; rotulo: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1">
      <button type="button" aria-label={`Diminuir ${rotulo}`} disabled={valor <= min} onClick={() => aoMudar(valor - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-stone-700 shadow-2xs active:scale-90 disabled:opacity-40">
        <Minus size={18} />
      </button>
      <span className="w-10 text-center text-lg font-bold text-stone-900 tabular-nums">{valor}</span>
      <button type="button" aria-label={`Aumentar ${rotulo}`} disabled={valor >= max} onClick={() => aoMudar(valor + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-stone-700 shadow-2xs active:scale-90 disabled:opacity-40">
        <Plus size={18} />
      </button>
    </div>
  );
}

export function FormConfig({ horasInicial, limiteInicial }: { horasInicial: number; limiteInicial: number }) {
  const [horas, setHoras] = useState(horasInicial);
  const [limite, setLimite] = useState(limiteInicial);
  const [pendente, iniciar] = useTransition();
  const mudou = horas !== horasInicial || limite !== limiteInicial;

  return (
    <div className="space-y-4 px-4">
      <section className="rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Clock size={21} /></span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">Prazo para cancelar</h2>
            <p className="mt-0.5 text-sm leading-snug text-stone-500">Até quantas horas antes do início o guardião ainda pode cancelar sozinho pelo app.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-700">{horas === 0 ? "Até o início do ritual" : `${horas} ${horas === 1 ? "hora" : "horas"} antes`}</span>
          <Passo valor={horas} min={0} max={72} aoMudar={setHoras} rotulo="o prazo" />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CalendarRange size={21} /></span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">Participações por mês</h2>
            <p className="mt-0.5 text-sm leading-snug text-stone-500">Quantos rituais cada guardião pode assumir no mesmo mês pelo app. A coordenação pode escalar além do limite.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-700">{limite === 0 ? "Sem limite" : `${limite} por mês`}</span>
          <Passo valor={limite} min={0} max={31} aoMudar={setLimite} rotulo="o limite" />
        </div>
      </section>

      <button
        type="button"
        disabled={!mudou || pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvarConfigGuarnicao({ horas, limiteMes: limite });
            if (r.erro) toast(r.erro);
            else if (r.ok) toast(r.ok, "ok");
          })
        }
        className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-md transition active:scale-[0.98] disabled:bg-stone-300 disabled:text-stone-600 disabled:shadow-none"
      >
        {pendente ? <><Carregando /> Salvando…</> : mudou ? "Salvar configurações" : "Tudo salvo"}
      </button>
    </div>
  );
}
