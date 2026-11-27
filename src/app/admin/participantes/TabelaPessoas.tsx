"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock, Download, MessageCircle, Receipt, Search, SearchX, Sparkles, UserRound, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { csvCampo } from "@/lib/csv";
import { MenuParticipante } from "./MenuParticipante";

export type LinhaPessoa = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  foto: string | null;
  local: string | null;
  equipe: boolean;
  etiqueta: { rotulo: string; cor: string };
  participou: number;
  proximos: number;
  /** Pagamentos sem resolução (pendente ou na hora) e os já informados que aguardam a coordenação. */
  emAberto: number;
  aguardando: number;
  ultimaParticipacao: string | null;
  criadoEm: string;
};

type Filtro = "todos" | "participantes" | "equipe" | "aguardando" | "aberto" | "proximos" | "novos";
type Ordem = "recentes" | "nome" | "rituais" | "ultima";

const POR_PAGINA = 30;
const DIAS_NOVO = 30;

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "participantes", rotulo: "Participantes" },
  { id: "equipe", rotulo: "Equipe" },
  { id: "proximos", rotulo: "Com próximo ritual" },
  { id: "aguardando", rotulo: "Aguardando conferência" },
  { id: "aberto", rotulo: "Pagamento em aberto" },
  { id: "novos", rotulo: `Novos (${DIAS_NOVO} dias)` },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const dataBr = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(iso));
const linkWhats = (t: string) => {
  const n = t.replace(/\D/g, "");
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}`;
};

/**
 * Lista de pessoas do painel: busca instantânea (sem acento), filtros rápidos, ordenação,
 * indicadores clicáveis, exportação do que está na tela e cartões no celular.
 * Filtro, ordem e busca ficam no endereço para o link poder ser compartilhado.
 */
export function TabelaPessoas({ pessoas, admin, filtroInicial, ordemInicial, buscaInicial }: {
  pessoas: LinhaPessoa[];
  admin: boolean;
  filtroInicial: string;
  ordemInicial: string;
  buscaInicial: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(buscaInicial);
  const [filtro, setFiltro] = useState<Filtro>(FILTROS.some((f) => f.id === filtroInicial) ? (filtroInicial as Filtro) : "todos");
  const [ordem, setOrdem] = useState<Ordem>((["recentes", "nome", "rituais", "ultima"] as const).includes(ordemInicial as Ordem) ? (ordemInicial as Ordem) : "recentes");
  const [limite, setLimite] = useState(POR_PAGINA);
  const campoBusca = useRef<HTMLInputElement>(null);

  // "/" foca a busca, como nos painéis conhecidos
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName) && !alvo.isContentEditable) {
        e.preventDefault();
        campoBusca.current?.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  // Mantém o endereço em dia sem recarregar a página
  useEffect(() => {
    const url = new URL(window.location.href);
    const definir = (k: string, v: string, padrao: string) => (v && v !== padrao ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    definir("q", busca.trim(), "");
    definir("filtro", filtro, "todos");
    definir("ordem", ordem, "recentes");
    window.history.replaceState(null, "", url);
    setLimite(POR_PAGINA);
  }, [busca, filtro, ordem]);

  const limiteNovo = useMemo(() => Date.now() - DIAS_NOVO * 86_400_000, []);
  const contagem = useMemo(() => {
    const c: Record<Filtro, number> = { todos: pessoas.length, participantes: 0, equipe: 0, aguardando: 0, aberto: 0, proximos: 0, novos: 0 };
    for (const p of pessoas) {
      if (p.equipe) c.equipe++; else c.participantes++;
      if (p.aguardando) c.aguardando++;
      if (p.emAberto) c.aberto++;
      if (p.proximos) c.proximos++;
      if (Date.parse(p.criadoEm) >= limiteNovo) c.novos++;
    }
    return c;
  }, [pessoas, limiteNovo]);

  const lista = useMemo(() => {
    const termo = semAcento(busca.trim());
    const digitos = busca.replace(/\D/g, "");
    const passa = (p: LinhaPessoa) => {
      switch (filtro) {
        case "participantes": return !p.equipe;
        case "equipe": return p.equipe;
        case "aguardando": return p.aguardando > 0;
        case "aberto": return p.emAberto > 0;
        case "proximos": return p.proximos > 0;
        case "novos": return Date.parse(p.criadoEm) >= limiteNovo;
        default: return true;
      }
    };
    const filtrada = pessoas.filter((p) => {
      if (!passa(p)) return false;
      if (!termo) return true;
      return semAcento(p.nome).includes(termo) || p.email.toLowerCase().includes(termo)
        || (digitos.length >= 3 && (p.telefone ?? "").replace(/\D/g, "").includes(digitos));
    });
    const porNome = (a: LinhaPessoa, b: LinhaPessoa) => a.nome.localeCompare(b.nome, "pt-BR");
    return filtrada.sort((a, b) => {
      if (ordem === "nome") return porNome(a, b);
      if (ordem === "rituais") return b.participou - a.participou || porNome(a, b);
      if (ordem === "ultima") return (b.ultimaParticipacao ?? "").localeCompare(a.ultimaParticipacao ?? "") || porNome(a, b);
      return b.criadoEm.localeCompare(a.criadoEm);
    });
  }, [pessoas, busca, filtro, ordem, limiteNovo]);

  const visiveis = lista.slice(0, limite);
  const temFiltro = filtro !== "todos" || busca.trim() !== "";
  const limpar = () => { setBusca(""); setFiltro("todos"); };

  const exportar = () => {
    const cab = ["Nome", "E-mail", "WhatsApp", "Cidade", "Tipo", "Rituais", "Próximos", "Pagamentos em aberto", "Aguardando conferência", "Última participação", "Cadastro"];
    const linhas = lista.map((p) => [
      p.nome, p.email, p.telefone ?? "", p.local ?? "", p.etiqueta.rotulo, String(p.participou), String(p.proximos),
      String(p.emAberto), String(p.aguardando), p.ultimaParticipacao ? dataBr(`${p.ultimaParticipacao}T12:00:00`) : "", dataBr(p.criadoEm),
    ]);
    const csv = [cab, ...linhas].map((l) => l.map(csvCampo).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis: { filtro: Filtro; rotulo: string; Icone: typeof UserRound; cor: string; destaque?: boolean }[] = [
    { filtro: "todos", rotulo: "Pessoas", Icone: UserRound, cor: "bg-mata-50 text-mata-600" },
    { filtro: "proximos", rotulo: "Com próximo ritual", Icone: CalendarCheck, cor: "bg-emerald-50 text-emerald-600" },
    { filtro: "aguardando", rotulo: "Aguardando conferência", Icone: Receipt, cor: "bg-amber-50 text-amber-600", destaque: contagem.aguardando > 0 },
    { filtro: "novos", rotulo: `Novos em ${DIAS_NOVO} dias`, Icone: Sparkles, cor: "bg-sky-50 text-sky-600" },
  ];

  return (
    <>
      {/* Indicadores: clicar aplica o filtro correspondente */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ filtro: f, rotulo, Icone, cor, destaque }) => {
          const ativo = filtro === f && f !== "todos";
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(filtro === f ? "todos" : f)}
              aria-pressed={ativo}
              className={`cartao group flex flex-col items-start gap-2.5 p-4 text-left transition hover:-translate-y-px hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${ativo ? "ring-2 ring-mata-500" : ""}`}
            >
              <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cor}`}>
                <Icone size={20} />
                {destaque && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-stone-500">{rotulo}</span>
                <span className="block text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{contagem[f]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="participantes-lista cartao overflow-hidden p-0 sm:p-0">
        {/* Barra de ferramentas */}
        <div className="space-y-3 border-b border-stone-100 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
              <input
                ref={campoBusca}
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone"
                aria-label="Buscar pessoas"
                className="campo h-10 pr-16 pl-9 text-sm"
              />
              {busca ? (
                <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700">
                  <X size={14} />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-stone-200 bg-stone-50 px-1.5 text-[11px] text-stone-400 sm:block">/</kbd>
              )}
            </div>
            <div className="flex gap-2">
              {/* Filtro em menu: cada opção mostra quantas pessoas tem */}
              <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtrar pessoas" className={`campo h-10 flex-1 text-sm sm:w-56 sm:flex-none ${filtro !== "todos" ? "border-mata-500 font-semibold text-mata-800" : ""}`}>
                {FILTROS.map((f) => <option key={f.id} value={f.id}>{f.rotulo} ({contagem[f.id]})</option>)}
              </select>
              <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar" className="campo h-10 flex-1 text-sm sm:w-48 sm:flex-none">
                <option value="recentes">Cadastro mais recente</option>
                <option value="nome">Nome (A–Z)</option>
                <option value="rituais">Mais rituais</option>
                <option value="ultima">Participação mais recente</option>
              </select>
              <button type="button" onClick={exportar} disabled={!lista.length} className="btn-secundario h-10 shrink-0 px-3 text-sm" title="Exporta as pessoas filtradas">
                <Download size={15} /> <span className="hidden sm:inline">Exportar</span>
              </button>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-stone-500 sm:px-6" aria-live="polite">
          <span>
            {lista.length === pessoas.length ? `${pessoas.length} pessoas` : `${lista.length} de ${pessoas.length} pessoas`}
          </span>
          {temFiltro && (
            <button type="button" onClick={limpar} className="font-semibold text-mata-700 hover:underline">Limpar filtros</button>
          )}
        </div>

        {lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400"><SearchX size={22} /></span>
            <p className="font-semibold text-stone-800">{pessoas.length ? "Ninguém encontrado" : "Nenhuma pessoa cadastrada ainda"}</p>
            {pessoas.length > 0 && <p className="text-sm text-stone-500">Tente outro termo ou remova os filtros.</p>}
            {temFiltro && <button type="button" onClick={limpar} className="btn-secundario mt-2 h-9 px-4 text-sm">Limpar filtros</button>}
          </div>
        ) : (
          <>
            {/* Celular: cartões */}
            <ul className="divide-y divide-stone-100 border-t border-stone-100 md:hidden">
              {visiveis.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/admin/participantes/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar nome={p.nome} foto={p.foto} tamanho={40} className="participante-avatar ring-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-stone-900">{p.nome}</span>
                        <span className={`chip participante-tag shrink-0 px-1.5 py-0 text-[10px] ring-1 ring-inset ${p.etiqueta.cor}`}>{p.etiqueta.rotulo}</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-stone-500">
                        <span className="tabular-nums">{p.participou} {p.participou === 1 ? "ritual" : "rituais"}</span>
                        {p.proximos > 0 && <span className="text-emerald-700 tabular-nums">{p.proximos} próximo{p.proximos > 1 ? "s" : ""}</span>}
                        <Pagamentos p={p} compacto />
                      </span>
                    </span>
                  </Link>
                  <MenuParticipante userId={p.id} nome={p.nome} admin={admin} equipe={p.equipe} />
                </li>
              ))}
            </ul>

            {/* Tela larga: tabela */}
            <div className="hidden overflow-x-auto border-t border-stone-100 md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-stone-50/95 text-left text-xs text-stone-500 backdrop-blur">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Pessoa</th>
                    <th scope="col" className="px-3 py-3 font-medium">Tipo</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Rituais</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Próximos</th>
                    <th scope="col" className="px-3 py-3 font-medium">Pagamentos</th>
                    <th scope="col" className="hidden px-3 py-3 font-medium whitespace-nowrap xl:table-cell">Última vez</th>
                    <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">Cadastro</th>
                    <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((p) => (
                    <tr
                      key={p.id}
                      onClick={(e) => {
                        // A linha inteira abre a ficha; botões e links de dentro seguem o próprio caminho.
                        // Menu e modais vão para o body (portal): o clique chega aqui pelo React, mas não está dentro da linha.
                        if (!e.currentTarget.contains(e.target as Node)) return;
                        if ((e.target as HTMLElement).closest("a,button")) return;
                        router.push(`/admin/participantes/${p.id}`);
                      }}
                      className="cursor-pointer border-t border-stone-100 transition hover:bg-mata-50/40"
                    >
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar nome={p.nome} foto={p.foto} tamanho={34} className="participante-avatar ring-0" />
                          <span className="min-w-0">
                            <Link href={`/admin/participantes/${p.id}`} className="block truncate font-medium text-stone-900 hover:text-mata-700">{p.nome}</Link>
                            <span className="block truncate text-xs text-stone-500">{p.email}{p.local ? ` · ${p.local}` : ""}</span>
                          </span>
                          {p.telefone && (
                            <a
                              href={linkWhats(p.telefone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp: ${p.telefone}`}
                              aria-label={`Abrir WhatsApp de ${p.nome}`}
                              className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-300 transition hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`chip participante-tag whitespace-nowrap ring-1 ring-inset ${p.etiqueta.cor}`}>{p.etiqueta.rotulo}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-stone-800 tabular-nums">{p.participou}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {p.proximos ? <span className="font-medium text-emerald-700">{p.proximos}</span> : <span className="text-stone-300">0</span>}
                      </td>
                      <td className="px-3 py-2.5"><Pagamentos p={p} /></td>
                      <td className="hidden px-3 py-2.5 whitespace-nowrap text-stone-500 tabular-nums xl:table-cell">
                        {p.ultimaParticipacao ? dataBr(`${p.ultimaParticipacao}T12:00:00`) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="hidden px-3 py-2.5 whitespace-nowrap text-stone-500 tabular-nums lg:table-cell">{dataBr(p.criadoEm)}</td>
                      <td className="px-6 py-2.5 text-right">
                        <MenuParticipante userId={p.id} nome={p.nome} admin={admin} equipe={p.equipe} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {lista.length > limite && (
              <div className="border-t border-stone-100 px-6 py-4 text-center">
                <button type="button" onClick={() => setLimite((l) => l + POR_PAGINA)} className="btn-secundario h-9 px-4 text-sm">
                  Mostrar mais {Math.min(POR_PAGINA, lista.length - limite)} <span className="text-stone-400">· {visiveis.length} de {lista.length}</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

/** Situação financeira da pessoa: o que aguarda conferência vem primeiro, porque pede ação da coordenação. */
function Pagamentos({ p, compacto = false }: { p: LinhaPessoa; compacto?: boolean }) {
  if (p.aguardando)
    return (
      <span className={compacto ? "inline-flex items-center gap-1 font-medium text-amber-700" : "chip whitespace-nowrap bg-amber-50 text-amber-800 ring-1 ring-amber-200 ring-inset"}>
        <Receipt size={12} /> {p.aguardando} p/ conferir
      </span>
    );
  if (p.emAberto)
    return (
      <span className={compacto ? "inline-flex items-center gap-1 text-stone-600" : "chip whitespace-nowrap bg-stone-100 text-stone-700"}>
        <Clock size={12} /> {p.emAberto} em aberto
      </span>
    );
  return compacto ? null : <span className="chip whitespace-nowrap bg-emerald-50 text-emerald-700">Em dia</span>;
}
