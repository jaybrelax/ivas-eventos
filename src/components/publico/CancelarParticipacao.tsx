"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2 } from "lucide-react";
import { BotaoConfirmar } from "@/components/Confirmar";
import { cancelarInscricaoAction } from "@/app/eventos/inscricao-actions";

/** O próprio participante cancela a participação (o servidor confere prazo e contribuição). */
export function CancelarParticipacao({ eventoId, className = "", alinhar }: { eventoId: string; className?: string; alinhar?: "direita" | "esquerda" }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  return (
    <div className={className}>
      <BotaoConfirmar
        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        pergunta="Cancelar sua participação? Se houver lista de espera, a vaga passa para a próxima pessoa."
        confirmar="Sim, cancelar"
        alinhar={alinhar}
        acima
        disabled={pendente}
        aoConfirmar={() =>
          iniciar(async () => {
            const r = await cancelarInscricaoAction(eventoId);
            setErro(r.erro);
            if (r.ok) router.refresh();
          })
        }
      >
        <CalendarX2 size={16} className={pendente ? "animate-pulse" : ""} /> {pendente ? "Cancelando…" : "Cancelar participação"}
      </BotaoConfirmar>
      {erro && <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">{erro}</p>}
    </div>
  );
}
