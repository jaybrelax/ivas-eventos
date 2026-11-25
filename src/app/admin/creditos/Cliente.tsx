"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Download, FileImage, ImagePlus, Plus, Send, Settings, Ticket, Trash2, Undo2, X } from "lucide-react";
import { useImagem } from "@/components/useImagem";
import { BuscaPessoa } from "@/components/BuscaPessoa";
import { BotaoConfirmar } from "@/components/Confirmar";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { csvCampo } from "@/lib/csv";
import {
  confirmarPacoteAction, editarPacoteAction, excluirPacoteAction, lancarPacoteAction, quitarDebitoAction,
} from "./actions";

type Resultado = { ok?: string; erro?: string };

/** Roda uma ação do painel: avisa o resultado num toast e recarrega os dados da página. */
function useAcao() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const rodar = (fn: () => Promise<Resultado>) =>
    iniciar(async () => {
      const r = await fn();
      if (r.erro) toast(r.erro, "erro");
      else if (r.ok) toast(r.ok, "ok");
      router.refresh();
    });
  return { pendente, rodar };
}

/** Confirmar ou cancelar um pacote na lista da equipe. */
export type DadosPacote = { nome: string; valor: number | null; observacao: string | null; comprovante: string | null };

export function AcoesPacote({ pacoteId, situacao, quantidade, dados }: { pacoteId: string; situacao: "pendente" | "informado" | "pago" | "cancelado"; quantidade: number; dados: DadosPacote }) {
  const { pendente, rodar } = useAcao();
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd] = useState(String(quantidade));
  const [sit, setSit] = useState<string>(situacao);
  const [remover, setRemover] = useState(false);
  const { local, erro: erroFoto, otimizando, escolher } = useImagem("comprovante");
  const editor = editando && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Editar pacote">
      <div className="fixed inset-0 bg-stone-950/60" onClick={() => setEditando(false)} />
      <form
        className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-5 text-left shadow-2xl"
        onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); rodar(async () => { const r = await editarPacoteAction(pacoteId, fd); if (r.ok) setEditando(false); return r; }); }}
      >
        <h3 className="text-sm font-semibold text-stone-900">Editar pacote</h3>
        <div>
          <label className="rotulo" htmlFor={`ep-n-${pacoteId}`}>Nome do pacote</label>
          <input id={`ep-n-${pacoteId}`} name="nome" required maxLength={80} defaultValue={dados.nome} className="campo" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo" htmlFor={`ep-v-${pacoteId}`}>Valor pago (R$)</label>
            <input id={`ep-v-${pacoteId}`} name="valor" inputMode="decimal" defaultValue={dados.valor != null ? dados.valor.toFixed(2).replace(".", ",") : ""} placeholder="vazio = cortesia" className="campo tabular-nums" />
          </div>
          <div>
            <label className="rotulo" htmlFor={`ep-q-${pacoteId}`}>Número de créditos</label>
            <input id={`ep-q-${pacoteId}`} name="quantidade" type="number" min={1} max={100} required value={qtd} onChange={(e) => setQtd(e.target.value)} className="campo" />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor={`ep-s-${pacoteId}`}>Situação do pagamento</label>
          <select id={`ep-s-${pacoteId}`} name="situacao" value={sit} onChange={(e) => setSit(e.target.value)} className="campo">
            <option value="pendente">Aguardando pagamento</option>
            <option value="informado">Para conferir</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor={`ep-o-${pacoteId}`}>Observação</label>
          <input id={`ep-o-${pacoteId}`} name="observacao" maxLength={500} defaultValue={dados.observacao ?? ""} className="campo" />
        </div>
        <div className="space-y-1.5">
          <p className="rotulo">Comprovante de pagamento</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 p-2.5 transition hover:border-mata-300">
            {local
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={local} alt="Comprovante escolhido" className="h-12 w-12 rounded-lg object-cover" />
              : <span className="grid h-12 w-12 place-items-center rounded-lg bg-white text-stone-400 ring-1 ring-stone-200"><ImagePlus size={18} aria-hidden /></span>}
            <span className="text-xs text-stone-500">{local ? "Toque para trocar a imagem" : dados.comprovante && !remover ? "Toque para trocar o comprovante atual" : "Toque para anexar o comprovante"}</span>
            <input type="file" name="comprovante" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { escolher(e.currentTarget, e.target.files?.[0]); if (e.target.files?.[0]) setRemover(false); }} />
          </label>
          {otimizando && <p className="text-xs text-stone-500">Otimizando a imagem…</p>}
          {erroFoto && <p className="text-xs text-red-700">{erroFoto}</p>}
          {dados.comprovante && !local && (
            <p className="flex flex-wrap items-center gap-3 text-xs">
              <a href={`/api/comprovante/${dados.comprovante}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-mata-700 hover:underline"><FileImage size={13} aria-hidden /> Ver comprovante atual</a>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-stone-600"><input type="checkbox" name="remover_comprovante" checked={remover} onChange={(e) => setRemover(e.target.checked)} className="h-3.5 w-3.5 accent-red-700" /> Remover</label>
            </p>
          )}
        </div>
        <p className="ajuda">Reduzir remove os últimos créditos que não foram usados nem cedidos. Marcar como pago libera os créditos.</p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <BotaoConfirmar pergunta="Excluir este pacote e seus créditos? Não dá para desfazer." confirmar="Sim, excluir" acima alinhar="esquerda" aoConfirmar={() => rodar(async () => { const r = await excluirPacoteAction(pacoteId); if (r.ok) setEditando(false); return r; })} disabled={pendente} className="btn-fantasma h-9 px-2.5 text-xs text-red-700">
            <Trash2 size={14} aria-hidden /> Excluir
          </BotaoConfirmar>
          <span className="flex gap-2">
            <button type="button" className="btn-secundario h-9" onClick={() => setEditando(false)} disabled={pendente}>Fechar</button>
            <button type="submit" className="btn-primario h-9" disabled={pendente || otimizando}>{pendente ? "Salvando…" : "Salvar"}</button>
          </span>
        </div>
      </form>
    </div>
  );
  const botaoEditar = (
    <button type="button" onClick={() => { setQtd(String(quantidade)); setSit(situacao); setRemover(false); setEditando(true); }} className="btn-fantasma h-8 w-8 px-0" title="Configurar pacote" aria-label="Configurar pacote">
      <Settings size={14} aria-hidden />
    </button>
  );
  if (situacao === "cancelado") return <div className="flex justify-end">{botaoEditar}{editor}</div>;
  return (
    <div className="flex items-center justify-end gap-1.5">
      {botaoEditar}{editor}
      {situacao !== "pago" && (
        <button type="button" disabled={pendente} onClick={() => rodar(() => confirmarPacoteAction(pacoteId))} className="btn-primario h-8 px-3 text-xs">
          <Check size={14} aria-hidden /> Confirmar pagamento
        </button>
      )}
    </div>
  );
}

/** Usa um crédito da própria pessoa para quitar um débito. */
export function QuitarDebito({ inscricaoId, temCredito }: { inscricaoId: string; temCredito: boolean }) {
  const { pendente, rodar } = useAcao();
  return (
    <button
      type="button"
      disabled={pendente || !temCredito}
      title={temCredito ? undefined : "A pessoa não tem crédito disponível: lance um pacote primeiro"}
      onClick={() => rodar(() => quitarDebitoAction(inscricaoId))}
      className="btn-secundario h-8 px-3 text-xs"
    >
      {pendente ? <Carregando /> : "Quitar com crédito"}
    </button>
  );
}

export type PessoaOpcao = { id: string; nome: string; foto?: string | null };
export type PlanoOpcao = { id: string; nome: string; quantidade: number; valor: number };

/** Formulário de lançamento de pacote. Com `pessoaFixa`, a pessoa já vem escolhida (ficha do participante). */
export function LancarPacote({ planos, pessoas, pessoaFixa }: { planos: PlanoOpcao[]; pessoas: PessoaOpcao[]; pessoaFixa?: PessoaOpcao }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [plano, setPlano] = useState(planos[0]?.id ?? "personalizado");
  const [pendente, iniciar] = useTransition();
  const personalizado = plano === "personalizado";

  if (!aberto) {
    return (
      <button type="button" className="btn-primario h-9 text-sm" onClick={() => setAberto(true)}>
        <Plus size={15} aria-hidden /> Lançar pacote
      </button>
    );
  }

  return (
    <form
      className="w-full space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          const r = await lancarPacoteAction(fd);
          if (r.erro) { toast(r.erro, "erro"); return; }
          toast(r.ok ?? "Pacote lançado.", "ok");
          setAberto(false);
          router.refresh();
        });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-900">Lançar pacote{pessoaFixa ? ` para ${pessoaFixa.nome}` : ""}</h3>
        <button type="button" onClick={() => setAberto(false)} className="grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={16} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {pessoaFixa ? (
          <input type="hidden" name="usuario_id" value={pessoaFixa.id} />
        ) : (
          <div>
            <label className="rotulo" htmlFor="lp-pessoa">Pessoa</label>
            <BuscaPessoa id="lp-pessoa" name="usuario_id" opcoes={pessoas} />
          </div>
        )}
        <div>
          <label className="rotulo" htmlFor="lp-plano">Pacote</label>
          <select id="lp-plano" name="plano_id" value={plano} onChange={(e) => setPlano(e.target.value)} className="campo">
            {planos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.quantidade} créditos, {p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</option>)}
            <option value="personalizado">Personalizado…</option>
          </select>
        </div>
        {personalizado && (
          <>
            <div>
              <label className="rotulo" htmlFor="lp-nome">Nome do pacote</label>
              <input id="lp-nome" name="nome" required maxLength={80} className="campo" placeholder="Ex.: Cortesia" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="rotulo" htmlFor="lp-qtd">Créditos</label>
                <input id="lp-qtd" name="quantidade" type="number" min={1} max={100} required className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="lp-valor">Valor (R$)</label>
                <input id="lp-valor" name="valor" inputMode="decimal" className="campo" placeholder="vazio = cortesia" />
              </div>
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="lp-obs">Observação (opcional)</label>
          <input id="lp-obs" name="observacao" maxLength={500} className="campo" placeholder="Ex.: pago em dinheiro no ritual 512" />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" name="pago" defaultChecked className="h-4 w-4 rounded accent-mata-700" />
        Pagamento já recebido (libera os créditos agora)
      </label>
      <p className="ajuda">Sem marcar, o pacote fica aguardando e os créditos só liberam quando você confirmar o pagamento.</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secundario h-10" onClick={() => setAberto(false)} disabled={pendente}>Cancelar</button>
        <button type="submit" className="btn-primario h-10" disabled={pendente}>{pendente ? "Lançando…" : "Lançar pacote"}</button>
      </div>
    </form>
  );
}

/** Filtros do histórico (usuário, ritual, pacote e período), guardados na URL. */
export function FiltrosHistorico({ pessoas, eventos, pacotes }: { pessoas: PessoaOpcao[]; eventos: { id: string; titulo: string }[]; pacotes: { id: string; titulo: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const aplicar = (chave: string, valor: string) => {
    const p = new URLSearchParams(sp);
    if (valor) p.set(chave, valor); else p.delete(chave);
    p.set("aba", "historico");
    iniciar(() => router.replace(`/admin/creditos?${p}`, { scroll: false }));
  };
  const v = (c: string) => sp.get(c) ?? "";
  return (
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <select value={v("usuario")} onChange={(e) => aplicar("usuario", e.target.value)} className="campo col-span-2 h-10 w-full text-sm sm:col-span-1 sm:h-9 sm:w-auto sm:max-w-48" aria-label="Filtrar por pessoa">
        <option value="">Todas as pessoas</option>
        {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
      <select value={v("evento")} onChange={(e) => aplicar("evento", e.target.value)} className="campo col-span-2 h-10 w-full text-sm sm:col-span-1 sm:h-9 sm:w-auto sm:max-w-48" aria-label="Filtrar por ritual">
        <option value="">Todos os rituais</option>
        {eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
      </select>
      <select value={v("pacote")} onChange={(e) => aplicar("pacote", e.target.value)} className="campo col-span-2 h-10 w-full text-sm sm:col-span-1 sm:h-9 sm:w-auto sm:max-w-48" aria-label="Filtrar por pacote">
        <option value="">Todos os pacotes</option>
        {pacotes.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
      </select>
      <input type="date" value={v("de")} onChange={(e) => aplicar("de", e.target.value)} className="campo h-10 w-full min-w-0 text-sm sm:h-9 sm:w-auto" aria-label="Data inicial" />
      <input type="date" value={v("ate")} onChange={(e) => aplicar("ate", e.target.value)} className="campo h-10 w-full min-w-0 text-sm sm:h-9 sm:w-auto" aria-label="Data final" />
      {pendente && <Carregando />}
    </div>
  );
}

export function ExportarHistoricoCsv({ cabecalho, linhas, nomeArquivo }: { cabecalho: string[]; linhas: string[][]; nomeArquivo: string }): ReactNode {
  const exportar = () => {
    const csv = [cabecalho, ...linhas].map((l) => l.map((c) => csvCampo(String(c))).join(";")).join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={exportar} disabled={!linhas.length} className="btn-secundario h-9 px-3 text-sm">
      <Download size={15} aria-hidden /> Exportar CSV
    </button>
  );
}
