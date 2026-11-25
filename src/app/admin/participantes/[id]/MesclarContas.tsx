"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { GitMerge, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BuscaPessoa, type OpcaoPessoa } from "@/components/BuscaPessoa";
import { BotaoConfirmar } from "@/components/Confirmar";
import { Carregando } from "@/components/ui";
import { toast } from "@/components/Toaster";
import type { ResumoConta } from "@/lib/mesclar-contas";
import { mesclarContasAction, resumoContaAction } from "../mesclar-actions";

/** Qual conta deve ficar por padrão: a que tem senha, senão a que tem e-mail, senão a que tem mais inscrições. */
function padraoDeQuemFica(a: ResumoConta, b: ResumoConta): string {
  const pontos = (c: ResumoConta) => (c.comSenha ? 100 : 0) + (c.email ? 10 : 0) + (c.rapida ? 0 : 5) + Math.min(c.inscricoes, 4);
  return pontos(b) > pontos(a) ? b.id : a.id;
}

function CartaoConta({ c, fica, aoEscolher }: { c: ResumoConta; fica: boolean; aoEscolher: () => void }) {
  return (
    <label className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-left transition ${fica ? "border-mata-400 bg-mata-50/60 ring-1 ring-mata-300" : "border-stone-200 bg-white hover:bg-stone-50"}`}>
      <span className="flex items-center gap-2.5">
        <Avatar nome={c.nome} foto={c.foto} tamanho={36} className="ring-0" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-stone-900">{c.nome}</span>
          {c.rapida && <span className="chip bg-ouro-100 px-2 py-px text-[11px] text-ouro-700">Cadastro rápido</span>}
        </span>
      </span>
      <span className="space-y-0.5 text-xs text-stone-600">
        <span className="block truncate">{c.email ?? "Sem e-mail"}{c.comSenha ? " · com senha" : ""}</span>
        <span className="block truncate">{c.telefone ?? "Sem telefone"}</span>
        <span className="block tabular-nums">{c.inscricoes} inscrição(ões) · {c.pacotes} pacote(s) · {c.creditos} crédito(s)</span>
      </span>
      <span className="mt-1 flex items-center gap-2 text-sm font-medium text-stone-800">
        <input type="radio" name="fica" checked={fica} onChange={aoEscolher} className="h-4 w-4 accent-mata-700" /> Manter esta conta
      </span>
    </label>
  );
}

/** Admin: junta esta ficha com outra conta da mesma pessoa (inscrições, pacotes, créditos e histórico vão para uma só). */
export function MesclarContas({ id, pessoas }: { id: string; pessoas: OpcaoPessoa[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [esta, setEsta] = useState<ResumoConta | null>(null);
  const [outra, setOutra] = useState<ResumoConta | null>(null);
  const [fica, setFica] = useState<string>(id);
  const [carregando, iniciarCarga] = useTransition();
  const [pendente, iniciar] = useTransition();

  const fechar = () => { setAberto(false); setOutra(null); setEsta(null); };
  const abrir = () => {
    setAberto(true);
    iniciarCarga(async () => { setEsta(await resumoContaAction(id)); setFica(id); });
  };
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const escolherOutra = (o: OpcaoPessoa | null) => {
    if (!o) { setOutra(null); return; }
    iniciarCarga(async () => {
      const r = await resumoContaAction(o.id);
      setOutra(r);
      if (r && esta) setFica(padraoDeQuemFica(esta, r));
    });
  };

  const mesclar = () => {
    if (!esta || !outra) return;
    const destino = fica;
    const origem = fica === esta.id ? outra.id : esta.id;
    iniciar(async () => {
      const r = await mesclarContasAction(origem, destino);
      if (r.erro) { toast(r.erro, "erro"); return; }
      toast(r.ok ?? "Contas mescladas.", "ok");
      fechar();
      if (destino === id) router.refresh(); else router.replace(`/admin/participantes/${destino}`);
    });
  };

  const modal = aberto && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Mesclar contas">
      <div className="fixed inset-0 bg-stone-950/60" onClick={fechar} />
      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-5 text-left shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-stone-900"><GitMerge size={18} className="text-mata-600" aria-hidden /> Mesclar contas</h3>
            <p className="mt-1 text-xs text-stone-500">Junta as duas contas em uma só: inscrições, pacotes, créditos e histórico passam para a conta que fica. A outra é apagada. Não dá para desfazer.</p>
          </div>
          <button type="button" onClick={fechar} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={16} /></button>
        </div>

        <div>
          <label className="rotulo" htmlFor="mesclar-outra">Outra conta da mesma pessoa</label>
          <BuscaPessoa id="mesclar-outra" name="outra" opcoes={pessoas.filter((p) => p.id !== id)} aoMudar={escolherOutra} placeholder="Busque pelo nome…" />
        </div>

        {carregando && !outra && <p className="flex items-center gap-2 text-xs text-stone-500"><Carregando /> Conferindo as contas…</p>}

        {esta && outra && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <CartaoConta c={esta} fica={fica === esta.id} aoEscolher={() => setFica(esta.id)} />
              <CartaoConta c={outra} fica={fica === outra.id} aoEscolher={() => setFica(outra.id)} />
            </div>
            {(esta.equipe || outra.equipe) && (
              <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200">Uma das contas tem acesso ao painel: é ela que precisa ficar.</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="btn-secundario h-10" onClick={fechar} disabled={pendente}>Cancelar</button>
              <BotaoConfirmar
                pergunta="Mesclar as duas contas? A outra será apagada e não dá para desfazer."
                confirmar="Sim, mesclar"
                acima
                disabled={pendente || ((fica === esta.id ? outra : esta).equipe)}
                aoConfirmar={mesclar}
                className="btn-primario h-10"
              >
                {pendente ? "Mesclando…" : "Mesclar contas"}
              </BotaoConfirmar>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" className="btn-secundario w-full" onClick={abrir}>
        <GitMerge size={16} aria-hidden /> Mesclar com outra conta
      </button>
      {modal && createPortal(modal, document.body)}
    </>
  );
}
