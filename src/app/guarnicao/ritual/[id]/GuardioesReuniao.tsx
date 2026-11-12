"use client";

import { useState, useTransition } from "react";
import { Plus, Shield, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { toast } from "@/components/Toaster";
import type { DadosReuniao } from "@/lib/reuniao";
import { definirGuardiaoDoDia } from "../../actions";
import { Folha } from "../../Folha";

export function GuardioesReuniao({ dados, gerenciar }: { dados: DadosReuniao; gerenciar: boolean }) {
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [pendente, iniciar] = useTransition();
  const alterar = (id: string, incluir: boolean) => iniciar(async () => {
    const r = await definirGuardiaoDoDia(dados.eventoId, id, incluir);
    if (r.erro) toast(r.erro);
    else { if (r.ok) toast(r.ok, "ok"); setAberta(false); }
  });
  return <section className="mt-5 px-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold text-stone-900">Guardiões do ritual</h2>
      {gerenciar && <button type="button" disabled={pendente} onClick={() => { setBusca(""); setAberta(true); }} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><Plus size={16} /> Adicionar</button>}
    </div>
    <div className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
      {!dados.guardioesRitual.length ? <p className="text-sm text-stone-500">Nenhum guardião escalado.</p> : <ul className="divide-y divide-stone-100">
        {dados.guardioesRitual.map((p) => <li key={p.id} className="flex items-center gap-3 py-2">
          <Avatar nome={p.nome} foto={p.foto} tamanho={40} /><span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}</span><Shield size={16} className="text-emerald-700" aria-label="Guardião deste ritual" />
          {gerenciar && <button type="button" disabled={pendente} onClick={() => alterar(p.id, false)} aria-label={`Retirar ${p.nome} da escala`} className="rounded-full p-2 text-stone-500"><X size={18} /></button>}
        </li>)}
      </ul>}
    </div>
    <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Adicionar guardião ao ritual">
      <p className="mb-3 text-sm text-stone-600">Escolha um membro da equipe, incluindo mestres. Respostas de ausência já registradas serão respeitadas.</p>
      <input className="campo mb-3 w-full" aria-label="Buscar membro da equipe" placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="max-h-80 overflow-y-auto">
        {dados.membrosDisponiveis.filter((p) => p.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"))).map((p) => <button key={p.id} type="button" disabled={pendente} onClick={() => alterar(p.id, true)} className="flex w-full items-center gap-3 border-b border-stone-100 py-3 text-left text-sm text-stone-800"><Avatar nome={p.nome} foto={p.foto} tamanho={36} /><span className="flex-1">{p.nome}</span><Plus size={18} /></button>)}
      </div>
    </Folha>
  </section>;
}
