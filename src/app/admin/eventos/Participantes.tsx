"use client";

import { createPortal } from "react-dom";
import { capitalizarNomeProprio } from "@/lib/format";
import { createContext, Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronRight, Clock, Crown, Gift, Receipt, Search, Shield, SlidersHorizontal, Sprout, Ticket, UserPlus, Users, X } from "lucide-react";
import type { ChavePix, FormaPagamento, Sexo, SituacaoPagamento } from "@/lib/types";
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
  /** Crédito usado na participação (ex.: "2/4") e saldo da pessoa: só para quem gerencia o evento. */
  creditoRotulo?: string | null;
  /** Como foi paga a contribuição confirmada (pix, dinheiro ou pacote). */
  forma?: FormaPagamento | null;
  saldoCredito?: { disponiveis: number; debitos: number; saldo: number } | null;
  /** Participante elegível para o benefício anual neste ritual. A data de nascimento não é enviada ao cliente. */
  bonusAniversarioDisponivel?: boolean;
  /** Primeira vez da pessoa em um ritual (só para quem gerencia o evento). */
  primeiraVez?: boolean;
  /** Já tem participação confirmada em outro evento (então não é a primeira vez). */
  jaParticipou?: boolean;
  contato: ContatoParticipante | null;
  /** Doses consumidas (só para quem gerencia o evento). */
  doses?: Dose[];
};

/** Mestre ou guardião do evento, para a lista de presença juntar equipe e participantes. */
export type ContatoEquipe = { email: string; telefone: string | null; cidade: string | null; estado: string | null; cpf: string | null };
export type MembroLista = { id: string; nome: string; foto: string | null; papel: "mestre" | "guardiao"; sexo?: Sexo | null; /** Label `first` do Appwrite: vem antes dentro do grupo. */ first?: boolean; /** Contato (só para quem gerencia). */ contato?: ContatoEquipe | null };

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
  /** Chave Pix padrão (Configurações): usada para gerar o QR Code com o valor ao confirmar um Pix. */
  chavePix?: ChavePix | null;
  /** Quem pode isentar a contribuição: Admin e mestre escalado no evento. */
  podeIsentar?: boolean;
  /** Mostra o atalho para o perfil completo (/admin/participantes): só coordenação e admin. */
  linkPerfil?: boolean;
};

const PAGAMENTO: Record<SituacaoPagamento, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200 ring-inset" },
  informado: { rotulo: "Para conferir", cor: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 ring-inset" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
  credito: { rotulo: "Crédito", cor: "bg-violet-50 text-violet-700" },
  aniversario: { rotulo: "Bônus de aniversário", cor: "bg-fuchsia-50 text-fuchsia-800" },
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

/**
 * Um copo por dose registrada, no desenho do medidor: borda cinza clara, parte vazia em degradê do
 * branco ao pêssego e o líquido marrom-escuro subindo na proporção dos ml (0 a 70, copo cheio).
 * Só o número, em branco, no rodapé do copo.
 */
function ChipsDose({ doses, pagamentoNaHora = false }: { doses: Dose[]; pagamentoNaHora?: boolean }) {
  const lista = doses.filter((d) => d.ml > 0);
  if (!lista.length && !pagamentoNaHora) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {lista.map((d) => {
        // O líquido nunca fica abaixo da faixa do número (que é branco), senão ele some na parte clara
        const pct = 38 + Math.min(1, d.ml / 70) * 62;
        return <Fragment key={d.n}>
          {pagamentoNaHora && d.n === 2 && <TagNaHora />}
          <span
            className="relative block h-9 w-[26px] overflow-hidden rounded-t-[3px] rounded-b-[8px] border border-[#c9c9c9] bg-gradient-to-b from-[#fbf8f6] to-[#d8a994]"
            title={`${d.n}ª dose: ${d.ml} ml`}
            aria-label={`${d.n}ª dose: ${d.ml} ml`}
          >
            <span className="absolute inset-x-0 bottom-0 bg-[#51270f] transition-[height] duration-500 ease-out motion-reduce:transition-none" style={{ height: `${pct}%` }} />
            <span aria-hidden className="absolute inset-x-0 bottom-[2px] text-center text-[13px] leading-none font-semibold tabular-nums text-white">{d.ml}</span>
          </span>
          {pagamentoNaHora && d.n === 1 && !lista.some((dose) => dose.n === 2) && <TagNaHora />}
        </Fragment>;
      })}
      {pagamentoNaHora && !lista.length && <TagNaHora />}
    </span>
  );
}

function TagNaHora() {
  return <span className="chip tag-pagamento-pendente shrink-0 gap-1 px-2 py-px text-[11px] whitespace-nowrap" title="Pagamento na hora"><Clock size={11} strokeWidth={2.4} aria-hidden />Na hora</span>;
}

/** Linha marcada na chamada: faixa verde à esquerda e um degradê verde bem sutil. */
const CLASSE_PRESENTE = "border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-100/80 via-emerald-50/40 to-white ring-1 ring-emerald-100";

/** Sigla da situação da contribuição (participante com dose registrada). */
const SIGLA_PAGAMENTO: Record<SituacaoPagamento, string> = { pendente: "PEN", informado: "PC", pago: "OK", isento: "IN", na_hora: "NH", credito: "CR", aniversario: "ANI" };

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
export function Participantes({ dados, semResumo = false, equipe = [], guardioes = [], titulo = "Participantes", acoes, embutido = false, financeiro = false }: {
  dados: DadosParticipantes;
  /** Aba Financeiro: mesma lista, mas no lugar das doses vai a contribuição (valor e data); sem chamada nem inclusão. */
  financeiro?: boolean;
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
  // O aviso some sozinho depois de 7 segundos
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(undefined), 7000);
    return () => clearTimeout(t);
  }, [msg]);
  // Inclusão: guarda quem já estava na lista; quando a lista atualiza, quem apareceu a mais ganha o destaque
  const [destacado, setDestacado] = useState<string | null>(null);
  const antesDeIncluir = useRef<Set<string> | null>(null);
  // Pessoa criada agora, sem cadastro: o card abre com os dados expandidos e em edição
  const [recemCriado, setRecemCriado] = useState<string | null>(null);
  const incluindoAvulso = useRef(false);
  const incluir = (fn: () => Promise<{ ok?: string; erro?: string }>, avulso = false) => {
    antesDeIncluir.current = new Set([...dados.confirmados, ...dados.espera].map((x) => x.id));
    incluindoAvulso.current = avulso;
    iniciar(async () => {
      const r = await fn();
      setMsg(r);
      if (r.erro) { antesDeIncluir.current = null; incluindoAvulso.current = false; }
    });
  };
  useEffect(() => {
    const antes = antesDeIncluir.current;
    if (!antes) return;
    const novo = [...dados.confirmados, ...dados.espera].find((x) => !antes.has(x.id));
    if (!novo) return;
    antesDeIncluir.current = null;
    if (incluindoAvulso.current) { setRecemCriado(novo.id); incluindoAvulso.current = false; }
    setDestacado(novo.id);
    setTimeout(() => setDestacado(null), 5000);
    requestAnimationFrame(() => document.querySelector(`[data-participante="${novo.id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [dados.confirmados, dados.espera]);
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
    // A lista do Financeiro não faz chamada: não regrava o que a lista de presença guardou
    if (!carregouChamada || financeiro) return;
    try { localStorage.setItem(chaveChamada, JSON.stringify({ ativa: chamadaAtiva, presentes: [...presentes] })); } catch { /* idem */ }
  }, [chamadaAtiva, presentes, chaveChamada, carregouChamada, financeiro]);
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
  const ehMarcavel = (id: string) => chamadaAtiva && dados.gerenciar && !financeiro;
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
  const mostrarBusca = total > 8 && !financeiro;
  // O menu ⋮ fica no cabeçalho, ao lado do título (no celular o título voltou, já que as abas foram para o rodapé)
  const acoesNaLinha = false;
  // No celular, com a busca visível, "Incluir participante" vira um botão só com o ícone ao lado dela
  const incluirNaBusca = dados.gerenciar && !financeiro && mostrarBusca && total > 0;
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
  // No Financeiro não há menu ⋮ para abrir o filtro: ele fica sempre à mostra
  const filtroNoMobile = financeiro || filtro !== "todos" || filtroAberto;

  return (
    <AcoesListaContexto.Provider value={{ abrirFiltro: temFiltros ? () => setFiltroAberto(true) : undefined, chamada: dados.gerenciar && !financeiro ? { ativa: chamadaAtiva, alternar: () => setChamadaAtiva((v) => !v) } : undefined }}>
    <section ref={secao} id={financeiro ? "contribuicoes" : "participantes"} aria-label={embutido ? titulo : undefined} className={embutido ? "scroll-mt-6 space-y-3 p-3.5 pt-2.5 sm:space-y-4 sm:p-4 sm:pt-2 md:p-5 md:pt-3" : "cartao scroll-mt-6 space-y-2 p-2 sm:space-y-5 sm:p-4 md:rounded-[22px] md:border-black/[0.05] md:p-5 md:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-14px_rgb(20_42_29/0.2)]"}>
      {/* Embutido nas abas: título só no celular (no computador a aba já diz o que é) */}
      {/* Financeiro: sem cabeçalho (a lista já vem logo abaixo dos números) */}
      <div className={`flex items-center justify-between gap-3 ${financeiro ? "hidden" : ""} ${embutido ? (dados.abertas ? "pt-1 md:hidden" : "pt-1 md:justify-end md:pt-0") : ""}`}>
        <div className={`flex items-center gap-3 ${embutido ? "md:hidden" : ""}`}>
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
      {dados.gerenciar && chamadaAtiva && !financeiro && (
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
        <div className={`flex gap-2 sm:flex-row sm:items-center sm:justify-start ${acoesNaLinha || incluirNaBusca ? "max-sm:flex-wrap max-sm:items-center" : "flex-col"} ${!filtroNoMobile && !mostrarBusca ? "max-md:hidden" : ""}`}>
          {dados.temContribuicao && dados.gerenciar ? (
            <div ref={filtroRef} className={`relative flex items-center gap-1.5 ${acoesNaLinha ? "max-sm:basis-full" : ""} ${filtroNoMobile ? "" : "max-md:hidden"}`} role="group" aria-label="Filtrar por contribuição">
              <button
                type="button"
                onClick={() => { setFiltro("todos"); setFiltroAberto(false); }}
                aria-pressed={filtro === "todos"}
                className={`inline-flex h-8 shrink-0 ${financeiro ? "" : "max-md:hidden"} items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ring-1 transition ${
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
                className={`inline-flex h-8 shrink-0 ${filtro === "todos" && !financeiro ? "max-md:hidden" : ""} items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ring-1 transition ${
                  filtro !== "todos" ? "bg-mata-700 text-white ring-mata-700" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
                }`}
              >
                <SlidersHorizontal size={13} aria-hidden />
                {filtro !== "todos" ? FILTROS_PG.find((f) => f.id === filtro)!.rotulo : "Filtrar"}
                {filtro !== "todos" && <span className="rounded-full bg-white/20 px-1.5 tabular-nums">{contagem[filtro]}</span>}
              </button>
              {filtro !== "todos" && (
                <button type="button" onClick={() => { setFiltro("todos"); setFiltroAberto(false); }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50 active:bg-stone-100 md:hidden">
                  <X size={13} aria-hidden /> Limpar
                </button>
              )}
              {filtroAberto && (
                <div role="dialog" aria-label="Filtrar por contribuição" className="menu-pop origem-esq absolute top-full left-0 z-20 mt-2 w-60 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.06),0_18px_40px_-10px_rgb(20_42_29/0.35)]">
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
            <div className={`relative sm:w-56 ${acoesNaLinha || incluirNaBusca ? "max-sm:min-w-0 max-sm:flex-1" : ""}`}>
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome" aria-label="Buscar participante" className="campo h-11 pl-8 text-sm md:h-9" />
            </div>
          )}
          {acoesNaLinha && <div className="shrink-0 md:hidden">{acoes}</div>}
          {incluirNaBusca && (
            <div className="shrink-0 md:hidden">
              <Incluir soIcone opcoes={dados.disponiveis} pendente={pendente} cheio={!livres} aoIncluir={(id) => incluir(() => incluirParticipanteAction(dados.eventoId, id))} aoIncluirAvulso={(nome) => incluir(() => incluirAvulsoAction(dados.eventoId, nome), true)} />
            </div>
          )}
        </div>
      )}

      <div className={`${financeiro ? "" : "lista-presenca-evento"} ${embutido ? "" : "sm:rounded-xl sm:border sm:border-stone-200/80 sm:p-3"}`}>
        <p className={`flex items-center justify-between px-0.5 pt-1 pb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase ${embutido ? "" : "sm:px-1.5"}`}>
          <span>{equipe.length ? (equipeOrdenada.length ? "Soldados da Luz" : "Participantes") : "Confirmados"} <span className="tabular-nums">({equipeOrdenada.length || confirmados.length})</span></span>
          {filtrando && <span className="normal-case tracking-normal font-medium">{confirmados.length} de {ocupadas}</span>}
        </p>
        {confirmados.length || soEquipe.length ? (
          <ul className="space-y-2 md:space-y-1">
            {/* Equipe primeiro (guardiões, guardiãs, mestres), com fundo azulado; depois os demais participantes */}
            {equipeOrdenada.map((x) => x.p ? (
              <Linha key={x.id} p={x.p} novo={destacado === x.p.id} papel={x.papel} destaque temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} financeiro={financeiro} esperado={dados.valorContribuicao} chamada={ehMarcavel(x.id)} presente={presentes.has(x.id)} abrir={() => (ehMarcavel(x.id) ? marcar(x.id) : setAberta(x.p!.inscricaoId))} />
            ) : (
              <li key={`equipe-${x.id}`}>
                {dados.gerenciar && !financeiro ? (
                  <button type="button" onClick={() => (chamadaAtiva ? marcar(x.id) : setEquipeAberta(x.id))} aria-label={chamadaAtiva ? `Marcar presença de ${x.nome}` : `Registrar a dosagem de ${x.nome}`} aria-pressed={chamadaAtiva ? presentes.has(x.id) : undefined}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition hover:ring-1 hover:ring-mata-200 ${chamadaAtiva && presentes.has(x.id) ? CLASSE_PRESENTE : x.papel === "mestre" ? "bg-mata-50 ring-1 ring-mata-100 hover:bg-mata-100/60" : "bg-sky-50 ring-1 ring-sky-100 hover:bg-mata-50/70"}`}>
                    <Avatar nome={x.nome} foto={x.foto} tamanho={32} className={`avatar-presenca ${chamadaAtiva && presentes.has(x.id) ? "ring-[3px]! ring-emerald-500! ring-offset-1" : "avatar-presenca-sem-aro ring-0"}`} />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-stone-800">{x.nome}</span>
                      <SeloPapel papel={x.papel} sexo={sexoDe.get(x.id)} soIcone={(dados.dosesEquipe?.[x.id] ?? []).some((d) => d.ml > 0)} />
                    </span>
                    <ChipsDose doses={dados.dosesEquipe?.[x.id] ?? []} />
                    {chamadaAtiva ? null : <ChevronRight size={16} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-mata-600 max-md:hidden" />}
                  </button>
                ) : (
                  <div className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 ring-1 ${x.papel === "mestre" ? "bg-mata-50 ring-mata-100" : "bg-sky-50 ring-sky-100"}`}>
                    <Avatar nome={x.nome} foto={x.foto} tamanho={32} className="avatar-presenca avatar-presenca-sem-aro ring-0" />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-stone-800">{x.nome}</span>
                      <SeloPapel papel={x.papel} sexo={sexoDe.get(x.id)} />
                    </span>
                  </div>
                )}
              </li>
            ))}
            {equipeOrdenada.length > 0 && confirmados.some((p) => !papelDe.has(p.id)) && (
              <li aria-hidden className="px-1.5 pt-3 pb-1 text-xs font-semibold tracking-wider text-stone-400 uppercase">Participantes <span className="tabular-nums">({confirmados.filter((p) => !papelDe.has(p.id)).length})</span></li>
            )}
            {confirmados.filter((p) => !papelDe.has(p.id)).map((p) => (
              <Linha key={p.id} p={p} novo={destacado === p.id} guardiao={ehGuardiao.has(p.id)} temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} financeiro={financeiro} esperado={dados.valorContribuicao} chamada={ehMarcavel(p.id)} presente={presentes.has(p.id)} abrir={() => (ehMarcavel(p.id) ? marcar(p.id) : setAberta(p.inscricaoId))} />
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
                <Linha key={p.id} p={p} novo={destacado === p.id} papel={papelDe.get(p.id)} guardiao={ehGuardiao.has(p.id)} posicao={pos} temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} financeiro={financeiro} esperado={dados.valorContribuicao} abrir={() => setAberta(p.inscricaoId)} />
              ))}
            </ol>
          </div>
        )}

        {dados.gerenciar && !financeiro && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <Incluir opcoes={dados.disponiveis} pendente={pendente} cheio={!livres} aoIncluir={(id) => incluir(() => incluirParticipanteAction(dados.eventoId, id))} aoIncluirAvulso={(nome) => incluir(() => incluirAvulsoAction(dados.eventoId, nome), true)} />
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
            contato={m.papel === "guardiao" ? m.contato ?? null : null}
            inicial={dados.dosesEquipe?.[m.id] ?? []}
            fechar={() => setEquipeAberta(null)}
          />
        ) : null;
      })()}

      {atual && (
        <ModalInscricao
          p={atual}
          financeiro={financeiro}
          posicaoEspera={posEspera >= 0 ? posEspera + 1 : undefined}
          dados={dados}
          abrirEditando={recemCriado === atual.id}
          fechar={() => { setAberta(null); setRecemCriado(null); }}
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
    <span title={info.rotulo} className={`inline-flex shrink-0 items-center gap-1 rounded-full text-[11px] font-semibold ${soIcone ? "h-6 w-6 justify-center" : "px-2 py-0.5"} md:h-6 md:w-[4.75rem] md:justify-center md:px-1 md:py-0 ${papel === "guardiao" ? "selo-guardiao" : ""} ${info.cor}`}>
      {/* No celular, com dose registrada, só o ícone; no computador sempre com o nome */}
      <info.Icone size={soIcone ? 13 : 11} aria-hidden className="md:size-[11px]" />{soIcone ? <span className="max-md:sr-only">{info.rotulo}</span> : <> {info.rotulo}</>}
    </span>
  );
}

/** Data curta no fuso do Instituto (igual no servidor e no navegador): "12 nov". */
const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).replace(".", "").replace(" de ", " ");

/** Financeiro: valor da contribuição e, embaixo, quando foi paga ou informada (ou o que falta). */
function ValorContribuicao({ p, esperado }: { p: ItemParticipanteInscrito; esperado: number | null }) {
  let valor: string;
  let detalhe: string;
  let cor: string;
  if (p.pagamento === "pago" && p.usouPacote) {
    // Observação "4/8": 4º uso de um pacote de 8. Vira "PAC 4/8" e, embaixo, 8 bolinhas com 4 preenchidas.
    const m = (p.pacoteObs ?? "").match(/(\d+)\s*\/\s*(\d+)/);
    const atual = m ? Number(m[1]) : 0;
    const total = m ? Number(m[2]) : 0;
    const bolinhas = total > 0 && total <= 9;
    // Pacote maior que 9: barra preenchida na proporção do que já foi usado
    const barra = total > 9;
    return (
      <span className="min-w-[4.5rem] shrink-0 text-right leading-tight">
        <span className="block truncate text-sm font-semibold tabular-nums text-violet-800">{m ? `PAC ${atual}/${total}` : "PAC"}</span>
        {bolinhas ? (
          <span className="mt-1 flex justify-end gap-[3px]" role="img" aria-label={`${atual}º uso de ${total} do pacote`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`block h-2 w-2 shrink-0 rounded-full ${i < atual ? "bg-violet-600" : "bg-violet-100 ring-1 ring-violet-200 ring-inset"}`} />
            ))}
          </span>
        ) : barra ? (
          <span className="mt-1.5 ml-auto block h-2 w-[4.5rem] overflow-hidden rounded-full bg-violet-100 ring-1 ring-violet-200 ring-inset" role="progressbar" aria-valuenow={Math.min(atual, total)} aria-valuemin={0} aria-valuemax={total} aria-label={`${atual}º uso de ${total} do pacote`}>
            <span className="block h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, Math.round((atual / total) * 100))}%` }} />
          </span>
        ) : (
          <span className="block truncate text-[11px] text-stone-400">{p.pacoteObs || (p.pagoEm ? dataCurta(p.pagoEm) : "pacote")}</span>
        )}
      </span>
    );
  }
  // Participação paga com crédito de pacote: número do crédito (ex.: "2/4") e, embaixo, que já foi debitado
  if (p.pagamento === "credito") {
    return (
      <span className="min-w-[4.5rem] shrink-0 text-right leading-tight">
        <span className="flex items-center justify-end gap-1 truncate text-sm font-semibold tabular-nums text-violet-800"><Ticket size={13} className="shrink-0" aria-hidden />{p.creditoRotulo ?? "Crédito"}</span>
        <span className="block truncate text-[11px] text-stone-400">debitado</span>
      </span>
    );
  }
  if (p.pagamento === "aniversario") {
    return (
      <span className="min-w-[4.5rem] shrink-0 text-right leading-tight">
        <span className="block truncate text-sm font-semibold text-fuchsia-800">Bônus</span>
        <span className="block truncate text-[11px] text-stone-400">aniversário</span>
      </span>
    );
  }
  if (p.pagamento === "pago") { valor = formatoReal(p.valor ?? 0); detalhe = p.pagoEm ? `pago ${dataCurta(p.pagoEm)}` : "pago"; cor = "text-emerald-800"; }
  else if (p.pagamento === "informado") { valor = p.valor != null ? formatoReal(p.valor) : "—"; detalhe = p.informadoEm ? `informou ${haQuanto(p.informadoEm)}` : "informado"; cor = "text-amber-800"; }
  else if (p.pagamento === "isento") { valor = "—"; detalhe = "não paga"; cor = "text-stone-400"; }
  else { valor = esperado != null ? formatoReal(esperado) : "—"; detalhe = p.pagamento === "na_hora" ? "paga na hora" : "a receber"; cor = "text-stone-500"; }
  return (
    <span className="w-[4.5rem] shrink-0 text-right leading-tight">
      <span className={`block truncate text-sm font-semibold tabular-nums ${cor}`}>{valor}</span>
      <span className="block truncate text-[11px] text-stone-400">{detalhe}</span>
    </span>
  );
}

function Linha({
  p, papel, guardiao = false, destaque = false, posicao, temContribuicao: comContribuicao, gerenciar, abrir, chamada = false, presente = false, financeiro = false, esperado = null, novo = false,
}: {
  p: ItemParticipanteInscrito; papel?: MembroLista["papel"]; guardiao?: boolean; destaque?: boolean; posicao?: number; temContribuicao: boolean; gerenciar: boolean; abrir: () => void; novo?: boolean;
  /** Chamada ativa: a linha vira marcador de presença. */ chamada?: boolean; presente?: boolean;
  /** Aba Financeiro: a contribuição no lugar das doses. */ financeiro?: boolean; /** Valor previsto, para quem ainda não pagou. */ esperado?: number | null;
}) {
  // Situação e valores da contribuição são só para quem gerencia
  const temContribuicao = comContribuicao && gerenciar;
  const pg = PAGAMENTO[p.pagamento];
  const conferir = temContribuicao && p.pagamento === "informado";
  const temDose = gerenciar && !financeiro && (p.doses ?? []).some((d) => d.ml > 0);
  const duasDosesConsumidas = (p.doses ?? []).filter((d) => d.ml > 0).length >= 2;
  const mostrarTagPresenca = temContribuicao && !financeiro && !duasDosesConsumidas;
  const confirmadoComPacote = p.pagamento === "credito" || (p.pagamento === "pago" && (p.usouPacote || p.forma === "pacote"));
  const conteudo = (
    <>
      {posicao !== undefined && <span className="w-5 shrink-0 text-center text-xs font-semibold text-stone-400 tabular-nums">{posicao}º</span>}
      <Avatar nome={p.nome} foto={p.foto} tamanho={32} className={`avatar-presenca ${chamada && presente ? "ring-[3px]! ring-emerald-500! ring-offset-1" : "avatar-presenca-sem-aro ring-0"}`} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="truncate text-sm font-medium text-stone-800">{p.nome}</span>
          {/* Primeira vez em um ritual: tag logo à direita do nome */}
          {gerenciar && p.primeiraVez && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 text-[11px] font-bold tracking-wide whitespace-nowrap text-orange-700 uppercase ring-1 ring-orange-300 ring-inset" title="Primeira vez em um ritual">
              <Sprout size={13} strokeWidth={2.4} className="text-orange-500" aria-hidden /> 1° VEZ
            </span>
          )}
          {/* Cargo (mestre/guardião) logo à direita do nome */}
          {papel && <SeloPapel papel={papel} sexo={p.contato?.sexo} soIcone={temDose} />}
          {/* Guardião que veio como participante (não está na guarnição deste ritual): só o escudo */}
          {guardiao && !papel && (
            <span title="Guardião" className="shrink-0 text-sky-600">
              <Shield size={13} strokeWidth={2.4} aria-hidden />
              <span className="sr-only">Guardião</span>
            </span>
          )}
          {/* Situação da contribuição na lista de presença; após duas doses, os copos ocupam esse espaço. */}
          {mostrarTagPresenca && p.pagamento === "pendente" && (
            <span className={`chip tag-pagamento-pendente shrink-0 gap-1 px-2 py-px text-[11px] whitespace-nowrap ${pg.cor}`} title={pg.rotulo}>
              <Clock size={11} strokeWidth={2.4} aria-hidden />{pg.rotulo}
            </span>
          )}
          {mostrarTagPresenca && confirmadoComPacote && (
            <span className="chip shrink-0 gap-1 bg-violet-100 px-2 py-px text-[11px] whitespace-nowrap text-violet-800" title="Confirmado com pacote" aria-label="Confirmado com pacote">
              <Ticket size={11} strokeWidth={2.3} aria-hidden />Confirmado
            </span>
          )}
          {mostrarTagPresenca && p.pagamento === "aniversario" && (
            <span className="chip shrink-0 gap-1 bg-fuchsia-100 px-2 py-px text-[11px] whitespace-nowrap text-fuchsia-800" title="Confirmado com bônus de aniversário" aria-label="Confirmado com bônus de aniversário">
              <Gift size={11} strokeWidth={2.3} aria-hidden />Bônus
            </span>
          )}
        </span>
        {/* Financeiro: a tag da situação embaixo do nome, um pouco menor */}
        {financeiro && temContribuicao && (
          <span className={`chip mt-0.5 gap-0.5 px-2 py-px text-[11px] ${p.pagamento === "pago" && p.usouPacote ? "bg-violet-100 text-violet-800" : pg.cor}`} title={p.pagamento === "pago" && p.usouPacote ? "Pago com pacote" : pg.rotulo}>
            {p.pagamento === "pago" && <Check size={11} className="shrink-0" />}{p.pagamento === "credito" ? <Ticket size={11} className="shrink-0" aria-hidden /> : p.pagamento === "aniversario" ? <Gift size={11} className="shrink-0" aria-hidden /> : null}{conferir && <Receipt size={11} className="shrink-0" />}{p.pagamento === "credito" ? "Crédito de pacote" : pg.rotulo}
          </span>
        )}
        {conferir && !financeiro && p.informadoEm && (
          <span className="block truncate text-[11px] text-amber-700">
            Informou {haQuanto(p.informadoEm)}{p.valor != null ? ` · ${formatoReal(p.valor)}` : ""}
          </span>
        )}
      </span>
      {gerenciar && !financeiro && <ChipsDose doses={p.doses ?? []} pagamentoNaHora={mostrarTagPresenca && p.pagamento === "na_hora"} />}
      {/* A situação da contribuição só aparece na aba Financeiro: o valor na ponta direita */}
      {financeiro && temContribuicao && <ValorContribuicao p={p} esperado={esperado} />}
    </>
  );
  const base = `flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left ${chamada && presente ? CLASSE_PRESENTE : conferir ? "border-l-[3px] border-amber-400 bg-amber-50/60" : destaque ? (papel === "mestre" ? "bg-mata-50 ring-1 ring-mata-100" : "bg-sky-50 ring-1 ring-sky-100") : "bg-stone-50/70"}`;
  if (!gerenciar) return <li data-participante={p.id} className={`${base} ${novo ? "animate-destaque motion-reduce:animate-none" : ""}`}>{conteudo}</li>;
  return (
    <li data-participante={p.id} className={novo ? "animate-destaque rounded-lg motion-reduce:animate-none" : undefined}>
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
function Incluir({ opcoes, pendente, cheio, aoIncluir, aoIncluirAvulso, soIcone = false }: {
  opcoes: PessoaParticipante[]; pendente: boolean; cheio: boolean; aoIncluir: (id: string) => void; aoIncluirAvulso: (nome: string) => void;
  /** Botão quadrado só com o ícone (ao lado da busca, no celular). */
  soIcone?: boolean;
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
        title={cheio ? "Incluir na lista de espera" : "Incluir participante"}
        aria-label={cheio ? "Incluir na lista de espera" : "Incluir participante"}
        className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-mata-700 transition disabled:opacity-60 ${soIcone ? "w-11 shrink-0 border border-stone-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:border-stone-300 hover:bg-mata-50 active:bg-mata-100" : "w-full border border-dashed border-mata-300 hover:border-mata-400 hover:bg-mata-50 active:bg-mata-100"}`}
      >
        {pendente ? <Carregando tamanho={15} /> : <UserPlus size={soIcone ? 19 : 17} aria-hidden />}
        {!soIcone && (cheio ? "Incluir na lista de espera" : "Incluir participante")}
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
                      <span className="block truncate">Criar <strong className="font-semibold">“{capitalizarNomeProprio(nomeDigitado.trim().replace(/s+/g, " "))}”</strong></span>
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
