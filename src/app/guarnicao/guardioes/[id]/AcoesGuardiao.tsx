"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { removerSuspensaoGuardiao, retirarCargoGuardiao, suspenderGuardiao } from "./actions";

function dataFim(ate: string) {
  return new Date(ate).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

export function AcoesGuardiao({ id, nome, suspensoAte }: { id: string; nome: string; suspensoAte: string | null }) {
  const router = useRouter();
  const [meses, setMeses] = useState<3 | 6>(3);
  const [pendente, iniciar] = useTransition();
  const executar = (acao: () => Promise<{ ok?: string; erro?: string }>, voltar = false) => iniciar(async () => {
    const r = await acao();
    if (r.erro) toast(r.erro);
    else {
      if (r.ok) toast(r.ok, "ok");
      if (voltar) router.push("/guarnicao/guardioes");
      else router.refresh();
    }
  });

  return (
    <section className="rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
      <h2 className="text-base font-semibold text-stone-900">Gerenciar guardião</h2>
      {suspensoAte ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-semibold">Suspenso até {dataFim(suspensoAte)}</p>
          <p className="mt-1">O guardião continua usando o aplicativo e vendo suas estatísticas. Ele poderá voltar a se candidatar automaticamente ao fim do prazo.</p>
          <button type="button" disabled={pendente} onClick={() => executar(() => removerSuspensaoGuardiao(id))} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50">
            {pendente ? <Carregando /> : <ShieldOff size={17} />} Remover suspensão
          </button>
          <label htmlFor="periodo-suspensao" className="mt-5 block text-sm font-semibold">Novo prazo a partir de hoje</label>
          <select id="periodo-suspensao" value={meses} onChange={(e) => setMeses(Number(e.target.value) as 3 | 6)} className="campo mt-1 h-11">
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
          </select>
          <button type="button" disabled={pendente} onClick={() => executar(() => suspenderGuardiao(id, meses))} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-400 px-4 font-semibold text-amber-900 disabled:opacity-50">
            {pendente ? <Carregando /> : <CalendarClock size={17} />} Atualizar prazo
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-stone-600">Impedir novas candidaturas do guardião durante o prazo. O acesso, as participações existentes e as estatísticas continuam normalmente.</p>
          <label htmlFor="periodo-suspensao" className="mt-4 block text-sm font-semibold text-stone-700">Período da suspensão</label>
          <select id="periodo-suspensao" value={meses} onChange={(e) => setMeses(Number(e.target.value) as 3 | 6)} className="campo mt-1 h-11">
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
          </select>
          <button type="button" disabled={pendente} onClick={() => executar(() => suspenderGuardiao(id, meses))} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            {pendente ? <Carregando /> : <CalendarClock size={17} />} Suspender guardião
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-stone-200 pt-5">
        <p className="text-sm leading-relaxed text-stone-600">Excluir guardião retira somente a função de guardião. A conta e o histórico de rituais permanecem.</p>
        <button type="button" disabled={pendente} onClick={() => {
          if (window.confirm(`Retirar a função de guardião de ${nome}? A conta e o histórico serão mantidos.`)) executar(() => retirarCargoGuardiao(id), true);
        }} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700 disabled:opacity-50">
          <Trash2 size={17} /> Excluir guardião
        </button>
      </div>
    </section>
  );
}
