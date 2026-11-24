"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent as KE } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { CabecalhoAba } from "./CabecalhoAba";
import { ArrowUp, BellRing, Check, ChevronDown, ChevronRight, ImagePlus, ListChecks, Loader2, Megaphone, MessagesSquare, MoreVertical, Pencil, Pin, Plus, PinOff, RotateCcw, Trash2, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BotaoConfirmar } from "@/components/Confirmar";
import { toast } from "@/components/Toaster";
import { IMAGENS_MAX, partesTexto, semAcento, textoSimples, TEXTO_MAX, tokenMencao, type TipoCentral } from "@/lib/central-texto";
import { otimizarImagem } from "@/lib/imagem";
import { concluirTarefa, criarPost, descartarImagemCentral, editarPost, enviarImagemCentral, excluirPost, fixarPost } from "./central-actions";
import type { DadosCentral, PessoaCentral, PostCentral } from "./central-dados";
import { GaleriaFotos } from "./GaleriaFotos";

/** `chip`: selo no post; `off`: opção não escolhida no editor (só o contorno); `on`: opção escolhida. */
const TIPOS: Record<TipoCentral, { rotulo: string; Icone: LucideIcon; chip: string; off: string; on: string }> = {
  aviso: { rotulo: "Aviso", Icone: Megaphone, chip: "bg-sky-50 text-sky-700 ring-sky-200", off: "text-sky-700/80 ring-sky-200 hover:bg-sky-50", on: "bg-sky-600 text-white ring-sky-600" },
  lembrete: { rotulo: "Lembrete", Icone: BellRing, chip: "bg-amber-50 text-amber-700 ring-amber-200", off: "text-amber-700/80 ring-amber-200 hover:bg-amber-50", on: "bg-amber-500 text-white ring-amber-500" },
  ocorrencia: { rotulo: "Ocorrência", Icone: TriangleAlert, chip: "bg-rose-50 text-rose-700 ring-rose-200", off: "text-rose-700/80 ring-rose-200 hover:bg-rose-50", on: "bg-rose-600 text-white ring-rose-600" },
  tarefa: { rotulo: "Tarefa", Icone: ListChecks, chip: "bg-mata-50 text-mata-700 ring-mata-200", off: "text-mata-700/80 ring-mata-200 hover:bg-mata-50", on: "bg-mata-700 text-white ring-mata-700" },
};
const ORDEM_TIPOS: TipoCentral[] = ["aviso", "lembrete", "ocorrencia", "tarefa"];

type Filtro = "todos" | "abertas" | "ocorrencia" | "lembrete" | "fixados" | "eu";

/** Marca a página como "em edição" para o atualizar-ao-vivo não recarregar no meio do que está sendo escrito. */
function useEmEdicao(ativo: boolean) {
  useEffect(() => {
    const raiz = document.documentElement;
    if (ativo) raiz.dataset.gravando = "central";
    else if (raiz.dataset.gravando === "central") delete raiz.dataset.gravando;
    return () => { if (raiz.dataset.gravando === "central") delete raiz.dataset.gravando; };
  }, [ativo]);
}

function quando(iso: string) {
  const d = new Date(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  const rel = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (s < 45) return "agora";
  if (s < 3600) return rel.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rel.format(-Math.round(s / 3600), "hour");
  if (s < 7 * 86400) return rel.format(-Math.round(s / 86400), "day");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
const completo = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Central de informações do evento: a equipe registra avisos, lembretes, ocorrências e tarefas,
 * marca pessoas com @ e anexa fotos. Os posts aparecem para todos que fazem parte do evento.
 */
export function CentralEvento({ eventoId, dados }: { eventoId: string; dados: DadosCentral }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const pessoaPorId = useMemo(() => new Map(dados.pessoas.map((p) => [p.id, p])), [dados.pessoas]);

  // Botão "voltar ao início": aparece depois de rolar a página e leva ao começo dos registros
  const secao = useRef<HTMLElement>(null);
  const [rolou, setRolou] = useState(false);
  const [montou, setMontou] = useState(false);
  useEffect(() => setMontou(true), []);
  useEffect(() => {
    // Só com a aba da Central aberta (os painéis das outras abas ficam montados, mas ocultos)
    const checar = () => setRolou(window.scrollY > 800 && !!secao.current && secao.current.offsetParent !== null);
    checar();
    window.addEventListener("scroll", checar, { passive: true });
    // Trocar de aba não rola a página: o painel oculto/mostrado muda o tamanho da seção
    const obs = secao.current ? new ResizeObserver(checar) : null;
    if (secao.current) obs?.observe(secao.current);
    return () => { window.removeEventListener("scroll", checar); obs?.disconnect(); };
  }, []);
  const aoTopo = () => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    secao.current?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
  };

  const filtros: { id: Filtro; rotulo: string; n: number }[] = [
    { id: "todos", rotulo: "Todos", n: dados.posts.length },
    { id: "abertas", rotulo: "Tarefas abertas", n: dados.tarefasAbertas },
    { id: "ocorrencia", rotulo: "Ocorrências", n: dados.posts.filter((p) => p.tipo === "ocorrencia").length },
    { id: "lembrete", rotulo: "Lembretes", n: dados.posts.filter((p) => p.tipo === "lembrete").length },
    { id: "fixados", rotulo: "Fixados", n: dados.posts.filter((p) => p.fixado).length },
    { id: "eu", rotulo: "Me marcaram", n: dados.meMarcaram },
  ];
  const visiveis = dados.posts.filter((p) =>
    filtro === "todos" ? true
      : filtro === "abertas" ? p.tipo === "tarefa" && !p.concluida
        : filtro === "fixados" ? p.fixado
          : filtro === "eu" ? p.mencoes.includes(dados.euId)
            : p.tipo === filtro);

  return (
    <section ref={secao} aria-label="Central de informações" className="scroll-mt-4 space-y-3 p-2 pt-1 sm:space-y-4 sm:p-4 sm:pt-2 md:p-5 md:pt-3">
      <CabecalhoAba
        Icone={MessagesSquare}
        titulo="Central de informações"
        resumo={dados.posts.length ? `${dados.posts.length} ${dados.posts.length === 1 ? "registro" : "registros"}${dados.tarefasAbertas ? ` · ${dados.tarefasAbertas} ${dados.tarefasAbertas === 1 ? "tarefa aberta" : "tarefas abertas"}` : ""}` : "Nenhum registro ainda"}
        fundo="linear-gradient(180deg, #7c5ab8 0%, #3b2466 100%)"
        className="px-1 pt-1.5 sm:px-0"
      />
      <Editor eventoId={eventoId} pessoas={dados.pessoas} />

      {dados.posts.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filtrar posts">
          {filtros.filter((f) => f.id === "todos" || f.n > 0).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ring-1 transition ${
                filtro === f.id ? "bg-mata-700 text-white ring-mata-700" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {f.rotulo}
              <span className={`rounded-full px-1.5 tabular-nums ${filtro === f.id ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{f.n}</span>
            </button>
          ))}
        </div>
      )}

      {visiveis.length ? (
        <ul className="space-y-2.5">
          {visiveis.map((p) => <Post key={p.id} eventoId={eventoId} post={p} pessoaPorId={pessoaPorId} pessoas={dados.pessoas} gestao={dados.gestao} />)}
        </ul>
      ) : dados.posts.length ? (
        <p className="py-8 text-center text-sm text-stone-400">Nada neste filtro.</p>
      ) : (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mata-50 text-mata-600"><MessagesSquare size={22} aria-hidden /></span>
          <p className="text-sm font-semibold text-stone-700">Nenhum registro ainda</p>
          <p className="max-w-xs text-sm text-stone-500">Registre aqui ocorrências, lembretes e tarefas do ritual. Toda a equipe do evento vê.</p>
        </div>
      )}

      {/* Flutuante: some no topo da página; no celular fica acima do menu inferior.
          Vai para o <body>: dentro do painel da aba (que tem transform/overflow) o `fixed` ficava preso ao painel, lá embaixo. */}
      {montou && createPortal(<button
        type="button"
        onClick={aoTopo}
        tabIndex={rolou ? 0 : -1}
        aria-hidden={!rolou}
        aria-label="Voltar ao início dos registros"
        className={`fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+1.25rem)] z-30 grid h-11 w-11 place-items-center rounded-full bg-stone-200 text-mata-700 shadow-[0_2px_6px_rgb(0_0_0/0.18),0_10px_24px_-8px_rgb(0_0_0/0.35)] transition duration-300 ease-out hover:bg-stone-300 active:scale-95 motion-reduce:transition-none md:right-8 md:bottom-8 ${rolou ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
      >
        <ArrowUp size={20} strokeWidth={2.4} aria-hidden />
      </button>, document.body)}
    </section>
  );
}

type Foto ={ chave: string; previa: string; id?: string; erro?: string };

/** Cor do ícone de cada tipo na lista suspensa: o primeiro (Aviso) é o neutro, os outros têm a sua cor. */
const ICONE_TIPO: Record<TipoCentral, string> = {
  aviso: "bg-stone-100 text-stone-600",
  lembrete: "bg-amber-50 text-amber-600",
  ocorrencia: "bg-rose-50 text-rose-600",
  tarefa: "bg-mata-50 text-mata-700",
};

/** Lista suspensa do tipo do post: botão com o tipo atual e menu com as quatro opções. */
function SeletorTipo({ tipo, aoEscolher }: { tipo: TipoCentral; aoEscolher: (t: TipoCentral) => void }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);
  const atual = TIPOS[tipo];
  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={`Tipo do post: ${atual.rotulo}`}
        className="inline-flex h-10 w-44 items-center gap-2 rounded-xl border border-stone-200 bg-white pr-2.5 pl-1.5 text-sm font-semibold text-stone-800 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition hover:border-mata-300 hover:ring-4 hover:ring-mata-50 aria-expanded:border-mata-400 aria-expanded:ring-4 aria-expanded:ring-mata-50"
      >
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${ICONE_TIPO[tipo]}`}><atual.Icone size={15} aria-hidden /></span>
        <span className="flex-1 text-left">{atual.rotulo}</span>
        <ChevronDown size={15} className={`text-stone-400 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {aberto && (
        <ul role="listbox" aria-label="Tipo do post" className="menu-pop absolute top-full right-0 z-20 mt-2 w-56 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.06),0_18px_40px_-10px_rgb(20_42_29/0.35)]">
          {ORDEM_TIPOS.map((t) => {
            const { rotulo, Icone } = TIPOS[t];
            const sel = tipo === t;
            return (
              <li key={t} role="option" aria-selected={sel}>
                <button
                  type="button"
                  onClick={() => { aoEscolher(t); setAberto(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm transition ${sel ? "bg-stone-50 font-semibold text-stone-900" : "text-stone-700 hover:bg-stone-50"}`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${ICONE_TIPO[t]}`}><Icone size={16} aria-hidden /></span>
                  <span className="flex-1">{rotulo}</span>
                  {sel && <Check size={15} className="shrink-0 text-mata-700" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Escrever um post (ou editar um existente): tipo, texto com @menções e fotos. As fotos são
 * reduzidas no navegador e enviadas uma a uma assim que escolhidas; o post só leva os ids.
 */
function Editor({ eventoId, pessoas, post, aoTerminar }: { eventoId: string; pessoas: PessoaCentral[]; post?: PostCentral; aoTerminar?: () => void }) {
  const router = useRouter();
  const editando = !!post;
  const [tipo, setTipo] = useState<TipoCentral>(post?.tipo ?? "aviso");
  const [texto, setTexto] = useState(post ? textoSimples(post.texto) : "");
  // Menções escolhidas no autocomplete: nome exibido → id (viram @[Nome](id) ao publicar)
  const [marcadas, setMarcadas] = useState<{ nome: string; id: string }[]>(() =>
    post ? partesTexto(post.texto).flatMap((p) => (p.tipo === "mencao" ? [{ nome: p.nome, id: p.id }] : [])) : []);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [aberto, setAberto] = useState(editando);
  const [salvando, iniciar] = useTransition();
  const campo = useRef<HTMLTextAreaElement>(null);
  const seletor = useRef<HTMLInputElement>(null);

  // Autocomplete do @
  const [busca, setBusca] = useState<{ termo: string; inicio: number } | null>(null);
  const [ativa, setAtiva] = useState(0);
  // Só "@": lista quem é deste ritual. Digitando o nome, aparecem também os de fora (depois dos do ritual).
  const sugestoes = useMemo(() => {
    if (!busca) return [];
    const t = semAcento(busca.termo.trim());
    const casa = (p: PessoaCentral) => !t || semAcento(p.nome).startsWith(t) || semAcento(p.nome).split(/\s+/).some((parte) => parte.startsWith(t));
    const doRitual = pessoas.filter((p) => p.doEvento && casa(p));
    const outros = t ? pessoas.filter((p) => !p.doEvento && casa(p)) : [];
    return [...doRitual.slice(0, 8), ...outros.slice(0, Math.max(3, 8 - doRitual.length))];
  }, [busca, pessoas]);

  const enviando = fotos.some((f) => !f.id && !f.erro);
  const prontas = fotos.filter((f) => f.id);
  const sujo = texto.trim().length > 0 || fotos.length > 0;
  useEmEdicao(sujo || enviando);

  // A caixa cresce com o texto
  useEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [texto, aberto]);

  function detectarArroba(valor: string, cursor: number) {
    const antes = valor.slice(0, cursor);
    const m = /(^|\s)@([^\s@]{0,30}(?: [^\s@]{0,30})?)$/.exec(antes);
    if (m) { setBusca({ termo: m[2], inicio: cursor - m[2].length - 1 }); setAtiva(0); }
    else setBusca(null);
  }

  function escolher(p: PessoaCentral) {
    if (!busca || !campo.current) return;
    const cursor = campo.current.selectionStart;
    const nome = p.nome.split(/\s+/).slice(0, 2).join(" ");
    const novo = `${texto.slice(0, busca.inicio)}@${nome} ${texto.slice(cursor)}`;
    setTexto(novo);
    setMarcadas((m) => (m.some((x) => x.id === p.id) ? m : [...m, { nome, id: p.id }]));
    setBusca(null);
    const pos = busca.inicio + nome.length + 2;
    requestAnimationFrame(() => { campo.current?.focus(); campo.current?.setSelectionRange(pos, pos); });
  }

  function teclas(e: KE<HTMLTextAreaElement>) {
    if (busca && sugestoes.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setAtiva((a) => (a + 1) % sugestoes.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setAtiva((a) => (a - 1 + sugestoes.length) % sugestoes.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); escolher(sugestoes[ativa]); return; }
      if (e.key === "Escape") { e.preventDefault(); setBusca(null); return; }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); publicar(); }
  }

  async function adicionarFotos(lista: FileList | null) {
    if (!lista?.length) return;
    const vagas = IMAGENS_MAX - fotos.length;
    if (vagas <= 0) { toast(`No máximo ${IMAGENS_MAX} fotos por post.`); return; }
    const escolhidas = [...lista].slice(0, vagas);
    if (lista.length > vagas) toast(`Só cabem mais ${vagas} ${vagas === 1 ? "foto" : "fotos"} neste post.`);
    await Promise.all(escolhidas.map(async (bruto) => {
      const chave = `${bruto.name}-${bruto.size}-${Math.random().toString(36).slice(2, 7)}`;
      let pronto: File;
      try { pronto = await otimizarImagem(bruto, "galeria"); }
      catch (e) { toast(e instanceof Error ? e.message : "Não foi possível ler a imagem."); return; }
      const previa = URL.createObjectURL(pronto);
      setFotos((f) => [...f, { chave, previa }]);
      const fd = new FormData();
      fd.set("foto", pronto);
      const r = await enviarImagemCentral(eventoId, fd).catch(() => ({ erro: "Falha de conexão ao enviar a foto." } as { id?: string; erro?: string }));
      setFotos((f) => f.map((x) => (x.chave === chave ? { ...x, id: r.id, erro: r.id ? undefined : r.erro ?? "Falhou" } : x)));
      if (r.erro) toast(r.erro);
    }));
  }

  function removerFoto(f: Foto) {
    URL.revokeObjectURL(f.previa);
    setFotos((lista) => lista.filter((x) => x.chave !== f.chave));
    if (f.id) void descartarImagemCentral(eventoId, f.id);
  }

  function limpar() {
    fotos.forEach((f) => { URL.revokeObjectURL(f.previa); if (f.id) void descartarImagemCentral(eventoId, f.id); });
    setFotos([]); setTexto(""); setMarcadas([]); setTipo("aviso"); setBusca(null);
    if (!editando) setAberto(false);
    aoTerminar?.();
  }

  /** Troca cada "@Nome" escolhido no autocomplete pelo token da menção (a primeira ocorrência de cada). */
  function textoComMencoes() {
    let t = texto;
    for (const m of marcadas) {
      const alvo = `@${m.nome}`;
      const i = t.indexOf(alvo);
      if (i >= 0) t = t.slice(0, i) + tokenMencao(m.nome, m.id) + t.slice(i + alvo.length);
    }
    return t;
  }

  function publicar() {
    if (salvando || enviando) return;
    if (!texto.trim() && !prontas.length) { campo.current?.focus(); return; }
    iniciar(async () => {
      const entrada = { tipo, texto: textoComMencoes(), imagens: prontas.map((f) => f.id!) };
      const r = editando ? await editarPost(eventoId, post!.id, entrada) : await criarPost(eventoId, entrada);
      if (r.erro) { toast(r.erro); return; }
      fotos.forEach((f) => URL.revokeObjectURL(f.previa));
      setFotos([]); setTexto(""); setMarcadas([]); setBusca(null);
      if (!editando) { setTipo("aviso"); setAberto(false); }
      aoTerminar?.();
      toast(r.ok ?? "Publicado.", "ok");
      router.refresh();
    });
  }

  if (!aberto) {
    const abrir = () => { setAberto(true); requestAnimationFrame(() => campo.current?.focus()); };
    return (
      <button
        type="button"
        onClick={abrir}
        className="group flex w-full items-center gap-3 rounded-full bg-emerald-50 p-2 pr-5 text-left ring-1 ring-emerald-100 transition hover:bg-emerald-100/70 hover:ring-emerald-200 active:scale-[0.99]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm transition group-hover:rotate-90 group-hover:bg-emerald-500"><Plus size={20} strokeWidth={2.4} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-tight font-semibold text-emerald-900">Novo registro</span>
          <span className="block truncate text-xs text-stone-500">Ocorrência, lembrete, aviso ou tarefa</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-emerald-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden />
      </button>
    );
  }

  return (
    <div className={`${editando ? "" : "border-b border-stone-100 pb-4"}`}>
      {/* Tipo: lista suspensa; ao lado, a dica do que fazer */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-base font-semibold tracking-tight text-stone-700">Informar algo</span>
        <SeletorTipo tipo={tipo} aoEscolher={setTipo} />
      </div>

      {/* Texto com autocomplete do @ */}
      <div className="relative">
        <textarea
          ref={campo}
          value={texto}
          maxLength={TEXTO_MAX}
          rows={3}
          onChange={(e) => { setTexto(e.target.value); detectarArroba(e.target.value, e.target.selectionStart); }}
          onKeyDown={teclas}
          onClick={(e) => detectarArroba(texto, e.currentTarget.selectionStart)}
          onBlur={() => setTimeout(() => setBusca(null), 150)}
          placeholder={tipo === "tarefa" ? "O que precisa ser feito? Use @ para marcar alguém." : "Escreva aqui. Use @ para marcar alguém."}
          aria-label="Texto do post"
          className="campo min-h-[5.5rem] resize-none py-2.5 text-[15px] leading-relaxed transition-[border-color,box-shadow] duration-200 hover:border-mata-300 hover:ring-4 hover:ring-mata-50"
        />
        {busca && sugestoes.length > 0 && (
          <ul role="listbox" aria-label="Pessoas para marcar" className="menu-pop origem-esq absolute top-full left-0 z-30 mt-1 max-h-80 w-72 max-w-full overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-elevado">
            {sugestoes.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === ativa}>
                {/* Separador antes do primeiro de fora do ritual */}
                {!p.doEvento && (i === 0 || sugestoes[i - 1].doEvento) && (
                  <p className="mt-1 border-t border-stone-100 px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">Fora deste ritual</p>
                )}
                <button type="button" onMouseDown={(e) => { e.preventDefault(); escolher(p); }} onMouseEnter={() => setAtiva(i)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm ${i === ativa ? "bg-mata-50 text-mata-900" : "text-stone-700"}`}>
                  <Avatar nome={p.nome} foto={p.foto} tamanho={26} leve />
                  <span className="min-w-0 flex-1 truncate font-medium">{p.nome}</span>
                  <span className="shrink-0 text-[11px] text-stone-400">{p.papel === "mestre" ? "Mestre" : p.papel === "guardiao" ? "Guardião" : "Participante"}</span>
                </button>
                </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fotos do rascunho */}
      {fotos.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {fotos.map((f) => (
            <li key={f.chave} className="relative h-20 w-20 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.previa} alt="" className={`h-full w-full object-cover ${f.id ? "" : "opacity-60"}`} />
              {!f.id && !f.erro && <span className="absolute inset-0 grid place-items-center bg-white/40"><Loader2 size={20} className="animate-spin text-mata-700" aria-label="Enviando" /></span>}
              {f.erro && <span className="absolute inset-x-0 bottom-0 bg-rose-600 px-1 py-0.5 text-center text-[10px] font-semibold text-white">Falhou</span>}
              <button type="button" onClick={() => removerFoto(f)} aria-label="Remover foto"
                className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Ações */}
      <div className="mt-3 flex items-center gap-2">
        {!editando && (
          <>
            <input ref={seletor} type="file" accept="image/*" multiple hidden onChange={(e) => { void adicionarFotos(e.target.files); e.target.value = ""; }} />
            <button type="button" onClick={() => seletor.current?.click()} disabled={fotos.length >= IMAGENS_MAX}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-stone-100 px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-200 disabled:opacity-50">
              <ImagePlus size={16} aria-hidden /> Fotos{fotos.length ? <span className="text-stone-400 tabular-nums">{fotos.length}/{IMAGENS_MAX}</span> : null}
            </button>
          </>
        )}
        <span className="ml-auto hidden text-[11px] text-stone-400 sm:inline">Ctrl+Enter publica</span>
        <button type="button" onClick={limpar} className="btn-secundario h-9 rounded-full! px-3.5 text-sm max-sm:ml-auto">Cancelar</button>
        <button type="button" onClick={publicar} disabled={salvando || enviando || (!texto.trim() && !prontas.length)} className="btn-primario h-9 rounded-full! px-4 text-sm">
          {salvando ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
          {enviando ? "Enviando fotos…" : editando ? "Salvar" : "Publicar"}
        </button>
      </div>
    </div>
  );
}

function TextoPost({ texto, pessoaPorId }: { texto: string; pessoaPorId: Map<string, PessoaCentral> }) {
  return (
    <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-stone-800">
      {partesTexto(texto).map((p, i) =>
        p.tipo === "texto" ? <span key={i}>{p.valor}</span>
          : p.tipo === "link" ? <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-mata-700 underline decoration-mata-300 underline-offset-2 hover:decoration-mata-600">{p.url.replace(/^https?:\/\//, "")}</a>
            : (
              <span key={i} className="mx-0.5 inline-flex translate-y-[3px] items-center gap-1 rounded-full bg-mata-50 py-0.5 pr-2 pl-0.5 align-baseline text-[13px] font-semibold text-mata-800 ring-1 ring-mata-100" title={pessoaPorId.get(p.id)?.nome ?? p.nome}>
                <Avatar nome={pessoaPorId.get(p.id)?.nome ?? p.nome} foto={pessoaPorId.get(p.id)?.foto} tamanho={18} leve />
                {p.nome.split(/\s+/)[0]}
              </span>
            ))}
    </p>
  );
}

function Post({ eventoId, post, pessoaPorId, pessoas, gestao }: { eventoId: string; post: PostCentral; pessoaPorId: Map<string, PessoaCentral>; pessoas: PessoaCentral[]; gestao: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pendente, iniciar] = useTransition();
  const raizMenu = useRef<HTMLDivElement>(null);
  const t = TIPOS[post.tipo];
  const concluida = post.tipo === "tarefa" && !!post.concluida;

  useEffect(() => {
    if (!menu) return;
    const fora = (e: MouseEvent) => { if (!raizMenu.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [menu]);

  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) => iniciar(async () => {
    const r = await fn();
    if (r.erro) toast(r.erro); else { if (r.ok) toast(r.ok, "ok"); router.refresh(); }
  });

  if (editando) return <li><Editor eventoId={eventoId} pessoas={pessoas} post={post} aoTerminar={() => setEditando(false)} /></li>;

  const temMenu = post.podeEditar || post.podeExcluir || gestao;
  return (
    <li className={`relative rounded-2xl border bg-white p-3 transition sm:p-4 ${post.fixado ? "border-ouro-200 bg-gradient-to-b from-ouro-50/50 to-white" : "border-stone-200/80"} ${concluida ? "opacity-70" : ""} ${pendente ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex items-start gap-2.5">
        <Avatar nome={post.autor.nome} foto={post.autor.foto} tamanho={36} leve className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-tight">
            <span className="font-semibold text-stone-900">{post.autor.nome}</span>
            <span className="text-stone-400" title={completo(post.criadoEm)} suppressHydrationWarning>· {quando(post.criadoEm)}</span>
            {post.editadoEm && <span className="text-xs text-stone-400" title={`Editado em ${completo(post.editadoEm)}`}>· editado</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${t.chip}`}><t.Icone size={11} aria-hidden /> {t.rotulo}</span>
            {post.fixado && <span className="inline-flex items-center gap-1 rounded-full bg-ouro-100 px-2 py-0.5 text-[11px] font-semibold text-ouro-800"><Pin size={11} aria-hidden /> Fixado</span>}
          </p>
        </div>
        {temMenu && (
          <div ref={raizMenu} className="relative -mt-1 -mr-1 shrink-0">
            <button type="button" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} aria-label="Opções do post"
              className="grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700">
              <MoreVertical size={17} />
            </button>
            {menu && (
              <div role="menu" className="menu-pop absolute top-full right-0 z-20 mt-2 w-48 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.06),0_18px_40px_-10px_rgb(20_42_29/0.35)]">
                {post.podeEditar && (
                  <button role="menuitem" type="button" onClick={() => { setMenu(false); setEditando(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50">
                    <Pencil size={15} className="text-stone-500" aria-hidden /> Editar
                  </button>
                )}
                {gestao && (
                  <button role="menuitem" type="button" onClick={() => { setMenu(false); rodar(() => fixarPost(eventoId, post.id, !post.fixado)); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50">
                    {post.fixado ? <PinOff size={15} className="text-stone-500" aria-hidden /> : <Pin size={15} className="text-stone-500" aria-hidden />} {post.fixado ? "Desafixar" : "Fixar no topo"}
                  </button>
                )}
                {post.podeExcluir && (
                  <BotaoConfirmar
                    pergunta={`Excluir este post${post.imagens.length ? " e as fotos" : ""}? Não dá para desfazer.`}
                    aoConfirmar={() => { setMenu(false); rodar(() => excluirPost(eventoId, post.id)); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 size={15} aria-hidden /> Excluir
                  </BotaoConfirmar>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {post.texto && <div className={`mt-2.5 ${concluida ? "[&_p]:line-through [&_p]:decoration-stone-300" : ""}`}><TextoPost texto={post.texto} pessoaPorId={pessoaPorId} /></div>}
      {post.imagens.length > 0 && <div className="mt-2.5"><GaleriaFotos ids={post.imagens} /></div>}

      {post.tipo === "tarefa" && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 pt-2.5">
          {concluida ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white"><Check size={12} strokeWidth={3} aria-hidden /></span>
                Concluída por {post.concluida!.por.split(/\s+/)[0]} <span className="font-normal text-stone-400 tabular-nums">{hora(post.concluida!.em)}</span>
              </span>
              <button type="button" onClick={() => rodar(() => concluirTarefa(eventoId, post.id, false))} className="ml-auto inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-stone-500 transition hover:bg-stone-100">
                <RotateCcw size={13} aria-hidden /> Reabrir
              </button>
            </>
          ) : (
            <button type="button" onClick={() => rodar(() => concluirTarefa(eventoId, post.id, true))}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-mata-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-mata-800 active:scale-[0.98]">
              <Check size={15} strokeWidth={2.6} aria-hidden /> Concluir tarefa
            </button>
          )}
        </div>
      )}
    </li>
  );
}

