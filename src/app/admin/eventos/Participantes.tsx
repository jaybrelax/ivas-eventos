"use client";

import { createContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronRight, Clock, Crown, Paperclip, Receipt, Search, Shield, SlidersHorizontal, UserPlus, Users, X } from "lucide-react";
import type { Sexo, SituacaoPagamento } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Aviso, Carregando } from "@/components/ui";
import { incluirAvulsoAction, incluirParticipanteAction } from "./participantes-actions";
import { ModalInscricao } from "./ModalInscricao";

export type PessoaParticipante = { id: string; nome: string; foto: string | null };
/** Contato do participante: só vem preenchido para quem gerencia o evento. */
export type ContatoParticipante = { email: string; telefone: string | null; cidade: string | null; estado: string | null; sexo: Sexo | null; desde: string; cpf: string | null };
export type ItemParticipanteInscrito = PessoaParticipante & {
  pagamento: SituacaoPagamento; inscricaoId: string; comprovante: string | null;
  inscritoEm: string; valor: number | null; informadoEm: string | null; pagoEm: string | null;
  contato: ContatoParticipante | null;
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
};

const PAGAMENTO: Record<SituacaoPagamento, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-100 text-stone-600" },
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
export const AcoesListaContexto = createContext<{ abrirFiltro?: () => void }>({});

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
export function Participantes({ dados, semResumo = false, equipe = [], guardioes = [], titulo = "Participantes", acoes }: {
  dados: DadosParticipantes;
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
    <AcoesListaContexto.Provider value={{ abrirFiltro: temFiltros ? () => setFiltroAberto(true) : undefined }}>
    <section id="participantes" className="cartao scroll-mt-6 space-y-3.5 p-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-mata-50 text-mata-600 sm:h-10 sm:w-10"><Users size={18} /></span>
          <div>
            <h2 className="cartao-titulo">{titulo}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!dados.abertas && <span className="chip bg-stone-100 text-stone-600">Inscrições fechadas</span>}
          {acoes}
        </div>
      </div>

      {msg && <Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso>}

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
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${!filtroNoMobile && !mostrarBusca ? "max-md:hidden" : ""}`}>
          {dados.temContribuicao && dados.gerenciar ? (
            <div ref={filtroRef} className={`relative flex items-center gap-1.5 ${filtroNoMobile ? "" : "max-md:hidden"}`} role="group" aria-label="Filtrar por contribuição">
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
            <div className="relative sm:w-56">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome" aria-label="Buscar participante" className="campo h-9 pl-8 text-sm" />
            </div>
          )}
        </div>
      )}

      <div className="sm:rounded-xl sm:border sm:border-stone-200/80 sm:p-3">
        <p className="flex items-center justify-between px-0.5 pt-1 pb-2 sm:px-1.5 text-xs font-semibold tracking-wider text-stone-400 uppercase">
          <span>{equipe.length ? (equipeOrdenada.length ? "Equipe do ritual" : "Participantes") : "Confirmados"}</span>
          {filtrando && <span className="normal-case tracking-normal font-medium">{confirmados.length} de {ocupadas}</span>}
        </p>
        {confirmados.length || soEquipe.length ? (
          <ul className="space-y-1">
            {/* Equipe primeiro (guardiões, guardiãs, mestres), com fundo azulado; depois os demais participantes */}
            {equipeOrdenada.map((x) => x.p ? (
              <Linha key={x.id} p={x.p} papel={x.papel} destaque temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} abrir={() => setAberta(x.p!.inscricaoId)} />
            ) : (
              <li key={`equipe-${x.id}`} className="flex w-full items-center gap-2.5 rounded-lg bg-sky-50 px-2 py-1.5 ring-1 ring-sky-100">
                <Avatar nome={x.nome} foto={x.foto} tamanho={32} className="ring-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{x.nome}</span>
                <SeloPapel papel={x.papel} />
              </li>
            ))}
            {equipeOrdenada.length > 0 && confirmados.some((p) => !papelDe.has(p.id)) && (
              <li aria-hidden className="px-1.5 pt-3 pb-1 text-xs font-semibold tracking-wider text-stone-400 uppercase">Participantes</li>
            )}
            {confirmados.filter((p) => !papelDe.has(p.id)).map((p) => (
              <Linha key={p.id} p={p} guardiao={ehGuardiao.has(p.id)} temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} abrir={() => setAberta(p.inscricaoId)} />
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
function SeloPapel({ papel }: { papel: MembroLista["papel"] }) {
  const info = PAPEL[papel];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${info.cor}`}>
      <info.Icone size={11} /> {info.rotulo}
    </span>
  );
}

function Linha({
  p, papel, guardiao = false, destaque = false, posicao, temContribuicao: comContribuicao, gerenciar, abrir,
}: {
  p: ItemParticipanteInscrito; papel?: MembroLista["papel"]; guardiao?: boolean; destaque?: boolean; posicao?: number; temContribuicao: boolean; gerenciar: boolean; abrir: () => void;
}) {
  // Situação e valores da contribuição são só para quem gerencia
  const temContribuicao = comContribuicao && gerenciar;
  const pg = PAGAMENTO[p.pagamento];
  const conferir = temContribuicao && p.pagamento === "informado";
  const conteudo = (
    <>
      {posicao !== undefined && <span className="w-5 shrink-0 text-center text-xs font-semibold text-stone-400 tabular-nums">{posicao}º</span>}
      <Avatar nome={p.nome} foto={p.foto} tamanho={32} className="ring-0" />
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
      {papel && <SeloPapel papel={papel} />}
      {temContribuicao && p.comprovante && <Paperclip size={14} className="shrink-0 text-stone-400" aria-label="Comprovante anexado" />}
      {temContribuicao && (
        <span className={`chip shrink-0 ${pg.cor}`}>
          {p.pagamento === "pago" && <Check size={12} />}{conferir && <Receipt size={12} />}{pg.rotulo}
        </span>
      )}
    </>
  );
  const base = `flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${conferir ? "border-l-[3px] border-amber-400 bg-amber-50/60" : destaque ? "bg-sky-50 ring-1 ring-sky-100" : "bg-stone-50/70"}`;
  if (!gerenciar) return <li className={base}>{conteudo}</li>;
  return (
    <li>
      <button
        type="button"
        onClick={abrir}
        className={`group ${base} transition hover:bg-mata-50/70 hover:ring-1 hover:ring-mata-200`}
        aria-label={`Gerenciar a inscrição de ${p.nome}`}
      >
        {conteudo}
        <ChevronRight size={16} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-mata-600" />
      </button>
    </li>
  );
}

/** Inclusão manual com busca por nome (a lista de pessoas pode ter centenas de nomes). */
/**
 * Inclusão manual com busca por nome entre todas as pessoas com conta. Se ninguém servir, a última opção
 * inclui o nome digitado como participante sem cadastro.
 */
function Incluir({ opcoes, pendente, cheio, aoIncluir, aoIncluirAvulso }: {
  opcoes: PessoaParticipante[]; pendente: boolean; cheio: boolean; aoIncluir: (id: string) => void; aoIncluirAvulso: (nome: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  const nomeDigitado = texto.trim().replace(/\s+/g, " ");
  const termo = semAcento(nomeDigitado);
  const resultados = useMemo(
    () => (termo ? opcoes.filter((p) => semAcento(p.nome).includes(termo)) : opcoes).slice(0, 8),
    [opcoes, termo],
  );
  // Opção "sem cadastro": aparece com 3+ letras e quando o nome não é idêntico a alguém da lista
  const mostraAvulso = nomeDigitado.length >= 3 && !resultados.some((p) => semAcento(p.nome) === termo);
  const totalOpcoes = resultados.length + (mostraAvulso ? 1 : 0);

  const limpar = () => { setTexto(""); setAberto(false); campo.current?.blur(); };
  const escolher = (i: number) => {
    if (i < resultados.length) aoIncluir(resultados[i].id);
    else if (mostraAvulso) aoIncluirAvulso(nomeDigitado);
    else return;
    limpar();
  };

  return (
    <div className="relative">
      <div className="relative">
        {pendente ? (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"><Carregando tamanho={14} /></span>
        ) : (
          <UserPlus size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
        )}
        <input
          ref={campo}
          value={texto}
          disabled={pendente}
          onChange={(e) => { setTexto(e.target.value); setAberto(true); setAtivo(0); }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(a + 1, totalOpcoes - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && totalOpcoes) { e.preventDefault(); escolher(ativo); }
            else if (e.key === "Escape") { setAberto(false); }
          }}
          placeholder={cheio ? "Incluir na lista de espera: buscar ou digitar um nome…" : "Incluir participante: buscar ou digitar um nome…"}
          role="combobox"
          aria-expanded={aberto}
          aria-controls="incluir-opcoes"
          aria-autocomplete="list"
          aria-label="Incluir participante"
          className="campo h-10 pr-9 pl-9 text-sm"
        />
        {texto && (
          <button type="button" onClick={() => setTexto("")} aria-label="Limpar" className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-stone-400 hover:text-stone-700">
            <X size={13} />
          </button>
        )}
      </div>
      {aberto && (totalOpcoes > 0 || !opcoes.length) && (
        <ul id="incluir-opcoes" role="listbox" className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-elevado">
          {resultados.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === ativo}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => escolher(i)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${i === ativo ? "bg-mata-50 text-mata-900" : "text-stone-700"}`}
              >
                <Avatar nome={p.nome} foto={p.foto} tamanho={26} className="ring-0" />
                <span className="truncate">{p.nome}</span>
              </button>
            </li>
          ))}
          {mostraAvulso && (
            <li role="option" aria-selected={ativo === resultados.length} className={resultados.length ? "mt-1 border-t border-stone-100 pt-1" : ""}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setAtivo(resultados.length)}
                onClick={() => escolher(resultados.length)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${ativo === resultados.length ? "bg-ouro-100/70 text-stone-900" : "text-stone-700"}`}
              >
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-dashed border-ouro-500 text-ouro-700"><UserPlus size={13} /></span>
                <span className="min-w-0">
                  <span className="block truncate">Incluir <strong className="font-semibold">“{nomeDigitado}”</strong></span>
                  <span className="block text-[11px] text-stone-500">Pessoa ainda sem cadastro no sistema</span>
                </span>
              </button>
            </li>
          )}
          {!totalOpcoes && <li className="px-3 py-2.5 text-sm text-stone-400">Digite um nome para incluir alguém sem cadastro.</li>}
        </ul>
      )}
    </div>
  );
}
