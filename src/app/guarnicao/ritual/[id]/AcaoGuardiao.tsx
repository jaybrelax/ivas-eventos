"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Hourglass, ShieldCheck, ShieldPlus } from "lucide-react";
import { concordar } from "@/lib/genero";
import type { Sexo } from "@/lib/types";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { cancelarGuarnicao, candidatarGuarnicao } from "../../actions";
import { Folha } from "../../Folha";

type Props = {
  eventoId: string;
  situacao: "confirmada" | "espera" | null;
  sexo: Sexo | null;
  posicaoEspera: number | null;
  /** Motivo de não poder se candidatar (null = pode). */
  bloqueio: string | null;
  prazoPassou: boolean;
  prazoTexto: string;
  temVaga: boolean;
  suspenso: boolean;
};

const vibrar = () => (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(15);

/** Barra fixa acima das abas com a ação principal do guardião: candidatar-se ou cancelar. */
export function AcaoGuardiao({ eventoId, situacao, posicaoEspera, bloqueio, prazoPassou, prazoTexto, temVaga, sexo, suspenso }: Props) {
  const [pendente, iniciar] = useTransition();
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        vibrar();
        toast(r.ok, "ok");
      } else if (r.erro) toast(r.erro);
    });

  return (
    <>
      {/* Num portal no <body>: a animação de troca de tela não pode "prender" o fixed, senão ele rolaria junto */}
      {montado && createPortal(
        <>
      {/* Flutuante: fica solto acima da barra de abas, com sombra, enquanto a página rola por baixo */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl px-4">
        <div className="pointer-events-auto animate-surgir rounded-3xl bg-white/95 p-3 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-stone-200/80 backdrop-blur-xl">
          {situacao ? (
            <div className="flex items-center gap-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${situacao === "confirmada" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {situacao === "confirmada" ? <ShieldCheck size={22} /> : <Hourglass size={22} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900">
                  {situacao === "confirmada" ? `Você está ${concordar(sexo, "escalado", "escalada")}` : `Na espera${posicaoEspera ? ` · ${posicaoEspera}º da fila` : ""}`}
                </p>
                <p className="text-xs text-stone-500">{prazoPassou ? "Prazo para cancelar encerrado" : `Pode cancelar até ${prazoTexto}`}</p>
              </div>
              {!prazoPassou && (
                <button type="button" onClick={() => setConfirmarCancelar(true)} disabled={pendente} className="h-11 shrink-0 rounded-2xl bg-stone-100 px-4 text-sm font-semibold text-stone-700 active:scale-95">
                  Cancelar
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={!!bloqueio || pendente}
              onClick={() => rodar(() => candidatarGuarnicao(eventoId))}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#e0b04a] to-[#b8862a] text-base font-bold text-[#1c1040] shadow-[0_8px_20px_-8px_rgb(184_134_42/0.7)] transition active:scale-[0.98] disabled:bg-none disabled:bg-stone-300 disabled:text-stone-600 disabled:shadow-none"
            >
              {pendente ? <><Carregando /> Enviando…</> : bloqueio ? bloqueio : <><ShieldPlus size={20} /> {temVaga ? "Quero servir neste ritual" : "Entrar na lista de espera"}</>}
            </button>
          )}
        </div>
      </div>
        </>,
        document.body,
      )}

      <Folha aberta={confirmarCancelar} aoFechar={() => setConfirmarCancelar(false)} titulo="Cancelar sua participação?">
        <p className="text-sm text-stone-600">Sua vaga vai para o próximo da lista de espera. {suspenso ? "Durante a suspensão, você não poderá se candidatar novamente." : "Você pode se candidatar de novo depois, se ainda houver vaga."}</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirmarCancelar(false);
              rodar(() => cancelarGuarnicao(eventoId));
            }}
            className="h-12 rounded-2xl bg-red-600 text-sm font-bold text-white active:scale-[0.98]"
          >
            Sim, cancelar
          </button>
          <button type="button" onClick={() => setConfirmarCancelar(false)} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">
            Voltar
          </button>
        </div>
      </Folha>
    </>
  );
}
