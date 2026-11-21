"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { EllipsisVertical, SquarePen, ImagePlus, Link2, ChevronDown, LoaderCircle, Sparkles, Upload, X } from "lucide-react";
import { useImagem } from "@/components/useImagem";
import { toast } from "@/components/Toaster";
import { IconeTipo } from "@/components/IconeTipo";
import type { Endereco, Evento, TipoEvento } from "@/lib/types";
import { gerarDescricaoRitual, gerarImagemEvento, salvarImagemEvento, salvarInformacoesRitual } from "./editar-actions";

type DadosEditor = { evento: Evento; tipos: TipoEvento[]; enderecos: Endereco[] };
type Props = { editor?: DadosEditor; linkPublico: string };
const botao = "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";

/** O dialog nativo mantém o foco, bloqueia a página e permite navegação por teclado. */
function TelaEditor({ titulo, ocupado, aoFechar, children }: { titulo: string; ocupado: boolean; aoFechar: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { el.close(); document.body.style.overflow = anterior; };
  }, []);
  // O <html> já recebe a paleta e o tema por TemaNoDocumento. Repetir
  // app-guarnicao aqui sobrescreveria os tons escuros herdados pelo portal.
  return createPortal(<dialog ref={dialog} aria-label={titulo} aria-busy={ocupado} onCancel={e => { e.preventDefault(); if (!ocupado) aoFechar(); }} className="editor-evento fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-stone-50 p-0 text-stone-900 backdrop:bg-black/50">
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="editor-evento-cabecalho-vidro sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur-2xl">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <button type="button" aria-label="Fechar editor" disabled={ocupado} onClick={aoFechar} className="grid h-11 w-11 place-items-center rounded-full bg-stone-100 disabled:opacity-50"><X size={22} /></button>
      </header>
      {children}
    </div>
  </dialog>, document.body);
}

function Erro({ texto }: { texto: string | null }) {
  return texto ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{texto}</p> : null;
}

export function MenuEvento({ editor, linkPublico }: Props) {
  const [modal, setModal] = useState<"informacoes" | "imagem" | null>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  useEffect(() => {
    const fora = (e: PointerEvent) => { if (menu.current && !menu.current.contains(e.target as Node)) menu.current.open = false; };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && menu.current?.open) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", fora); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", escape); };
  }, []);
  const abrir = (qual: "informacoes" | "imagem") => { if (menu.current) menu.current.open = false; setModal(qual); };
  const fechar = () => { setModal(null); menu.current?.querySelector("summary")?.focus(); };
  const salvo = (destino: string) => { fechar(); toast("Evento atualizado.", "ok"); router.replace(destino, { scroll: false }); router.refresh(); };
  async function copiarLink() {
    if (menu.current) menu.current.open = false;
    let copiado = false;
    try { await navigator.clipboard.writeText(linkPublico); copiado = true; } catch { /* Usa o método antigo abaixo. */ }
    if (!copiado) {
      const campo = document.createElement("textarea");
      campo.value = linkPublico;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      try { campo.select(); copiado = document.execCommand("copy"); } catch { /* O navegador não permitiu copiar. */ }
      campo.remove();
    }
    toast(copiado ? "Link público copiado." : "Não foi possível copiar o link. Tente novamente.", copiado ? "ok" : "erro");
  }
  return <>
    <details ref={menu} className="relative">
      <summary aria-label="Opções do evento" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/30 backdrop-blur-md [&::-webkit-details-marker]:hidden"><EllipsisVertical size={22} /></summary>
      <div className="absolute right-0 top-12 z-30 w-60 overflow-hidden rounded-2xl bg-white p-1.5 text-stone-900 shadow-xl ring-1 ring-stone-200">
        {editor && <>
          <button type="button" onClick={() => abrir("informacoes")} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-stone-100"><SquarePen size={18} className="text-emerald-700" />Editar informações</button>
          <button type="button" onClick={() => abrir("imagem")} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-stone-100"><ImagePlus size={18} className="text-emerald-700" />{editor.evento.capa_file_id ? "Editar imagem" : "Criar imagem"}</button>
        </>}
        <button type="button" onClick={() => void copiarLink()} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-stone-100"><Link2 size={18} className="text-emerald-700" />Copiar link</button>
      </div>
    </details>
    {editor && modal === "informacoes" && <EditorInformacoes {...editor} aoFechar={fechar} aoSalvar={salvo} />}
    {editor && modal === "imagem" && <EditorImagem evento={editor.evento} aoFechar={fechar} aoSalvar={salvo} />}
  </>;
}

function EditorInformacoes({ evento, tipos, enderecos, aoFechar, aoSalvar }: DadosEditor & { aoFechar: () => void; aoSalvar: (destino: string) => void }) {
  const [original] = useState(evento);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mais, setMais] = useState(false);
  const [endereco, setEndereco] = useState(original.endereco_id || "__livre");
  const [tipo, setTipo] = useState(original.tipo_id);
  const [titulo, setTitulo] = useState(original.titulo);
  const [descricao, setDescricao] = useState(original.descricao || "");
  const [gerandoDescricao, setGerandoDescricao] = useState(false);
  async function criarDescricao() {
    setErro(null); setGerandoDescricao(true);
    try {
      const r = await gerarDescricaoRitual(original.$id, titulo, descricao);
      if (!r.ok) setErro(r.erro);
      else setDescricao(r.descricao);
    } catch { setErro("Não foi possível criar a descrição. Tente novamente."); }
    finally { setGerandoDescricao(false); }
  }
  return <TelaEditor titulo="Editar informações" ocupado={ocupado} aoFechar={aoFechar}>
    <form className="flex flex-1 flex-col" onInvalidCapture={e => { e.preventDefault(); setMais(true); const campo = e.target as HTMLInputElement; setErro(campo.validationMessage || "Confira os campos obrigatórios."); requestAnimationFrame(() => campo.focus()); }} onSubmit={async e => {
      e.preventDefault(); const dados = new FormData(e.currentTarget); setErro(null); setOcupado(true);
      try { const r = await salvarInformacoesRitual(original.$id, dados); if (!r.ok) setErro(r.erro); else aoSalvar(r.destino); }
      catch { setErro("A conexão falhou. Seus dados continuam no formulário; tente salvar novamente."); }
      finally { setOcupado(false); }
    }}>
      <input type="hidden" name="versao" value={original.$updatedAt} />
      <fieldset disabled={ocupado} className="min-w-0 space-y-5 p-5">
        <Erro texto={erro} />
        <div><label htmlFor="evento-titulo" className="rotulo">Título do evento</label><input autoFocus id="evento-titulo" name="titulo" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={80} required className="campo min-h-14" /></div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-3"><label htmlFor="evento-descricao" className="rotulo mb-0">Descrição</label><button type="button" onClick={criarDescricao} disabled={ocupado || gerandoDescricao} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">{gerandoDescricao ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{gerandoDescricao ? "Criando…" : "Criar com IA"}</button></div>
          <textarea id="evento-descricao" name="descricao" value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={5000} rows={6} disabled={gerandoDescricao} className="campo leading-relaxed" />
          {gerandoDescricao && <p role="status" className="mt-2 text-xs text-stone-500">Criando uma sugestão breve a partir do tema e do roteiro do ritual…</p>}
        </div>
        <button type="button" aria-expanded={mais} aria-controls="mais-opcoes-evento" onClick={() => setMais(v => !v)} className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-white p-4 text-sm font-semibold ring-1 ring-stone-200">Data, horário e endereço.<ChevronDown size={18} className={mais ? "rotate-180" : ""} /></button>
        <div id="mais-opcoes-evento" className={mais ? "space-y-5" : "hidden"}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="rotulo" htmlFor="evento-data">Data</label><input id="evento-data" name="data" type="date" required defaultValue={original.data} className="campo" /></div>
            <div><label className="rotulo" htmlFor="evento-hora">Horário</label><input id="evento-hora" name="hora_inicio" type="time" required defaultValue={original.hora_inicio} className="campo" /></div>
          </div>
          <div><label className="rotulo" htmlFor="evento-endereco">Endereço</label><select id="evento-endereco" name="endereco_id" value={endereco} onChange={e => setEndereco(e.target.value)} className="campo">{enderecos.map(e => <option key={e.$id} value={e.$id}>{e.apelido} — {e.endereco}</option>)}<option value="__livre">Outro endereço…</option></select>
            {endereco === "__livre" && <><label htmlFor="evento-endereco-livre" className="rotulo mt-3">Endereço completo</label><input id="evento-endereco-livre" name="endereco_livre" defaultValue={original.endereco_livre || ""} required maxLength={255} className="campo" /></>}
          </div>
          <fieldset><legend className="rotulo">Tipo do evento</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{tipos.map(t => <label key={t.$id} className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-3 text-center text-sm ${tipo === t.$id ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-white text-stone-600"}`}><input type="radio" name="tipo_id" value={t.$id} checked={tipo === t.$id} onChange={() => setTipo(t.$id)} className="h-4 w-4 accent-emerald-700" required /><IconeTipo nome={t.icone} size={22} /><span>{t.nome}</span></label>)}</div></fieldset>
        </div>
      </fieldset>
      <footer className="sticky bottom-0 mt-auto border-t border-stone-200 bg-white p-5 pb-[calc(1rem+env(safe-area-inset-bottom))]"><button type="submit" disabled={ocupado} className={`${botao} w-full`}>{ocupado ? <><LoaderCircle size={18} className="animate-spin" />Salvando…</> : "Salvar"}</button></footer>
    </form>
  </TelaEditor>;
}

function EditorImagem({ evento, aoFechar, aoSalvar }: { evento: Evento; aoFechar: () => void; aoSalvar: (destino: string) => void }) {
  const [original] = useState(evento);
  const input = useRef<HTMLInputElement>(null);
  const { local, erro: erroArquivo, otimizando, escolher, limpar } = useImagem("capa");
  const [ocupado, setOcupado] = useState<"salvar" | "gerar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState("");
  const [usarAtual, setUsarAtual] = useState(!!original.capa_file_id);
  const preview = local || (original.capa_file_id ? `/api/arquivo/${original.capa_file_id}` : null);
  const bloqueado = !!ocupado || otimizando;
  async function gerar() {
    setErro(null); setOcupado("gerar");
    try {
      const r = await gerarImagemEvento(original.$id, ajustes, usarAtual);
      if (!r.ok) { setErro(r.erro); return; }
      const bytes = Uint8Array.from(atob(r.base64), c => c.charCodeAt(0));
      await escolher(input.current!, new File([bytes], r.nome, { type: r.tipo }));
    } catch { setErro("A geração falhou ou a conexão foi interrompida. Tente novamente."); }
    finally { setOcupado(null); }
  }
  return <TelaEditor titulo={original.capa_file_id ? "Editar imagem" : "Criar imagem"} ocupado={bloqueado} aoFechar={aoFechar}>
    <form className="flex flex-1 flex-col" onSubmit={async e => {
      e.preventDefault(); const dados = new FormData(e.currentTarget); setErro(null); setOcupado("salvar");
      try { const r = await salvarImagemEvento(original.$id, dados); if (!r.ok) setErro(r.erro); else aoSalvar(r.destino); }
      catch { setErro("Não foi possível salvar a capa. Sua prévia foi mantida; tente novamente."); }
      finally { setOcupado(null); }
    }}>
      <input type="hidden" name="versao" value={original.$updatedAt} />
      <div className="space-y-5 p-5">
        <Erro texto={erro || erroArquivo} />
        <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-3xl bg-stone-100 ring-1 ring-stone-200">
          {preview ? <img src={preview} alt="Prévia da capa do evento" className="max-h-[45dvh] w-full object-contain" /> : <div className="flex flex-col items-center gap-3 p-8 text-stone-500"><ImagePlus size={40} /><p className="text-sm">Este evento ainda não tem imagem.</p></div>}
          <button type="button" aria-label={preview ? "Substituir imagem" : "Enviar imagem"} title={preview ? "Substituir imagem" : "Enviar imagem"} disabled={bloqueado} onClick={() => input.current?.click()} className="editor-evento-botao-vidro absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-full shadow-lg ring-1 backdrop-blur-2xl backdrop-saturate-150 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"><Upload size={19} /></button>
          {ocupado === "gerar" && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65 p-5 text-center text-white"><LoaderCircle size={36} className="animate-spin" /><p className="font-semibold">Criando sua imagem…</p><p className="text-sm">A geração pode levar alguns instantes.</p></div>}
        </div>
        <input ref={input} id="arquivo-capa-evento" name="capa" type="file" accept="image/png,image/jpeg,image/webp" disabled={bloqueado} onChange={e => { setErro(null); void escolher(e.currentTarget, e.currentTarget.files?.[0]); }} className="sr-only" />
        <div className="flex flex-wrap gap-3">
          {local && <button type="button" disabled={bloqueado} onClick={() => limpar(input.current)} className="min-h-12 px-3 text-sm text-stone-600">Descartar alteração</button>}
        </div>
        <div><label htmlFor="ajustes-imagem" className="rotulo">Orientações para a IA (opcional)</label><textarea id="ajustes-imagem" rows={3} maxLength={2000} disabled={bloqueado} value={ajustes} onChange={e => setAjustes(e.target.value)} className="campo" placeholder="Ex.: destacar a data, manter a composição e usar tons mais suaves." /></div>
        {original.capa_file_id && <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" disabled={bloqueado} checked={usarAtual} onChange={e => setUsarAtual(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" />Usar a imagem salva do evento como referência</label>}
        <button type="button" disabled={bloqueado} onClick={gerar} className={`${botao} btn-chama w-full`}>{ocupado === "gerar" ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}Gerar com IA</button>
        <p className="text-xs leading-relaxed text-stone-500">A IA usa os dados salvos do evento e as configurações do painel de Eventos. A geração é cobrada na conta da OpenAI. A capa será aplicada somente ao salvar.</p>
        {otimizando && <p role="status" className="text-sm text-stone-600">Preparando a imagem…</p>}
      </div>
      <footer className="sticky bottom-0 mt-auto border-t border-stone-200 bg-white p-5 pb-[calc(1rem+env(safe-area-inset-bottom))]"><button type="submit" disabled={bloqueado || !local || !!erroArquivo} className={`${botao} w-full`}>{ocupado === "salvar" ? <><LoaderCircle size={18} className="animate-spin" />Salvando…</> : "Salvar imagem"}</button></footer>
    </form>
  </TelaEditor>;
}
