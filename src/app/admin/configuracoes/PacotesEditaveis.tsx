"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Package, Plus, SquarePen, Trash2, X } from "lucide-react";
import { Aviso } from "@/components/ui";
import { BotaoConfirmar } from "@/components/Confirmar";
import type { PlanoPacote } from "@/lib/types";
import { excluirItem, salvarItem, type Resultado } from "./actions";

type Plano = PlanoPacote;
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PacotesEditaveis({ itens }: { itens: Plano[] }) {
  const [aberto, setAberto] = useState<Plano | "novo" | null>(null);
  const acionador = useRef<HTMLButtonElement | null>(null);
  const botaoNovo = useRef<HTMLButtonElement>(null);
  const fechar = () => setAberto(null);
  const abrir = (item: Plano | "novo", botao: HTMLButtonElement) => {
    acionador.current = botao;
    setAberto(item);
  };

  return <section id="planosPacote" className="cartao">
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="cartao-titulo">Pacotes de créditos <span className="ml-1 text-sm font-medium text-stone-400 tabular-nums">({itens.length})</span></h2>
        <p className="cartao-sub">Cada crédito vale uma participação em ritual. O pagamento é por Pix, com confirmação da coordenação.</p>
      </div>
      <button ref={botaoNovo} type="button" onClick={(e) => abrir("novo", e.currentTarget)} className="btn-primario min-h-11 w-full px-4 text-sm sm:w-auto sm:shrink-0"><Plus size={17} aria-hidden /> Novo pacote</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {itens.map((item) => <button key={item.$id} type="button" onClick={(e) => abrir(item, e.currentTarget)}
        aria-label={`Editar ${item.nome}`}
        className="group flex min-h-28 w-full flex-col rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-mata-300 hover:bg-mata-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mata-600">
        <span className="flex w-full items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mata-50 text-mata-700"><Package size={20} aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold leading-snug text-stone-900 break-words">{item.nome}</span>
            <span className="mt-0.5 block text-sm text-stone-600 tabular-nums">{item.quantidade} crédito{item.quantidade === 1 ? "" : "s"} <span className="px-1 text-stone-300">·</span> <strong className="font-semibold text-stone-800">{moeda.format(Number(item.valor))}</strong></span>
          </span>
          <SquarePen size={18} className="mt-1 shrink-0 text-stone-400 transition-colors group-hover:text-mata-700" aria-hidden />
        </span>
        <span className="mt-3 flex w-full items-end justify-between gap-2 border-t border-stone-100 pt-2.5">
          <span className="min-w-0 text-sm leading-snug text-stone-500 break-words">{item.descricao || "Sem descrição"}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${item.ativo ? "bg-mata-50 text-mata-700" : "bg-stone-100 text-stone-600"}`}>{item.ativo ? "Ativo" : "Inativo"}</span>
        </span>
      </button>)}
    </div>
    {aberto && <PainelPacote key={aberto === "novo" ? "novo" : aberto.$id} item={aberto === "novo" ? null : aberto} aoFechar={fechar} aoFecharCompleto={() => (acionador.current?.isConnected ? acionador.current : botaoNovo.current)?.focus()} />}
  </section>;
}

function PainelPacote({ item, aoFechar, aoFecharCompleto }: { item: Plano | null; aoFechar: () => void; aoFecharCompleto: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estado, acao, salvando] = useActionState(async (anterior: Resultado, dados: FormData) => {
    const resultado = await salvarItem("planosPacote", anterior, dados);
    if (resultado?.ok) dialogo.current?.close();
    return resultado;
  }, undefined);
  const [excluindo, iniciarExclusao] = useTransition();
  const [erroExcluir, setErroExcluir] = useState<string>();

  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) elemento.showModal();
  }, []);

  return createPortal(<dialog ref={dialogo} onClose={() => { aoFechar(); requestAnimationFrame(aoFecharCompleto); }}
    aria-labelledby="titulo-modal-pacote"
    className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-elevado backdrop:bg-mata-950/50 backdrop:backdrop-blur-[2px]">
    <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-stone-100 px-5 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mata-50 text-mata-700"><Package size={21} aria-hidden /></span>
        <div className="min-w-0 flex-1"><h2 id="titulo-modal-pacote" className="cartao-titulo">{item ? "Editar pacote" : "Novo pacote"}</h2><p className="truncate text-sm text-stone-500">{item?.nome ?? "Configure um pacote de créditos"}</p></div>
        <button type="button" onClick={() => dialogo.current?.close()} className="btn-icone h-11 w-11 shrink-0" aria-label="Fechar"><X size={19} /></button>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); startTransition(() => acao(new FormData(e.currentTarget))); }} className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
        {item && <input type="hidden" name="$id" value={item.$id} />}
        {(estado?.erro || erroExcluir) && <div className="mb-4"><Aviso>{estado?.erro || erroExcluir}</Aviso></div>}
        <div className="space-y-4">
          <div><label htmlFor="pacote-nome" className="rotulo">Nome</label><input id="pacote-nome" name="nome" required autoFocus defaultValue={item?.nome ?? ""} placeholder="Ex.: Pacote de 4 rituais" className="campo" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="pacote-quantidade" className="rotulo">Créditos</label><input id="pacote-quantidade" name="quantidade" type="number" min="1" max="100" step="1" required defaultValue={item?.quantidade ?? ""} className="campo" /></div>
            <div><label htmlFor="pacote-valor" className="rotulo">Valor (R$)</label><input id="pacote-valor" name="valor" inputMode="decimal" required defaultValue={item?.valor ?? ""} placeholder="220,00" className="campo" /></div>
          </div>
          <div><label htmlFor="pacote-descricao" className="rotulo">Descrição</label><textarea id="pacote-descricao" name="descricao" rows={3} maxLength={1000} defaultValue={item?.descricao ?? ""} className="campo resize-y" placeholder="Breve descrição do pacote" /></div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-2.5"><input type="checkbox" name="ativo" defaultChecked={item?.ativo ?? true} className="h-5 w-5 accent-mata-700" /><span className="text-sm font-medium text-stone-800">Pacote ativo</span></label>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          {item ? <BotaoConfirmar pergunta={`Excluir ${item.nome}?`} acima alinhar="esquerda" disabled={excluindo || salvando} title="Excluir pacote" aoConfirmar={() => iniciarExclusao(async () => { try { const resultado = await excluirItem("planosPacote", item.$id); if (resultado?.erro) setErroExcluir(resultado.erro); else dialogo.current?.close(); } catch { setErroExcluir("Não foi possível excluir o pacote."); } })} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 size={16} aria-hidden /> Excluir</BotaoConfirmar> : <span />}
          <div className="flex gap-2"><button type="button" onClick={() => dialogo.current?.close()} className="btn-secundario min-h-11">Cancelar</button><button type="submit" disabled={salvando || excluindo} className="btn-primario min-h-11">{salvando ? "Salvando…" : item ? "Salvar alterações" : "Criar pacote"}</button></div>
        </div>
      </form>
    </div>
  </dialog>, document.body);
}
