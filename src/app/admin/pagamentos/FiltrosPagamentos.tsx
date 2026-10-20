"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Carregando } from "@/components/ui";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const SITUACOES = [
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "informado", rotulo: "Informado" },
  { valor: "pago", rotulo: "Pago" },
  { valor: "isento", rotulo: "Isento" },
];

export function FiltrosPagamentos({ eventos }: { eventos: { id: string; titulo: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const mes = sp.get("mes") ?? "";
  const evento = sp.get("evento") ?? "";
  const situacao = sp.get("pagamento") ?? "";

  const aplicar = (chave: string, valor: string) => {
    const p = new URLSearchParams(sp);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    iniciar(() => router.replace(`/admin/pagamentos?${p}`, { scroll: false }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pendente && <Carregando />}
      <select value={mes} onChange={(e) => aplicar("mes", e.target.value)} className="campo h-9 w-auto text-sm" aria-label="Filtrar por mês">
        <option value="">Todos os meses</option>
        {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select value={evento} onChange={(e) => aplicar("evento", e.target.value)} className="campo h-9 w-auto max-w-56 text-sm" aria-label="Filtrar por evento">
        <option value="">Todos os eventos</option>
        {eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
      </select>
      <select value={situacao} onChange={(e) => aplicar("pagamento", e.target.value)} className="campo h-9 w-auto text-sm" aria-label="Filtrar por situação do pagamento">
        <option value="">Todas as situações</option>
        {SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
      </select>
    </div>
  );
}
