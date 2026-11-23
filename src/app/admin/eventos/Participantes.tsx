"use client";

import { createPortal } from "react-dom";
import { createContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronRight, Clock, Crown, Receipt, Search, Shield, SlidersHorizontal, UserPlus, Users, X } from "lucide-react";
import type { Sexo, SituacaoPagamento } from "@/lib/types";
import type { Dose } from "@/lib/doses";
import { Avatar } from "@/components/Avatar";
import { Aviso, Carregando } from "@/components/ui";
import { incluirAvulsoAction, incluirParticipanteAction } from "./participantes-actions";
import { ModalInscricao } from "./ModalInscricao";
import { ModalDosagemEquipe } from "./ModalDosagemEquipe";

export type PessoaParticipante = { id: string; nome: string; foto: string | null };
/** Contato do participante: só vem preenchido para quem gerencia o evento. */
export type ContatoParticipante = { email: string; telefone: string | null; cidade: string | null; estado: string | null; sexo: Sexo | null; desde: string; cpf: string | null };
export type ItemParticipanteInscrito = PessoaParticipante & {
  pagamento: SituacaoPagamento; inscricaoId: string; comprovante: string | null;
  inscritoEm: string; valor: number | null; informadoEm: string | null; pagoEm: string | null;
  /** Contribuição paga com pacote (valor em R$ = 0). */
  usouPacote?: boolean; /** Observação do pacote (ex.: "2/4 1"). */ pacoteObs?: string | null;
  contato: ContatoParticipante | null;
  /** Doses consumidas (só para quem gerencia o evento). */
  doses?: Dose[];
};

/** Mestre ou guardião do evento, para a lista de presença juntar equipe e participantes. */
export type MembroLista = { id: string; nome: string; foto: string | null; papel: "mestre" | "guardiao"; sexo?: Sexo | null; /** Label `first` do Appwrite: vem antes dentro do grupo. */ first?: boolean };

const PAPEL = {
  mestre: { rotulo: "Mestre", cor: "bg-mata-100 text-mata-800", Icone: Crown },
  guardiao: { rotulo: "Guardião", cor: "bg-sky-100 text-sky-800", Icone: Shield },
} as const;

export type DadosParticipantes = {
  eventoId: string;
  vagas: number;
  abertas: boolean;
  jaComecou: boolean;
  prazoPassou: boolean;
  prazoTexto: string;
  confirmados: ItemParticipanteInscrito[];
  espera: ItemParticipanteInscrito[];
  gerenciar: boolean;
  disponiveis: PessoaParticipante[];
  valorContribuicao: number | null;
  /** Contribuição só aparece para tipos que contam como ritual. */
  temContribuicao: boolean;
  /** Doses de mestres e guardiões escalados, por pessoa (só para quem gerencia). */
  dosesEquipe?: Record<string, Dose[]>;
  /** Cidade/UF do Instituto, sugeridas ao informar os dados de quem ainda não tem cidade. */
  localPadrao?: { estado: string; cidade: string } | null;
  /** Mostra o atalho para o perfil completo (/admin/participantes): só coordenação e admin. */
  linkPerfil?: boolean;
};

const PAGAMENTO: Record<SituacaoPagamento, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200 ring-inset" },
  informado: { rotulo: "Para conferir", cor: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 ring-inset" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
};

type FiltroPg = "todos" | "conferir" | "aberto" | "pago" | "isento";
const FILTROS_PG: { id: FiltroPg; rotulo: string; casa: (p: SituacaoPagamento) => boolean }[] = [
  { id: "todos", rotulo: "Todos", casa: () => true },
  { id: "conferir", rotulo: "Para conferir", casa: (p) => p === "informado" },
  { id: "aberto", rotulo: "Em aberto", casa: (p) => p === "pendente" || p === "na_hora" },
  { id: "pago", rotulo: "Pagos", casa: (p) => p === "pago" },
  { id: "isento", rotulo: "Isentos", casa: (p) => p === "isento" },
];

/** Ações do menu ⋮ do cabeçalho (mobile) que mexem na lista: hoje, abrir o filtro. */
export const AcoesListaContexto = createContext<{ abrirFiltro?: () => void; chamada?: { ativa: boolean; alternar: () => void } }>({});

const FUNDO_DOSE = "linear-gradient(180deg, #8a4b26 0%, #5a2d13 45%, #2a1308 100%)";

/**
 * Um copo por dose registrada: fundo azulado (parte vazia) e o líquido marrom-escuro subindo na proporção dos
 * ml (0 a 70, copo cheio). Número sempre em branco, legível sobre os dois tons.
 */
function ChipsDose({ doses }: { doses: Dose[] }) {
  const lista = doses.filter((d) => d.ml > 0);
  if (!lista.length) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {lista.map((d) => {
        const pct = Math.min(100, Math.max(8, (d.ml / 70) * 100));
        return (
          <span
            key={d.n}
            className="relative block h-10 w-8 overflow-hidden rounded-t-[3px] rounded-b-[6px] bg-[#7488a0] shadow-sm"
            title={`${d.n}ª dose: ${d.ml} ml`}
            aria-label={`${d.n}ª dose: ${d.ml} ml`}
          >
            <span className="absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out motion-reduce:transition-none" style={{ height: `${pct}%`, background: FUNDO_DOSE }} />
            <span className="relative flex h-full flex-col items-center justify-center text-white [text-shadow:0_1px_1px_rgb(0_0_0/0.35)]">
              <span className="text-[14px] leading-none font-bold tabular-nums">{d.ml}</span>
              <span className="text-[10px] leading-none font-semibold opacity-90">ml</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Linha marcada na chamada: faixa verde à esquerda e um degradê verde bem sutil. */
const CLASSE_PRESENTE = "border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-100/80 via-emerald-50/40 to-white ring-1 ring-emerald-100";

/** Sigla da situação da contribuição (participante com dose registrada). */
const SIGLA_PAGAMENTO: Record<SituacaoPagamento, string> = { pendente: "PEN", informado: "PC", pago: "OK", isento: "IN", na_hora: "NH" };

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function haQuanto(iso: string) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/**
 * Participantes (público geral) de um evento: ocupação das vagas, resumo das contribuições,
 * filtros por situação do pagamento, busca, lista de espera e inclusão manual com busca.
 * Quem se inscreve é sempre pela página pública; este bloco é para a coordenação acompanhar e gerenciar.
 */
export function Participantes({ dados, semResumo = false, equipe = [], guardioes = [], titulo = "Participantes", acoes, embutido = false }: {
  dados: DadosParticipantes;
  /** Dentro de outro card (abas da página do evento): sem card próprio e sem o título, que já está na aba. */
  embutido?: boolean;
  /** Ações extras no canto do cabeçalho (ex.: menu ⋮ da equipe no mobile). */
  acoes?: React.ReactNode;
  /** A página do evento já mostra vagas e contribuições na faixa de estatísticas. */
  semResumo?: boolean;
  /** Mestres e guardiões: entram na mesma lista (no topo, sem contribuição) ou ganham o selo se também se inscreveram. */
  equipe?: MembroLista[];
  /** Quem tem a função Guardião (mesmo sem estar escalado neste ritual): ganha só o escudo ao lado do nome. */
  guardioes?: string[];
  titulo?: string;
}) {
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const [pendente, iniciar] = useTransition();
  const [filtro, setFiltro] = useState<FiltroPg>("todos");
  const [busca, setBusca] = useState("");
  const [filtroAberto, setFiltroAberto] = useState(false);
  const filtroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filtroAberto) return;
    const fora = (e: MouseEvent) => { if (!filtroRef.current?.contains(e.target as Node)) setFiltroAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setFiltroAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", tecla); };
  }, [filtroAberto]);
  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) => iniciar(async () => setMsg(await fn()));
  const ocupadas = dados.confirmados.length;
  const livres = Math.max(0, dados.vagas - ocupadas);
  const pct = dados.vagas ? Math.min(100, Math.round((ocupadas / dados.vagas) * 100)) : 0;

  // Modal da inscrição: guarda só o id, para mostrar sempre os dados atualizados depois de cada ação
  const [aberta, setAberta] = useState<string | null>(null);
  const [equipeAberta, setEquipeAberta] = useState<string | null>(null);
  // Chamada: presença marcada por pessoa, guardada só neste aparelho (localStorage), por evento
  const [chamadaAtiva, setChamadaAtiva] = useState(false);
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  const chaveChamada = `chamada-${dados.eventoId}`;
  const [carregouChamada, setCarregouChamada] = useState(false);
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(chaveChamada) ?? "null") as { ativa?: boolean; presentes?: string[] } | null;
      if (salvo) { setChamadaAtiva(!!salvo.ativa); setPresentes(new Set(salvo.presentes ?? [])); }
    } catch { /* sem localStorage: a chamada vale só enquanto a página está aberta */ }
    setCarregouChamada(true);
  }, [chaveChamada]);
  useEffect(() => {
    if (!carregouChamada) return;
    try { localStorage.setItem(chaveChamada, JSON.stringify({ ativa: chamadaAtiva, presentes: [...presentes] })); } catch { /* idem */ }
  }, [chamadaAtiva, presentes, chaveChamada, carregouChamada]);
  // Mobile: todas as tags de contribuição ficam da largura da maior (a coluna alinha)
  const secao = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = secao.current;
    if (!el) return;
    el.style.removeProperty("--larg-tag");
    const tags = [...el.querySelectorAll<HTMLElement>("[data-tag]")];
    if (!tags.length) return;
    const maior = Math.max(...tags.map((t) => t.getBoundingClientRect().width));
    el.style.setProperty("--larg-tag", `${Math.ceil(maior)}px`);
  });
  const marcar = (id: string) => setPresentes((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ehMarcavel = (id: string) => chamadaAtiva && dados.gerenciar;
  const posEspera = dados.espera.findIndex((p) => p.inscricaoId === aberta);
  const atual = dados.confirmados.find((p) => p.inscricaoId === aberta) ?? dados.espera[posEspera];

  // Resumo das contribuições: conta só quem tem vaga confirmada
  const resumo = useMemo(() => {
    const r = { conferir: 0, aberto: 0, pago: 0, isento: 0, recebido: 0 };
    for (const p of dados.confirmados) {
      if (p.pagamento === "informado") r.conferir++;
      else if (p.pagamento === "pendente" || p.pagamento === "na_hora") r.aberto++;
      else if (p.pagamento === "pago") { r.pago++; r.recebido += p.valor ?? 0; }
      else if (p.pagamento === "isento") r.isento++;
    }
    return r;
  }, [dados.confirmados]);
  const contagem: Record<FiltroPg, number> = { todos: ocupadas, conferir: resumo.conferir, aberto: resumo.aberto, pago: resumo.pago, isento: resumo.isento };

  const total = dados.confirmados.length + dados.espera.length;
  const mostrarBusca = total > 8;
  // Embutido nas abas, no celular: o menu ⋮ vai para a mesma linha da busca (em vez de uma linha só para ele)
  const acoesNaLinha = embutido && dados.abertas && !!acoes && mostrarBusca && total > 0;
  const termo = semAcento(busca.trim());
  const casa = FILTROS_PG.find((f) => f.id === filtro)!.casa;
  const filtrar = (l: ItemParticipanteInscrito[]) => l.filter((p) => (!dados.temContribuicao || casa(p.pagamento)) && (!termo || semAcento(p.nome).includes(termo)));
  const confirmados = filtrar(dados.confirmados);
  // A posição na espera é a real, mesmo com filtro: guarda o índice original
  const espera = dados.espera.map((p, i) => ({ p, pos: i + 1 })).filter(({ p }) => filtrar([p]).length);
  const filtrando = filtro !== "todos" || termo !== "";
  // Equipe que não se inscreveu: aparece no topo da lista; some quando o filtro é de contribuição
  const papelDe = new Map(equipe.map((e) => [e.id, e.papel]));
  const ehGuardiao = new Set(guardioes);
  const inscritos = new Set([...dados.confirmados, ...dados.espera].map((p) => p.id));
  const soEquipe = filtro === "todos" ? equipe.filter((e) => !inscritos.has(e.id) && (!termo || semAcento(e.nome).includes(termo))) : [];
  const totalPresentes = equipe.filter((e) => !inscritos.has(e.id)).length + ocupadas;
  const sexoDe = new Map(equipe.map((e) => [e.id, e.sexo ?? null]));
  const firstDe = new Set(equipe.filter((e) => e.first).map((e) => e.id));
  // Mestres (os com label first antes), depois guardiões e guardiãs
  const ordem = (papel: MembroLista["papel"], id: string) =>
    papel === "mestre" ? (firstDe.has(id) ? 0 : 1) : sexoDe.get(id) === "feminino" ? 3 : 2;
  const equipeOrdenada = [
    ...soEquipe.map((e) => ({ id: e.id, nome: e.nome, foto: e.foto, papel: e.papel, p: null as ItemParticipanteInscrito | null })),
    ...confirmados.filter((p) => papelDe.has(p.id)).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, papel: papelDe.get(p.id)!, p })),
  ].sort((a, b) => ordem(a.papel, a.id) - ordem(b.papel, b.id) || a.nome.localeCompare(b.nome, "pt-BR"));

  const temFiltros = dados.temContribuicao && dados.gerenciar && total > 0;
  const filtroNoMobile = filtro !== "todos" || filtroAberto;

  return (
    <AcoesListaContexto.Provider value={{ abrirFiltro: temFiltros ? () => setFiltroAberto(true) : undefined, chamada: dados.gerenciar ? { ativa: chamadaAtiva, alternar: () => setChamadaAtiva((v) => !v) } : undefined }}>
    <section ref={secao} id="participantes" aria-label={embutido ? titulo : undefined} className={embutido ? "scroll-mt-6 space-y-2 p-2 pt-1 sm:space-y-4 sm:p-4 sm:pt-2 md:p-5 md:pt-3" : "cartao scroll-mt-6 space-y-2 p-2 sm:space-y-5 sm:p-4 md:rounded-[22px] md:border-black/[0.05] md:p-5 md:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-14px_rgb(20_42_29/0.2)]"}>
      <div className={`flex items-center justify-between gap-3 ${embutido ? (!acoes && dados.abertas ? "hidden" : acoesNaLinha ? "hidden" : dados.abertas ? "justify-end md:hidden" : "justify-end") : ""}`}>
        <div className={`flex items-center gap-3 ${embutido ? "hidden" : ""}`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-mata-50 text-mata-600 sm:h-10 sm:w-10"><Users size={18} /></span>
          <div>
            <h2 className="cartao-titulo">{titulo} <span className="font-normal text-stone-400 tabular-nums">({equipe.length ? totalPresentes : dados.confirmados.length})</span></h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!dados.abertas && <span className="chip bg-stone-100 text-stone-600">Inscrições fechadas</span>}
          {!acoesNaLinha && acoes}
        </div>
      </div>

      {msg && <Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso>}

      {/* Chamada ativa: contagem e botão para encerrar (desativa as marcações) */}
      {dados.gerenciar && chamadaAtiva && (
        <div className="animate-surgir flex flex-wrap items-center gap-2 rounded-xl border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-100/80 to-white px-3 py-2 ring-1 ring-emerald-100">
          <Check size={16} className="shrink-0 text-emerald-700" aria-hidden />
          <p className="min-w-0 flex-1 text-sm leading-tight font-semibold text-emerald-900">
            Chamada <span className="block text-xs font-normal whitespace-nowrap text-emerald-800/80">{[...presentes].filter((id) => dados.confirmados.some((c) => c.id === id) || equipe.some((e) => e.id === id)).length} de {totalPresentes} presentes</span>
          </p>
          <button type="button" onClick={() => setChamadaAtiva(false)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800">
            <X size={13} aria-hidden /> Encerrar chamada
          </button>
        </div>
      )}

      {/* Ocupação e contribuições num relance */}
      {/* Empilhado: o bloco também aparece na coluna estreita do formulário do evento */}
      <div className={`grid gap-3 ${semResumo ? "hidden" : ""}`}>
        <div className="rounded-xl border border-stone-200/80 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium text-stone-500">Vagas ocupadas</p>
            <p className="text-sm font-semibold text-stone-900 tabular-nums">{ocupadas}<span className="text-stone-400">/{dados.vagas}</span></p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={ocupadas} aria-valuemin={0} aria-valuemax={dados.vagas} aria-label="Vagas ocupadas">
            <div className={`h-full rounded-full transition-all ${livres ? "bg-mata-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {livres ? `${livres} ${livres === 1 ? "vaga livre" : "vagas livres"}` : "Lotado"}
            {dados.espera.length > 0 && <> · <span className="font-medium text-amber-700">{dados.espera.length} na espera</span></>}
          </p>
        </div>
        {dados.temContribuicao && (
          <div className="grid grid-cols-3 divide-x divide-stone-100 rounded-xl border border-stone-200/80">
            <Numero rotulo="Recebido" valor={formatoReal(resumo.recebido)} detalhe={`${resumo.pago} ${resumo.pago === 1 ? "pago" : "pagos"}`} cor="text-emerald-700" />
            <Numero rotulo="Para conferir" valor={String(resumo.conferir)} detalhe="comprovantes" cor={resumo.conferir ? "text-amber-700" : "text-stone-900"} acao={resumo.conferir ? () => setFiltro("conferir") : undefined} />
            <Numero rotulo="Em aberto" valor={String(resumo.aberto)} detalhe={resumo.isento ? `${resumo.isento} isento${resumo.isento > 1 ? "s" : ""}` : "pendentes"} acao={resumo.aberto ? () => setFiltro("aberto") : undefined} />
          </div>
        )}
      </div>

      {/* Filtros e busca */}
      {((dados.temContribuicao && dados.gerenciar) || mostrarBusca) && total > 0 && (
        <div className={`flex gap-2 sm:flex-row sm:items-center sm:justify-start ${acoesNaLinha ? "max-sm:flex-wrap max-sm:items-center" : "flex-col"} ${!filtroNoMobile && !mostrarBusca ? "max-md:hidden" : ""}`}>
          {dados.temContribuicao && dados.gerenciar ? (
            <div ref={filtroRef} className={`relative flex items-center gap-1.5 ${acoesNaLinha ? "max-sm:basis-full" : ""} ${filtroNoMobile ? "" : "max-md:hidden"}`} role="group" aria-label="Filtrar por contribuição">
              <button
                type="button"
                onClick={() => { setFiltro("todos"); setFiltroAberto(false); }}
                aria-pressed={filtro === "todos"}
                className={`inline-flex h-8 shrink-0 max-md:hidden items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ring-1 transition ${
                  filtro === "todos" ? "bg-mata-700 text-white ring-mata-700" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
                }`}
              >
                Todos
                <span className={`rounded-full px-1.5 tabular-nums ${filtro === "todos" ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{equipe.length ? totalPresentes : contagem.todos}</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroAberto((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={filtroAberto}
                className={`inline-flex h-8 shrink-0 ${filtro === "todos" ? "max-md:hidden" : ""} items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ring-1 transition ${
                  filtro !== "todos" ? "bg-mata-700 text-white ring-mata-700" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
                }`}
              >
                <SlidersHorizontal size={13} aria-hidden />
                {filtro !== "todos" ? FILTROS_PG.find((f) => f.id === filtro)!.rotulo : "Filtrar"}
                {filtro !== "todos" && <span className="rounded-full bg-white/20 px-1.5 tabular-nums">{contagem[filtro]}</span>}
              </button>
              {filtro !== "todos" && (
                <button type="button" onClick={() => { setFiltro("todos"); setFiltroAberto(false); }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50 active:bg-stone-100 md:hidden">
                  <X size={13} aria-hidden /> Limpar filtro
                </button>
              )}
              {filtroAberto && (
                <div role="dialog" aria-label="Filtrar por contribuição" className="absolute top-full left-0 z-20 mt-2 w-60 rounded-xl border border-stone-200 bg-white p-1.5 shadow-elevado">
                  <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Contribuição</p>
                  {FILTROS_PG.filter((f) => f.id !== "todos").map((f) => {
                    const ativo = filtro === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setFiltro(ativo ? "todos" : f.id); setFiltroAberto(false); }}
                        aria-pressed={ativo}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${ativo ? "bg-mata-50 font-semibold text-mata-800" : "text-stone-700 hover:bg-stone-50"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`grid h-4 w-4 place-items-center rounded-full ring-1 ${ativo ? "bg-mata-700 text-white ring-mata-700" : "ring-stone-300"}`}>{ativo && <Check size={10} aria-hidden />}</span>
                          {f.rotulo}
                        </span>
                        <span className="rounded-full bg-stone-100 px-1.5 text-xs text-stone-500 tabular-nums">{contagem[f.id]}</span>
                      </button>
                    );
                  })}
                  {filtro !== "todos" && (
                    <button type="button" onClick={() => { setFiltro("todos"); setFiltroAberto(false); }} className="mt-1 w-full rounded-lg border-t border-stone-100 px-2.5 py-2 text-left text-xs font-semibold text-mata-700 hover:bg-stone-50">Limpar filtro</button>
                  )}
                </div>
              )}
            </div>
          ) : <span />}
          {mostrarBusca && (
            <div className={`relative sm:w-56 ${acoesNaLinha ? "max-sm:min-w-0 max-sm:flex-1" : ""}`}>
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome" aria-label="Buscar participante" className="campo h-9 pl-8 text-sm" />
            </div>
          )}
          {acoesNaLinha && <div className="shrink-0 md:hidden">{acoes}</div>}
        </div>
      )}

      <div className="sm:rounded-xl sm:border sm:border-stone-200/80 sm:p-3">
        <p className="flex items-center justify-between px-0.5 pt-1 pb-2 sm:px-1.5 text-xs font-semibold tracking-wider text-stone-500 uppercase">
          <span>{equipe.length ? (equipeOrdenada.length ? "Equipe do ritual" : "Participantes") : "Confirmados"} <span className="tabular-nums">({equipeOrdenada.length || confirmados.length})</span></span>
          {filtrando && <span className="normal-case tracking-normal font-medium">{confirmados.length} de {ocupadas}</span>}
        </p>
        {confirmados.length || soEquipe.length ? (
          <ul className="space-y-1">
            {/* Equipe primeiro (guardiões, guardiãs, mestres), com fundo azulado; depois os demais participantes */}
            {equipeOrdenada.map((x) => x.p ? (
              <Linha key={x.id} p={x.p} papel={x.papel} destaque temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} chamada={ehMarcavel(x.id)} presente={presentes.has(x.id)} abrir={() => (chamadaAtiva ? marcar(x.id) : setAberta(x.p!.inscricaoId))} />
            ) : (
              <li key={`equipe-${x.id}`}>
                {dados.gerenciar ? (
                  <button type="button" onClick={() => (chamadaAtiva ? marcar(x.id) : setEquipeAberta(x.id))} aria-label={chamadaAtiva ? `Marcar presença de ${x.nome}` : `Registrar a dosagem de ${x.nome}`} aria-pressed={chamadaAtiva ? presentes.has(x.id) : undefined}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:ring-1 hover:ring-mata-200 ${chamadaAtiva && presentes.has(x.id) ? CLASSE_PRESENTE : "bg-sky-50 ring-1 ring-sky-100 hover:bg-mata-50/70"}`}>
                    <Avatar nome={x.nome} foto={x.foto} tamanho={32} className={chamadaAtiva && presentes.has(x.id) ? "ring-[3px]! ring-emerald-500! ring-offset-1" : "ring-0"} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{x.nome}</span>
                    <ChipsDose doses={dados.dosesEquipe?.[x.id] ?? []} />
                    <SeloPapel papel={x.papel} sexo={sexoDe.get(x.id)} soIcone={(dados.dosesEquipe?.[x.id] ?? []).some((d) => d.ml > 0)} />
                    {chamadaAtiva ? null : <ChevronRight size={16} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-mata-600 max-md:hidden" />}
                  </button>
                ) : (
                  <div className="flex w-full items-center gap-2.5 rounded-lg bg-sky-50 px-2 py-1.5 ring-1 ring-sky-100">
                    <Avatar nome={x.nome} foto={x.foto} tamanho={32} className="ring-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{x.nome}</span>
                    <SeloPapel papel={x.papel} sexo={sexoDe.get(x.id)} />
                  </div>
                )}
              </li>
            ))}
            {equipeOrdenada.length > 0 && confirmados.some((p) => !papelDe.has(p.id)) && (
              <li aria-hidden className="px-1.5 pt-3 pb-1 text-xs font-semibold tracking-wider text-stone-400 uppercase">Participantes <span className="tabular-nums">({confirmados.filter((p) => !papelDe.has(p.id)).length})</span></li>
            )}
            {confirmados.filter((p) => !papelDe.has(p.id)).map((p) => (
              <Linha key={p.id} p={p} guardiao={ehGuardiao.has(p.id)} temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} chamada={ehMarcavel(p.id)} presente={presentes.has(p.id)} abrir={() => (chamadaAtiva ? marcar(p.id) : setAberta(p.inscricaoId))} />
            ))}
          </ul>
        ) : (
          <p className="px-1.5 pb-2 text-sm text-stone-400">
            {filtrando ? "Ninguém nesta situação." : "Ninguém confirmado ainda."}
            {filtrando && <button type="button" onClick={() => { setFiltro("todos"); setBusca(""); }} className="ml-2 font-semibold text-mata-700 hover:underline">Ver todos</button>}
          </p>
        )}

        {espera.length > 0 && (
          <div className="mt-3 border-t border-dashed border-stone-200 pt-3">
            <p className="flex items-center gap-1.5 px-1.5 pb-2 text-xs font-semibold tracking-wider text-stone-400 uppercase">
              <Clock size={12} /> Lista de espera
            </p>
            <ol className="space-y-1">
              {espera.map(({ p, pos }) => (
                <Linha key={p.id} p={p} papel={papelDe.get(p.id)} guardiao={ehGuardiao.has(p.id)} posicao={pos} temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} abrir={() => setAberta(p.inscricaoId)} />
              ))}
            </ol>
          </div>
        )}

        {dados.gerenciar && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <Incluir opcoes={dados.disponiveis} pendente={pendente} cheio={!livres} aoIncluir={(id) => rodar(() => incluirParticipanteAction(dados.eventoId, id))} aoIncluirAvulso={(nome) => rodar(() => incluirAvulsoAction(dados.eventoId, nome))} />
          </div>
        )}
      </div>

      {equipeAberta && (() => {
        const m = equipe.find((e) => e.id === equipeAberta);
        return m ? (
          <ModalDosagemEquipe
            eventoId={dados.eventoId}
            pessoa={{ id: m.id, nome: m.nome, foto: m.foto }}
            rotulo={m.papel === "mestre" ? "Mestre" : m.sexo === "feminino" ? "Guardiã" : "Guardião"}
            inicial={dados.dosesEquipe?.[m.id] ?? []}
            fechar={() => setEquipeAberta(null)}
          />
        ) : null;
      })()}

      {atual && (
        <ModalInscricao
          p={atual}
          posicaoEspera={posEspera >= 0 ? posEspera + 1 : undefined}
          dados={dados}
          fechar={() => setAberta(null)}
          aoCancelar={(r) => { setAberta(null); setMsg(r); }}
        />
      )}
    </section>
    </AcoesListaContexto.Provider>
  );
}

function Numero({ rotulo, valor, detalhe, cor = "text-stone-900", acao }: { rotulo: string; valor: string; detalhe: string; cor?: string; acao?: () => void }) {
  const conteudo = (
    <>
      <span className="block text-[11px] font-medium text-stone-500">{rotulo}</span>
      <span className={`mt-0.5 block truncate text-lg font-semibold tracking-tight tabular-nums ${cor}`}>{valor}</span>
      <span className="block truncate text-[11px] text-stone-400">{detalhe}</span>
    </>
  );
  return acao ? (
    <button type="button" onClick={acao} className="min-w-0 px-3 py-3 text-left transition first:rounded-l-xl last:rounded-r-xl hover:bg-stone-50 sm:px-4" title={`Filtrar: ${rotulo}`}>{conteudo}</button>
  ) : (
    <div className="min-w-0 px-3 py-3 sm:px-4">{conteudo}</div>
  );
}

/** Linha da lista: quem gerencia toca para abrir o modal da inscrição (contato, contribuição, comprovante e cancelamento). */
function SeloPapel({ papel, soIcone = false, sexo }: { papel: MembroLista["papel"]; /** Com dose registrada: só o ícone, para economizar largura. */ soIcone?: boolean; /** Feminino: "Guardiã". */ sexo?: Sexo | null }) {
  const base = PAPEL[papel];
  const info = papel === "guardiao" && sexo === "feminino" ? { ...base, rotulo: "Guardiã" } : base;
  return (
    <span title={info.rotulo} className={`inline-flex shrink-0 items-center gap-1 rounded-full text-[11px] font-semibold ${soIcone ? "h-6 w-6 justify-center" : "px-2 py-0.5"} md:h-6 md:w-[4.75rem] md:justify-center md:px-1 md:py-0 ${info.cor}`}>
      {/* No celular, com dose registrada, só o ícone; no computador sempre com o nome */}
      <info.Icone size={soIcone ? 13 : 11} aria-hidden className="md:size-[11px]" />{soIcone ? <span className="max-md:sr-only">{info.rotulo}</span> : <> {info.rotulo}</>}
    </span>
  );
}

function Linha({
  p, papel, guardiao = false, destaque = false, posicao, temContribuicao: comContribuicao, gerenciar, abrir, chamada = false, presente = false,
}: {
  p: ItemParticipanteInscrito; papel?: MembroLista["papel"]; guardiao?: boolean; destaque?: boolean; posicao?: number; temContribuicao: boolean; gerenciar: boolean; abrir: () => void;
  /** Chamada ativa: a linha vira marcador de presença. */ chamada?: boolean; presente?: boolean;
}) {
  // Situação e valores da contribuição são só para quem gerencia
  const temContribuicao = comContribuicao && gerenciar;
  const pg = PAGAMENTO[p.pagamento];
  const conferir = temContribuicao && p.pagamento === "informado";
  const temDose = gerenciar && (p.doses ?? []).some((d) => d.ml > 0);
  const conteudo = (
    <>
      {posicao !== undefined && <span className="w-5 shrink-0 text-center text-xs font-semibold text-stone-400 tabular-nums">{posicao}º</span>}
      <Avatar nome={p.nome} foto={p.foto} tamanho={32} className={chamada && presente ? "ring-[3px]! ring-emerald-500! ring-offset-1" : "ring-0"} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-stone-800">{p.nome}</span>
          {/* Guardião que veio como participante (não está na guarnição deste ritual): só o escudo */}
          {guardiao && !papel && (
            <span title="Guardião" className="shrink-0 text-sky-600">
              <Shield size={13} strokeWidth={2.4} aria-hidden />
              <span className="sr-only">Guardião</span>
            </span>
          )}
        </span>
        {conferir && p.informadoEm && (
          <span className="block truncate text-[11px] text-amber-700">
            Informou {haQuanto(p.informadoEm)}{p.valor != null ? ` · ${formatoReal(p.valor)}` : ""}
          </span>
        )}
      </span>
      {gerenciar && <ChipsDose doses={p.doses ?? []} />}
      {papel && <SeloPapel papel={papel} sexo={p.contato?.sexo} soIcone={temDose} />}
      {temContribuicao && (
        // Participante (fora da equipe) com dose registrada: só a inicial da situação
        temDose && !papel ? (
          <span className={`chip h-6 shrink-0 justify-center truncate px-1.5 max-md:w-[var(--larg-tag,auto)] md:w-[4.75rem] md:px-1 text-[11px] font-bold ${p.pagamento === "pago" ? "bg-emerald-100 text-emerald-900" : pg.cor}`} title={pg.rotulo} data-tag="">
            <span aria-hidden className="truncate">{p.pagamento === "pago" ? (p.usouPacote ? `PC${p.pacoteObs ? ` ${p.pacoteObs}` : ""}` : `R$ ${Math.round(p.valor ?? 0)}`) : SIGLA_PAGAMENTO[p.pagamento]}</span><span className="sr-only">{pg.rotulo}</span>
          </span>
        ) : (
        <span className={`chip shrink-0 justify-center gap-0.5 px-1.5 max-md:w-[var(--larg-tag,auto)] md:w-[4.75rem] md:px-1 ${pg.cor}`} title={pg.rotulo} data-tag="">
          {p.pagamento === "pago" && <Check size={12} className="shrink-0" />}{conferir && <Receipt size={12} className="shrink-0" />}<span className="truncate">{pg.rotulo}</span>
        </span>
        )
      )}
    </>
  );
  const base = `flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${chamada && presente ? CLASSE_PRESENTE : conferir ? "border-l-[3px] border-amber-400 bg-amber-50/60" : destaque ? "bg-sky-50 ring-1 ring-sky-100" : "bg-stone-50/70"}`;
  if (!gerenciar) return <li className={base}>{conteudo}</li>;
  return (
    <li>
      <button
        type="button"
        onClick={abrir}
        className={`group ${base} transition hover:bg-mata-50/70 hover:ring-1 hover:ring-mata-200`}
        aria-label={chamada ? `Marcar presença de ${p.nome}` : `Gerenciar a inscrição de ${p.nome}`}
        aria-pressed={chamada ? presente : undefined}
      >
        {conteudo}
        {chamada ? null : <ChevronRight size={16} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-mata-600 max-md:hidden" />}
      </button>
    </li>
  );
}

/**
 * Inclusão manual: um botão abre o modal com a busca entre todas as pessoas com conta. Se ninguém
 * servir, a última opção cria a pessoa a partir do nome digitado (participante sem cadastro).
 */
function Incluir({ opcoes, pendente, cheio, aoIncluir, aoIncluirAvulso }: {
  opcoes: PessoaParticipante[]; pendente: boolean; cheio: boolean; aoIncluir: (id: string) => void; aoIncluirAvulso: (nome: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [ativo, setAtivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);
  // Com o teclado aberto, o modal é centralizado na área visível (visualViewport), sem ficar por baixo dele
  const [area, setArea] = useState<{ top: number; height: number } | null>(null);

  const nomeDigitado = texto.trim().replace(/\s+/g, " ");
  const termo = semAcento(nomeDigitado);
  const resultados = useMemo(
    () => (termo ? opcoes.filter((p) => semAcento(p.nome).includes(termo)).slice(0, 30) : []),
    [opcoes, termo],
  );
  // Opção "criar": com 3+ letras e quando o nome não é idêntico a alguém da lista
  const mostraAvulso = nomeDigitado.length >= 3 && !resultados.some((p) => semAcento(p.nome) === termo);
  const totalOpcoes = resultados.length + (mostraAvulso ? 1 : 0);

  const fechar = () => { setAberto(false); setTexto(""); setAtivo(0); };
  const escolher = (i: number) => {
    if (i < resultados.length) aoIncluir(resultados[i].id);
    else if (mostraAvulso) aoIncluirAvulso(nomeDigitado);
    else return;
    fechar();
  };

  useEffect(() => {
    if (!aberto) return;
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = rolagem; };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const medir = () => setArea({ top: vv.offsetTop, height: vv.height });
    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => { vv.removeEventListener("resize", medir); vv.removeEventListener("scroll", medir); setArea(null); };
  }, [aberto]);

  // Mantém a opção ativa à vista ao navegar pelo teclado
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-i="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={pendente}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-mata-300 text-sm font-semibold text-mata-700 transition hover:border-mata-400 hover:bg-mata-50 active:bg-mata-100 disabled:opacity-60"
      >
        {pendente ? <Carregando tamanho={15} /> : <UserPlus size={17} aria-hidden />}
        {cheio ? "Incluir na lista de espera" : "Incluir participante"}
      </button>

      {aberto && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Incluir participante" className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-center justify-center p-4"
          style={area ? { top: area.top, bottom: "auto", height: area.height } : undefined}
          onKeyDown={(e) => { if (e.key === "Escape") fechar(); }}>
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />
          <div className="relative z-10 flex max-h-full w-full max-w-md animate-surgir flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div>
                <h3 className="text-base font-semibold text-stone-900">{cheio ? "Incluir na lista de espera" : "Incluir participante"}</h3>
                <p className="mt-0.5 text-xs text-stone-500">Busque pelo nome ou crie alguém que ainda não tem cadastro.</p>
              </div>
              <button type="button" onClick={fechar} aria-label="Fechar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700">
                <X size={17} />
              </button>
            </header>

            <ul ref={lista} id="incluir-opcoes" role="listbox" className="min-h-0 flex-1 overflow-y-auto border-t border-stone-100 p-2">
              {resultados.map((p, i) => (
                <li key={p.id} id={`incluir-op-${i}`} role="option" aria-selected={i === ativo} data-i={i}>
                  <button
                    type="button"
                    onMouseEnter={() => setAtivo(i)}
                    onClick={() => escolher(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${i === ativo ? "bg-mata-50 text-mata-900" : "text-stone-700"}`}
                  >
                    <Avatar nome={p.nome} foto={p.foto} tamanho={36} className="ring-0" />
                    <span className="min-w-0 flex-1 truncate font-medium">{p.nome}</span>
                    <span className={`shrink-0 text-xs font-semibold text-mata-700 transition ${i === ativo ? "opacity-100" : "opacity-0"}`}>Incluir</span>
                  </button>
                </li>
              ))}
              {/* Criar a partir do nome digitado: por último, quando ninguém da lista tem esse nome exato */}
              {mostraAvulso && (
                <li id={`incluir-op-${resultados.length}`} role="option" aria-selected={ativo === resultados.length} data-i={resultados.length} className={resultados.length ? "mt-1 border-t border-stone-100 pt-1" : ""}>
                  <button
                    type="button"
                    onMouseEnter={() => setAtivo(resultados.length)}
                    onClick={() => escolher(resultados.length)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${ativo === resultados.length ? "bg-ouro-100/70 text-stone-900" : "text-stone-700"}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-ouro-500 text-ouro-700"><UserPlus size={16} /></span>
                    <span className="min-w-0">
                      <span className="block truncate">Criar <strong className="font-semibold">“{nomeDigitado}”</strong></span>
                      <span className="block text-xs text-stone-500">Pessoa ainda sem cadastro no sistema</span>
                    </span>
                  </button>
                </li>
              )}
              {!totalOpcoes && (
                <li className="px-3 py-8 text-center text-sm text-stone-400">
                  {nomeDigitado ? "Ninguém encontrado. Digite pelo menos 3 letras para criar." : "Digite um nome para buscar ou criar."}
                </li>
              )}
            </ul>
            <div className="shrink-0 border-t border-stone-100 px-5 py-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
                <input
                  autoFocus
                  value={texto}
                  onChange={(e) => { setTexto(e.target.value); setAtivo(0); }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(a + 1, totalOpcoes - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
                    else if (e.key === "Enter" && totalOpcoes) { e.preventDefault(); escolher(ativo); }
                  }}
                  placeholder="Nome da pessoa"
                  role="combobox"
                  aria-expanded
                  aria-controls="incluir-opcoes"
                  aria-activedescendant={totalOpcoes ? `incluir-op-${ativo}` : undefined}
                  aria-autocomplete="list"
                  aria-label="Nome da pessoa"
                  className="campo h-11 pr-9 pl-9 text-base sm:text-sm"
                />
                {texto && (
                  <button type="button" onClick={() => { setTexto(""); setAtivo(0); }} aria-label="Limpar" className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
