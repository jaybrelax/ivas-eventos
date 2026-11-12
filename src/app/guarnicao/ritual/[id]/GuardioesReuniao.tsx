"use client";

import { useState, useTransition } from "react";
import { Plus, Crown, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { toast } from "@/components/Toaster";
import type { DadosReuniao } from "@/lib/reuniao";
import { definirGuardiaoDoDia, definirMestreDaReuniao } from "../../actions";
import { Folha } from "../../Folha";

export function GuardioesReuniao({ dados, gerenciar, funcao = "guardiao" }: { dados: DadosReuniao; gerenciar: boolean; funcao?: "mestre" | "guardiao" }) {
  const mestre = funcao === "mestre";
  const pessoas = mestre ? dados.mestresRitual : dados.guardioesRitual;
  const disponiveis = mestre ? dados.mestresDisponiveis : dados.membrosDisponiveis;
  const titulo = mestre ? "Mestres do ritual" : "Guardiões do ritual";
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [pendente, iniciar] = useTransition();
  const alterar = (id: string, incluir: boolean) => iniciar(async () => {
    const r = await (mestre ? definirMestreDaReuniao : definirGuardiaoDoDia)(dados.eventoId, id, incluir);
    if (r.erro) toast(r.erro);
    else { if (r.ok) toast(r.ok, "ok"); setAberta(false); }
  });
  return <section className={mestre ? "border-t border-stone-200/70 pt-3" : "mt-5 px-5"}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className={mestre ? "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500" : "text-lg font-semibold text-stone-900"}>{mestre && <Crown size={14} className="text-emerald-700" />}{titulo}</h2>
      {gerenciar && <button type="button" disabled={pendente} onClick={() => { setBusca(""); setAberta(true); }} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><Plus size={16} /> Adicionar</button>}
    </div>
    <div className={mestre ? "" : "rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70"}>
      {!pessoas.length ? <p className="text-sm text-stone-500">{mestre ? "Nenhum mestre escalado." : "Nenhum guardião escalado."}</p> : <ul className="flex flex-nowrap gap-2 overflow-x-auto py-1">
        {pessoas.map((p) => <li key={p.id} className="relative flex w-16 shrink-0 flex-col items-center gap-1 pt-1 text-center">
          <Avatar nome={p.nome} foto={p.foto} tamanho={44} className={mestre ? "ring-2 ring-ouro-300" : "ring-2 ring-emerald-300"} /><span title={p.nome} className="w-full truncate text-xs font-medium text-stone-700">{p.nome.split(" ")[0]}</span>
          {gerenciar && <button type="button" disabled={pendente} onClick={() => alterar(p.id, false)} aria-label={`Retirar ${p.nome} da escala`} className="absolute top-0 right-0 rounded-full bg-white p-1 text-stone-500 shadow-sm ring-1 ring-stone-200"><X size={12} /></button>}
        </li>)}
      </ul>}
    </div>
    <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo={mestre ? "Adicionar mestre ao ritual" : "Adicionar guardião ao ritual"}>
      <p className="mb-3 text-sm text-stone-600">{mestre ? "Escolha um mestre para conduzir esta reunião." : "Escolha um membro da equipe, incluindo mestres."} Respostas de ausência já registradas serão respeitadas.</p>
      <input className="campo mb-3 w-full" aria-label="Buscar membro da equipe" placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="max-h-80 overflow-y-auto">
        {disponiveis.filter((p) => p.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"))).map((p) => <button key={p.id} type="button" disabled={pendente} onClick={() => alterar(p.id, true)} className="flex w-full items-center gap-3 border-b border-stone-100 py-3 text-left text-sm text-stone-800"><Avatar nome={p.nome} foto={p.foto} tamanho={36} /><span className="flex-1">{p.nome}</span><Plus size={18} /></button>)}
      </div>
    </Folha>
  </section>;
}
