"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ShieldCheck, Undo2 } from "lucide-react";
import type { SituacaoPagamento } from "@/lib/types";
import { Carregando } from "@/components/ui";
import { confirmarPagamentoAction, isentarPagamentoAction, reabrirPagamentoAction } from "@/app/admin/eventos/participantes-actions";

/** Botões de pagamento de uma inscrição, na ficha do participante. */
export function AcoesPagamento({ eventoId, inscricaoId, pagamento }: { eventoId: string; inscricaoId: string; pagamento: SituacaoPagamento }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      setErro(r.erro);
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pendente && <Carregando tamanho={14} />}
      {pagamento !== "pago" && (
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => confirmarPagamentoAction(eventoId, inscricaoId))}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <CheckCircle2 size={13} /> Confirmar pago
        </button>
      )}
      {pagamento !== "isento" && (
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => isentarPagamentoAction(eventoId, inscricaoId))}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
        >
          <ShieldCheck size={13} /> Isentar
        </button>
      )}
      {pagamento !== "pendente" && (
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => reabrirPagamentoAction(eventoId, inscricaoId))}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
        >
          <Undo2 size={13} /> Reabrir
        </button>
      )}
      {erro && <span className="text-xs text-red-700">{erro}</span>}
    </div>
  );
}
