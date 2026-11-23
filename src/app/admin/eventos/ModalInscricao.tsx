"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera, CalendarClock, CalendarX2, Check, CheckCircle2, ChevronDown, ExternalLink, IdCard, Pencil, FileImage, Hourglass, Lock, Mail, MapPin,
  ImagePlus, GlassWater, MessageCircle, Receipt, Settings2, ShieldCheck, Trash2, Undo2, UserRound, X, ZoomIn,
} from "lucide-react";
import type { SituacaoInscricao, SituacaoPagamento } from "@/lib/types";
import { urlImagem } from "@/lib/links";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { Carregando } from "@/components/ui";
import { anexarComprovanteAction, excluirComprovanteAction, salvarDosesAction, confirmarPagamentoAction, informarDadosAction, isentarPagamentoAction, reabrirPagamentoAction, removerParticipanteAction } from "./participantes-actions";
import { InputTelefone } from "@/components/InputTelefone";
import { useImagem } from "@/components/useImagem";
import { Dosagem } from "./Dosagem";
import type { Dose } from "@/lib/doses";
import { UFS } from "@/lib/perfil-extra";
import { mascararCpf } from "@/lib/cpf";
import type { DadosParticipantes, ItemParticipanteInscrito } from "./Participantes";

type Resultado = { ok?: string; erro?: string };

/** Campo de edição que parece o próprio texto exibido: sem borda nem fundo, só o cursor. */
const CAMPO_INLINE = "block w-full min-w-0 rounded-sm border-0 bg-transparent p-0 text-sm font-medium text-stone-800 caret-mata-600 outline-none placeholder:font-normal placeholder:text-stone-400 focus:ring-0 focus-visible:outline-none!";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso))
    .replace(",", " às");
const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

/** Situação da contribuição como a coordenação vê (inclui o que o próprio participante avisou). */
const SITUACAO_CONTRIBUICAO: Record<SituacaoPagamento, { rotulo: string; detalhe: string; cor: string; /** bloco de situação: fundo, faixa lateral e ícone */ bloco: string; Icone: typeof CheckCircle2 }> = {
  pendente: { rotulo: "Pendente", detalhe: "O participante ainda não avisou a contribuição.", cor: "bg-yellow-50 text-yellow-800 ring-yellow-200", bloco: "bg-yellow-50/80 border-yellow-400 text-yellow-900 [&_svg]:text-yellow-600", Icone: Hourglass },
  informado: { rotulo: "Informada", detalhe: "O participante avisou que contribuiu. Confira o comprovante e confirme.", cor: "bg-amber-50 text-amber-800 ring-amber-200", bloco: "bg-amber-50/80 border-amber-500 text-amber-900 [&_svg]:text-amber-600", Icone: Receipt },
  na_hora: { rotulo: "Na hora", detalhe: "O participante vai contribuir no dia do ritual.", cor: "bg-ouro-100 text-ouro-700 ring-ouro-200", bloco: "bg-ouro-100/60 border-ouro-500 text-ouro-700 [&_svg]:text-ouro-600", Icone: CalendarClock },
  pago: { rotulo: "Confirmada", detalhe: "Contribuição confirmada pela coordenação.", cor: "bg-emerald-50 text-emerald-800 ring-emerald-200", bloco: "bg-emerald-50 border-emerald-500 text-emerald-900 [&_svg]:text-emerald-600", Icone: CheckCircle2 },
  isento: { rotulo: "Isento", detalhe: "Participação isenta de contribuição.", cor: "bg-sky-50 text-sky-800 ring-sky-200", bloco: "bg-sky-50 border-sky-400 text-sky-900 [&_svg]:text-sky-600", Icone: ShieldCheck },
};

/** Evento da inscrição, quando o modal é aberto a partir da ficha do participante. */
export type EventoDoModal = { titulo: string; quando: string; capa: string | null; href: string };

/**
 * Modal da inscrição de um participante num evento: quem é a pessoa (contato e cadastro) ou,
 * aberto pela ficha do participante, qual é o evento; a situação da contribuição (com o
 * comprovante anexado) e o cancelamento da participação.
 */
export function ModalInscricao({
  p, situacaoInscricao, posicaoEspera, dados, evento, podeCancelar = true, fechar, aoCancelar,
}: {
  p: ItemParticipanteInscrito;
  /** Sem valor: confirmada, ou lista de espera se houver `posicaoEspera`. */
  situacaoInscricao?: SituacaoInscricao;
  /** Posição na lista de espera. */
  posicaoEspera?: number;
  dados: Pick<DadosParticipantes, "eventoId" | "temContribuicao" | "valorContribuicao" | "gerenciar" | "linkPerfil" | "localPadrao">;
  /** Com o evento, o cabeçalho mostra o evento em vez da pessoa (ficha do participante). */
  evento?: EventoDoModal;
  /** Eventos já realizados não têm cancelamento. */
  podeCancelar?: boolean;
  fechar: () => void;
  /** Depois de cancelar, o modal fecha e o aviso aparece na página. */
  aoCancelar: (r: Resultado) => void;
}) {
  const [msg, setMsg] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();
  const [ampliado, setAmpliado] = useState(false);
  const [comprovanteAberto, setComprovanteAberto] = useState(false);
  const [usouPacote, setUsouPacote] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pedirValor, setPedirValor] = useState(false);
  const [verDados, setVerDados] = useState(false);
  // Doses como a tela mostra (atualizadas na hora pelo card Dosagem), para a linha do tempo
  const [dosesTela, setDosesTela] = useState<Dose[]>(p.doses ?? []);
  const [editando, setEditando] = useState(false);
  // "Informar dados": abre a lista (se estiver só nos ícones) e deixa os textos editáveis ali mesmo
  const informar = () => { setMsg(undefined); setVerDados(true); setEditando(true); };
  const router = useRouter();
  // Contribuição já resolvida (confirmada ou isenta) começa recolhida; pendente/informada começa aberta
  const [contribAberta, setContribAberta] = useState(p.pagamento !== "pago" && p.pagamento !== "isento");
  // Os ícones "viajam" da linha para a coluna: View Transitions quando o navegador suporta
  const alternarDados = () => {
    // Recém-incluído, sem nenhum dado: "Exibir dados" já abre o formulário para preencher
    if (!verDados && dados.gerenciar && c && !c.email && !c.telefone && !c.cidade && !c.estado && !c.cpf) { informar(); return; }
    const trocar = () => flushSync(() => setVerDados((v) => !v));
    const doc = document as Document & { startViewTransition?: (fn: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(trocar);
    else trocar();
  };
  const rodar = (fn: () => Promise<Resultado>) => iniciar(async () => { setPedirValor(false); setMsg(await fn()); });
  const valorSugerido = p.valor ?? dados.valorContribuicao ?? null;

  useEffect(() => {
    // Esc fecha primeiro o que estiver por cima: comprovante ampliado, confirmação e, por fim, o modal
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (ampliado ? setAmpliado(false) : confirmando ? setConfirmando(false) : pedirValor ? setPedirValor(false) : editando ? setEditando(false) : fechar());
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = rolagem;
    };
  }, [fechar, ampliado, confirmando, pedirValor, editando]);

  const c = p.contato;
  const situacao = SITUACAO_CONTRIBUICAO[p.pagamento];
  const pago = p.pagamento === "pago";
  const whatsapp = c?.telefone ? `https://wa.me/${(c.telefone.replace(/\D/g, "").startsWith("55") ? "" : "55") + c.telefone.replace(/\D/g, "")}` : null;
  const local = [c?.cidade, c?.estado].filter(Boolean).join(" — ");
  const contatos = c ? [
    { chave: "whatsapp", ordem: 0, Icone: MessageCircle, rotulo: "WhatsApp", valor: c.telefone, href: whatsapp, externo: true, vazio: "Não informado" },
    { chave: "cpf", ordem: 1, Icone: IdCard, rotulo: "CPF", valor: c.cpf, href: null, externo: false, vazio: "Não informado" },
    { chave: "email", ordem: 2, Icone: Mail, rotulo: "E-mail", valor: c.email || null, href: c.email ? `mailto:${c.email}` : null, externo: false, vazio: "Não informado" },
    { chave: "cidade", ordem: 3, Icone: MapPin, rotulo: "Cidade", valor: local || null, href: null, externo: false, vazio: "Não informada" },
  ] : [];
  // Linha do tempo: doses, contribuição, inscrição e cadastro, do mais recente ao mais antigo
  const linhaDoTempo = ([
    ...dosesTela.filter((d) => d.ml > 0 && d.em).map((d) => ({
      chave: `dose-${d.n}`, em: d.em!, Icone: GlassWater, cor: "text-white", fundo: "linear-gradient(180deg, #8a4b26 0%, #2a1308 100%)",
      titulo: `${d.n}ª dose`, detalhe: `${d.ml} ml`,
    })),
    ...(pago && p.pagoEm ? [{ chave: "pago", em: p.pagoEm, Icone: CheckCircle2, cor: "bg-emerald-100 text-emerald-700", fundo: undefined, titulo: "Contribuição confirmada", detalhe: p.valor != null ? formatoReal(p.valor) : undefined }] : []),
    ...(p.informadoEm ? [{ chave: "informado", em: p.informadoEm, Icone: Receipt, cor: "bg-amber-100 text-amber-700", fundo: undefined, titulo: "Contribuição informada", detalhe: undefined }] : []),
    { chave: "inscricao", em: p.inscritoEm, Icone: CalendarClock, cor: "bg-mata-100 text-mata-700", fundo: undefined, titulo: "Inscrição", detalhe: undefined },
    ...(c ? [{ chave: "cadastro", em: c.desde, Icone: UserRound, cor: "bg-stone-100 text-stone-600", fundo: undefined, titulo: "Cadastro", detalhe: undefined }] : []),
  ] as { chave: string; em: string; Icone: typeof Mail; cor: string; fundo?: string; titulo: string; detalhe?: string }[])
    .sort((a, b) => Date.parse(b.em) - Date.parse(a.em))
    .map((x) => ({ ...x, quando: x.chave === "cadastro" ? dia(x.em) : quando(x.em) }));
  const comprovante = p.comprovante ? `/api/comprovante/${p.comprovante}` : null;
  const inscricao = situacaoInscricao ?? (posicaoEspera ? "espera" : "confirmada");
  const chipInscricao =
    inscricao === "cancelada" ? (
      <span className="chip bg-stone-100 text-stone-600"><CalendarX2 size={12} /> Participação cancelada</span>
    ) : inscricao === "espera" ? (
      <span className="chip bg-amber-50 text-amber-800"><Hourglass size={12} /> Lista de espera{posicaoEspera ? ` · ${posicaoEspera}º` : ""}</span>
    ) : (
      <span className="chip bg-emerald-50 text-emerald-800"><CheckCircle2 size={12} /> Presença confirmada</span>
    );
  const cancelavel = dados.gerenciar && podeCancelar && inscricao !== "cancelada";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Inscrição de ${p.nome}`} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />

      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg animate-surgir flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        {/* Cabeçalho: quem é a pessoa e a situação da inscrição */}
        <header className="relative shrink-0 border-b border-stone-100 bg-gradient-to-b from-mata-50/80 to-white px-5 pt-5 pb-4 sm:px-6">
          <button type="button" onClick={fechar} className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
            <X size={17} />
          </button>
          {evento ? (
            <Link href={evento.href} title="Abrir o evento no painel" className="group flex items-center gap-3.5 pr-8">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mata-900 ring-1 ring-stone-200 transition group-hover:ring-mata-300">
                {evento.capa && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagem(evento.capa, 160)} width={56} height={56} decoding="async" alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-mata-600 uppercase">
                  Participação de {p.nome.split(" ")[0]} <ExternalLink size={11} className="transition group-hover:translate-x-0.5" />
                </p>
                <h3 className="line-clamp-2 text-base leading-snug font-semibold text-stone-900 group-hover:text-mata-700">{evento.titulo}</h3>
                <p className="mt-0.5 text-xs text-stone-500">{evento.quando}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{chipInscricao}</div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3.5 pr-8">
              {dados.linkPerfil !== false ? (
                <Link href={`/admin/participantes/${p.id}`} title="Ver perfil completo" aria-label={`Ver perfil completo de ${p.nome}`} className="shrink-0 rounded-full ring-offset-2 transition hover:ring-2 hover:ring-mata-300 focus-visible:ring-2 focus-visible:ring-mata-500">
                  <Avatar nome={p.nome} foto={p.foto} tamanho={56} />
                </Link>
              ) : (
                <Avatar nome={p.nome} foto={p.foto} tamanho={56} />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wider text-mata-600 uppercase">Inscrição do participante</p>
                <h3 className="flex min-w-0 items-center gap-1.5 text-lg font-semibold text-stone-900">
                  {editando ? (
                    <input name="nome" form={`dados-${p.id}`} defaultValue={p.nome} aria-label="Nome do participante" maxLength={128}
                      className="min-w-0 flex-1 rounded-md border-0 bg-mata-50/70 px-1 -mx-1 text-lg font-semibold text-stone-900 caret-mata-600 outline-none focus-visible:outline-none! focus:bg-mata-100/70" />
                  ) : (
                    <span className="truncate">{p.nome}</span>
                  )}
                  {c?.sexo && <IconeGenero genero={c.sexo} size={16} className="shrink-0" />}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {chipInscricao}
                </div>
              </div>
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Pela ficha do participante: só a inscrição e o atalho para o evento */}
          {evento ? (
            <Secao titulo="Inscrição">
              <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200/80">
                <Info Icone={CalendarClock} rotulo="Inscrição" valor={`Feita em ${quando(p.inscritoEm)}`} />
              </ul>
            </Secao>
          ) : (
          <section>
            <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Participante</h4>
            {c ? (
              <form
                id={`dados-${p.id}`}
                className={verDados ? "flex flex-col gap-2" : "flex items-center gap-2"}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editando) return;
                  const fd = new FormData(e.currentTarget);
                  iniciar(async () => {
                    const r = await informarDadosAction(dados.eventoId, p.id, fd);
                    setMsg(r);
                    if (r.ok) { setEditando(false); router.refresh(); }
                  });
                }}
              >
                {/* Os mesmos ícones: em linha (só ícones) ou em coluna com o dado ao lado; a troca anima (View Transitions).
                    Em "Informar dados", o próprio texto vira campo editável, sem mudar o layout. */}
                <ul className={verDados ? `divide-y divide-stone-100 rounded-2xl border transition-colors ${editando ? "border-mata-200" : "border-stone-200/80"}` : "flex items-center gap-2"}>
                  {contatos.map((x) => (
                    <li key={x.chave} className={verDados ? `flex items-center gap-3 px-3.5 py-2.5 transition-colors ${editando ? "cursor-text focus-within:bg-mata-50/60 hover:bg-stone-50/80" : ""}` : ""}>
                      <IconeContato Icone={x.Icone} rotulo={x.rotulo} valor={x.valor} href={editando ? null : x.href} externo={x.externo} nome={`contato-${x.chave}`}
                        aoInformar={dados.gerenciar && !editando ? informar : undefined} />
                      {verDados && (
                        <div className="min-w-0 flex-1 animate-surgir" style={{ animationDelay: editando ? undefined : `${150 + x.ordem * 60}ms` }}>
                          <p className="text-[11px] text-stone-400">{x.rotulo}</p>
                          {editando ? (
                            x.chave === "email" ? (
                              <input name="email" type="email" inputMode="email" autoComplete="off" defaultValue={c.email} placeholder="Informar e-mail" aria-label="E-mail" className={CAMPO_INLINE} />
                            ) : x.chave === "whatsapp" ? (
                              <InputTelefone name="telefone" defaultValue={c.telefone} placeholder="Informar WhatsApp" aria-label="WhatsApp" className={CAMPO_INLINE} autoFocus />
                            ) : x.chave === "cidade" ? (
                              <span className="flex items-center gap-1.5">
                                <input name="cidade" defaultValue={c.cidade || (!c.estado ? dados.localPadrao?.cidade : "") || ""} placeholder="Informar cidade" aria-label="Cidade" className={CAMPO_INLINE} />
                                <span className="text-stone-300">—</span>
                                <select name="estado" defaultValue={c.estado || (!c.cidade ? dados.localPadrao?.estado : "") || ""} aria-label="Estado" className="shrink-0 cursor-pointer appearance-none bg-transparent p-0 text-sm font-medium text-stone-800 outline-none focus-visible:outline-none!">
                                  <option value="">UF</option>
                                  {UFS.map((u) => <option key={u.uf} value={u.uf}>{u.uf}</option>)}
                                </select>
                              </span>
                            ) : (
                              <input name="cpf" inputMode="numeric" maxLength={14} defaultValue={c.cpf ?? ""} placeholder="Informar CPF" aria-label="CPF"
                                onChange={(e) => { e.currentTarget.value = mascararCpf(e.currentTarget.value); }} className={`${CAMPO_INLINE} tabular-nums`} />
                            )
                          ) : x.valor && x.href ? (
                            <a href={x.href} {...(x.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="block truncate text-sm font-medium text-stone-800 hover:text-mata-700 hover:underline">{x.valor}</a>
                          ) : (
                            <p className={`truncate text-sm font-medium ${x.valor ? "text-stone-800" : "text-stone-400"}`}>{x.valor ?? x.vazio}</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className={`flex items-center gap-2 ${verDados ? "justify-between" : "ml-auto"}`}>
                  {editando ? (
                    <>
                      <button type="button" disabled={pendente} onClick={() => setEditando(false)} className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50">Cancelar</button>
                      <button type="submit" disabled={pendente} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-mata-700 px-3.5 text-xs font-semibold text-white transition hover:bg-mata-800 disabled:opacity-60">
                        {pendente ? <><Carregando tamanho={13} /> Salvando…</> : <><Check size={14} aria-hidden /> Salvar dados</>}
                      </button>
                    </>
                  ) : (
                    <>
                      {verDados && dados.gerenciar && (
                        <button type="button" onClick={informar} className="inline-flex h-9 animate-surgir items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50">
                          <Pencil size={13} aria-hidden /> Informar dados
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={alternarDados}
                        aria-expanded={verDados}
                        style={{ viewTransitionName: "contato-botao" }}
                        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-mata-700 ring-1 ring-mata-200 transition hover:bg-mata-50"
                      >
                        {verDados ? "Ocultar dados" : "Exibir dados"} <ChevronDown size={14} className={`transition duration-300 ${verDados ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              </form>
            ) : (
              <p className="rounded-2xl border border-stone-200/80 px-3.5 py-3 text-sm text-stone-500">Dados de contato indisponíveis.</p>
            )}
          </section>
          )}

          {/* Dosagem: ml de cada dose consumida (só quem gerencia, pela lista do evento) */}
          {dados.gerenciar && !evento && inscricao !== "cancelada" && (
            <Dosagem salvarDoses={(l) => salvarDosesAction(dados.eventoId, p.inscricaoId, l)} inicial={p.doses ?? []} aoSalvar={setMsg} aoMudarDoses={setDosesTela} />
          )}

          {/* Contribuição: situação, comprovante e o que a coordenação pode marcar */}
          {dados.temContribuicao && (
            <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/40 shadow-sm">
              {/* Cabeçalho inteiro clicável: exibe ou oculta */}
              <button
                type="button"
                onClick={() => setContribAberta((v) => !v)}
                aria-expanded={contribAberta}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-emerald-100/40 active:bg-emerald-100/60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm shadow-emerald-700/25"><Receipt size={17} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-emerald-950">Contribuição</h4>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${situacao.cor}`}><situacao.Icone size={11} aria-hidden /> {situacao.rotulo}</span>
                    {p.usouPacote ? <span className="font-semibold text-emerald-900">Pacote{p.pacoteObs ? ` ${p.pacoteObs}` : ""}</span> : (p.valor ?? dados.valorContribuicao) != null && <span className="font-semibold tabular-nums text-emerald-900">{formatoReal((p.valor ?? dados.valorContribuicao) as number)}</span>}
                  </p>
                </div>
                <span className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition ${contribAberta ? "text-emerald-800 ring-1 ring-emerald-200" : "bg-emerald-700 text-white shadow-sm"}`}>
                  {contribAberta ? "Ocultar" : "Exibir"} <ChevronDown size={14} className={`transition duration-300 ${contribAberta ? "rotate-180" : ""}`} aria-hidden />
                </span>
              </button>
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${contribAberta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="min-h-0 overflow-hidden" inert={!contribAberta}>
                <div className="border-t border-emerald-100 px-3.5 pt-3 pb-3.5">
              <div className={`flex items-start gap-3 rounded-xl border-l-4 px-3.5 py-3 ${situacao.bloco}`}>
                <situacao.Icone size={20} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-bold">
                    {situacao.rotulo}
                    {(p.valor ?? dados.valorContribuicao) != null && (
                      <span className="text-base tabular-nums">{p.usouPacote ? `Pacote${p.pacoteObs ? ` ${p.pacoteObs}` : ""}` : formatoReal((p.valor ?? dados.valorContribuicao) as number)}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">{situacao.detalhe}</p>
                  {(p.informadoEm || (pago && p.pagoEm)) && (
                    <p className="mt-1.5 space-x-3 text-[11px] opacity-75">
                      {p.informadoEm && <span>Informada em {quando(p.informadoEm)}</span>}
                      {pago && p.pagoEm && <span>Confirmada em {quando(p.pagoEm)}</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Comprovante: miniatura com ampliar e um botão que abre as opções */}
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-2.5">
                {comprovante ? (
                  <button type="button" onClick={() => setAmpliado(true)} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200" aria-label="Ampliar comprovante">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={comprovante} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                    <span className="absolute right-0.5 bottom-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition group-hover:bg-black/75"><ZoomIn size={11} aria-hidden /></span>
                  </button>
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-400"><FileImage size={24} strokeWidth={1.6} aria-hidden /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">Comprovante</p>
                  <p className="text-xs text-stone-500">{comprovante ? "Anexado" : "Nenhum anexado"}</p>
                </div>
                {dados.gerenciar && (
                  <button
                    type="button"
                    onClick={() => setComprovanteAberto(true)}
                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${comprovante ? "text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50" : "bg-emerald-700 text-white hover:bg-emerald-800"}`}
                  >
                    {comprovante ? <><Settings2 size={13} aria-hidden /> Gerenciar</> : <><ImagePlus size={13} aria-hidden /> Anexar</>}
                  </button>
                )}
              </div>
              {comprovanteAberto && (
                <ModalComprovante
                  eventoId={dados.eventoId}
                  inscricaoId={p.inscricaoId}
                  comprovanteUrl={comprovante}
                  aoSalvar={setMsg}
                  fechar={() => setComprovanteAberto(false)}
                />
              )}

              {dados.gerenciar && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-emerald-900/70">Marcar a contribuição como</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Situação da contribuição">
                    <Opcao tom="emerald" ativa={pago || pedirValor} editavel={pago} Icone={CheckCircle2} rotulo="Confirmada" disabled={pendente} aoEscolher={() => { setMsg(undefined); setUsouPacote(!!p.usouPacote); setPedirValor(true); }} />
                    <Opcao tom="sky" ativa={p.pagamento === "isento"} Icone={ShieldCheck} rotulo="Isento" disabled={pendente} aoEscolher={() => rodar(() => isentarPagamentoAction(dados.eventoId, p.inscricaoId))} />
                    <Opcao tom="yellow" ativa={p.pagamento === "pendente"} Icone={Undo2} rotulo="Pendente" disabled={pendente} aoEscolher={() => rodar(() => reabrirPagamentoAction(dados.eventoId, p.inscricaoId))} />
                  </div>
                  {/* Confirmar pede o valor recebido (já vem preenchido com o valor informado ou o padrão do Instituto) */}
                  {pedirValor && (
                    <form
                      className="mt-3 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        iniciar(async () => {
                          const r = usouPacote
                            ? await confirmarPagamentoAction(dados.eventoId, p.inscricaoId, null, fd.get("pacote_obs"))
                            : await confirmarPagamentoAction(dados.eventoId, p.inscricaoId, fd.get("valor_recebido"));
                          setMsg(r);
                          if (r.ok) setPedirValor(false);
                        });
                      }}
                    >
                      <div className="flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`valor-${p.inscricaoId}`} className="mb-1 block text-xs font-medium text-emerald-900">{usouPacote ? "Observação do pacote" : "Valor recebido (R$)"}</label>
                          {usouPacote ? (
                            <input key="pacote" id={`valor-${p.inscricaoId}`} name="pacote_obs" type="text" maxLength={30} autoComplete="off" autoFocus placeholder="ex.: 2/4 1" defaultValue={p.pacoteObs ?? ""} className="campo h-10 text-sm" />
                          ) : (
                            <input
                              key="valor"
                              id={`valor-${p.inscricaoId}`}
                              name="valor_recebido"
                              inputMode="decimal"
                              autoFocus
                              defaultValue={valorSugerido != null ? valorSugerido.toFixed(2).replace(".", ",") : ""}
                              placeholder="150,00"
                              className="campo h-10 text-sm tabular-nums"
                            />
                          )}
                        </div>
                        <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 select-none">
                          <input type="checkbox" checked={usouPacote} onChange={(e) => setUsouPacote(e.target.checked)} className="h-4 w-4 accent-emerald-700" />
                          Usou pacote
                        </label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-secundario h-10" disabled={pendente} onClick={() => { setPedirValor(false); setUsouPacote(false); }}>Cancelar</button>
                        <button type="submit" className="btn-primario h-10" disabled={pendente}>Confirmar</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
                </div>
                </div>
              </div>
            </section>
          )}

          {!evento && linhaDoTempo.length > 0 && (
            <section className="border-t border-stone-100 pt-4">
              <h4 className="mb-3 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Histórico</h4>
              {/* Mais recente no topo; de baixo para cima, na ordem em que aconteceu (o cadastro fica por último) */}
              <ol className="relative space-y-3.5 before:absolute before:top-3 before:bottom-3 before:left-[13px] before:w-px before:bg-stone-200">
                {linhaDoTempo.map((x) => (
                  <li key={x.chave} className="relative flex items-center gap-3">
                    <span className={`relative z-10 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full ring-4 ring-white ${x.cor}`} style={x.fundo ? { background: x.fundo } : undefined}>
                      <x.Icone size={13} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] leading-tight">
                      <span className="block font-semibold text-stone-800">{x.titulo}</span>
                      {x.detalhe && <span className="block text-xs text-stone-500">{x.detalhe}</span>}
                    </span>
                    <time dateTime={x.em} className="shrink-0 text-xs text-stone-500 tabular-nums">{x.quando}</time>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Rodapé: cancelar a participação (só sem contribuição confirmada) */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/70 px-5 py-3.5 sm:px-6">
          {/* Retorno da última ação: aqui fica sempre à vista, mesmo com o conteúdo rolado */}
          {pendente ? (
            <span className="flex items-center gap-2 text-xs text-stone-500"><Carregando tamanho={14} /> Salvando…</span>
          ) : msg ? (
            <span role="status" className={`flex min-w-0 items-center gap-1.5 text-xs font-semibold ${msg.erro ? "text-red-700" : "text-emerald-700"}`}>
              {msg.erro ? <X size={14} className="shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />} {msg.erro ?? msg.ok}
            </span>
          ) : <span />}
          {cancelavel && (pago ? (
            <span className="flex items-center gap-1.5 text-right text-xs text-stone-500">
              <Lock size={13} className="shrink-0" /> Contribuição confirmada: para cancelar, marque como pendente.
            </span>
          ) : (
            <button
              type="button"
              disabled={pendente}
              onClick={() => setConfirmando(true)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-60"
            >
              <CalendarX2 size={16} /> Cancelar inscrição
            </button>
          ))}
        </footer>

        {/* Confirmação do cancelamento, no lugar do rodapé (um balão seria cortado pela borda do modal) */}
        {confirmando && (
          <div role="alertdialog" aria-label="Confirmar cancelamento" className="absolute inset-x-0 bottom-0 z-10 animate-surgir border-t border-red-100 bg-white px-5 py-4 shadow-[0_-12px_32px_-12px_rgb(0_0_0/0.25)] sm:px-6">
            <p className="text-sm font-semibold text-stone-900">Cancelar a participação de {p.nome}?</p>
            <p className="mt-0.5 text-xs text-stone-500">Se houver lista de espera, a vaga passa para a próxima pessoa.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="btn-secundario" disabled={pendente} onClick={() => setConfirmando(false)}>Voltar</button>
              <button
                type="button"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await removerParticipanteAction(dados.eventoId, p.id);
                    if (r.erro) { setMsg(r); setConfirmando(false); }
                    else aoCancelar(r);
                  })
                }
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {pendente ? <><Carregando tamanho={14} /> Cancelando…</> : "Sim, cancelar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comprovante ampliado */}
      {ampliado && comprovante && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/90 p-4" onClick={() => setAmpliado(false)}>
          <button type="button" className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Fechar comprovante">
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={comprovante} alt={`Comprovante de ${p.nome}`} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <a href={comprovante} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="absolute bottom-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
            Abrir original <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>,
    document.body,
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">{titulo}</h4>
      {children}
    </section>
  );
}

function Info({ Icone, rotulo, valor, href, externo }: { Icone: typeof Mail; rotulo: string; valor: string; href?: string | null; externo?: boolean }) {
  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500"><Icone size={15} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-stone-400">{rotulo}</p>
        {href ? (
          <a href={href} {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="block truncate text-sm font-medium text-stone-800 hover:text-mata-700 hover:underline">{valor}</a>
        ) : (
          <p className="truncate text-sm font-medium text-stone-800">{valor}</p>
        )}
      </div>
    </li>
  );
}

/** Ícone de um dado de contato: destacado quando existe (e clicável se tiver link), apagado quando falta. */
function IconeContato({ Icone, rotulo, valor, href, externo, nome, aoInformar }: { Icone: typeof Mail; rotulo: string; valor: string | null; href?: string | null; externo?: boolean; /** view-transition-name: o mesmo ícone se move entre linha e coluna. */ nome?: string; /** Sem o dado: tocar no ícone abre o formulário para informar. */ aoInformar?: () => void }) {
  const tem = !!valor;
  const classe = `grid h-10 w-10 place-items-center rounded-xl transition ${tem ? "bg-mata-50 text-mata-700 ring-1 ring-mata-200" : "bg-stone-50 text-stone-300 ring-1 ring-stone-100"}`;
  const dica = tem ? `${rotulo}: ${valor}` : `${rotulo}: não informado`;
  if (!tem && aoInformar) {
    return (
      <button type="button" onClick={aoInformar} className={`${classe} shrink-0 hover:bg-stone-100 hover:text-stone-500`} title={`${rotulo}: não informado. Toque para informar.`} aria-label={`Informar ${rotulo}`} style={{ viewTransitionName: nome }}>
        <Icone size={17} />
      </button>
    );
  }
  return tem && href ? (
    <a href={href} {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${classe} shrink-0 hover:bg-mata-100`} title={dica} aria-label={dica} style={{ viewTransitionName: nome }}><Icone size={17} /></a>
  ) : (
    <span className={`${classe} shrink-0`} title={dica} aria-label={dica} role="img" style={{ viewTransitionName: nome }}><Icone size={17} /></span>
  );
}

/**
 * Opções do comprovante num modal: escolher da galeria ou tirar a foto na hora (câmera traseira), com
 * prévia antes de enviar. A imagem é reduzida no navegador (useImagem). Com comprovante, também amplia.
 */
function ModalComprovante({ eventoId, inscricaoId, comprovanteUrl, aoSalvar, fechar }: {
  eventoId: string; inscricaoId: string; comprovanteUrl: string | null; aoSalvar: (r: Resultado) => void; fechar: () => void;
}) {
  const temComprovante = !!comprovanteUrl;
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const { local, erro, otimizando, escolher } = useImagem("comprovante");
  const galeria = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  // Esc fecha só este modal (captura antes do listener do modal da inscrição)
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); fechar(); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [fechar]);

  function descartar() {
    for (const i of [galeria.current, camera.current]) if (i) { i.value = ""; escolher(i, null); }
  }
  function aoEscolher(i: HTMLInputElement) {
    const outro = i === galeria.current ? camera.current : galeria.current;
    if (outro) outro.value = "";
    escolher(i, i.files?.[0]);
  }
  function enviar() {
    const arquivo = galeria.current?.files?.[0] ?? camera.current?.files?.[0];
    if (!arquivo) return;
    const fd = new FormData();
    fd.set("comprovante", arquivo);
    iniciar(async () => {
      const r = await anexarComprovanteAction(eventoId, inscricaoId, fd);
      aoSalvar(r);
      if (r.ok) { router.refresh(); fechar(); }
    });
  }

  function excluir() {
    iniciar(async () => {
      const r = await excluirComprovanteAction(eventoId, inscricaoId);
      aoSalvar(r);
      if (r.ok) { router.refresh(); fechar(); }
      else setConfirmaExcluir(false);
    });
  }

  const opcao = "flex min-h-14 w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 text-left text-sm font-semibold text-stone-800 transition hover:border-emerald-300 hover:bg-emerald-50/60 active:scale-[0.99]";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Comprovante" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />
      <div className="relative z-10 w-full max-w-sm animate-surgir overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-stone-900">Comprovante</h3>
          <button type="button" onClick={fechar} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"><X size={17} /></button>
        </header>

        <input ref={galeria} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => aoEscolher(e.currentTarget)} />
        <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => aoEscolher(e.currentTarget)} />

        <div className="space-y-2.5 px-5 pb-5">
          {local ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={local} alt="Prévia do comprovante" className="max-h-64 w-full rounded-xl bg-stone-50 object-contain ring-1 ring-stone-200" />
              <p className="text-center text-xs font-medium text-emerald-800">{otimizando ? "Preparando a imagem…" : "Pronto para enviar"}</p>
              <div className="flex gap-2">
                <button type="button" disabled={enviando} onClick={descartar} className="btn-secundario h-11 flex-1">Descartar</button>
                <button type="button" disabled={enviando || otimizando} onClick={enviar} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60">
                  {enviando ? <><Carregando tamanho={14} /> Enviando…</> : <><Check size={15} aria-hidden /> Enviar</>}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Já mostra o comprovante inteiro */}
              {comprovanteUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comprovanteUrl} alt="Comprovante anexado" className="max-h-[50dvh] w-full rounded-xl bg-stone-50 object-contain ring-1 ring-stone-200" />
              )}
              <button type="button" onClick={() => galeria.current?.click()} className={opcao}>
                <ImagePlus size={18} className="shrink-0 text-emerald-600" aria-hidden /> {temComprovante ? "Trocar pela galeria" : "Escolher da galeria"}
              </button>
              <button type="button" onClick={() => camera.current?.click()} className={opcao}>
                <Camera size={18} className="shrink-0 text-emerald-600" aria-hidden /> {temComprovante ? "Trocar tirando foto" : "Tirar foto"}
              </button>
              {temComprovante && (confirmaExcluir ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
                  <p className="min-w-0 flex-1 text-xs font-semibold text-red-800">Excluir o comprovante?</p>
                  <button type="button" disabled={enviando} onClick={() => setConfirmaExcluir(false)} className="btn-secundario h-9">Não</button>
                  <button type="button" disabled={enviando} onClick={excluir} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                    {enviando ? <Carregando tamanho={13} /> : <Trash2 size={14} aria-hidden />} Excluir
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmaExcluir(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-red-700 transition hover:bg-red-50">
                  <Trash2 size={16} aria-hidden /> Excluir comprovante
                </button>
              ))}
            </>
          )}
          {erro && <p role="alert" className="text-xs font-medium text-red-700">{erro}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

const TOM_OPCAO = {
  emerald: { ativa: "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600", hover: "hover:border-emerald-300 hover:bg-emerald-50/70 hover:text-emerald-800" },
  sky: { ativa: "border-sky-500 bg-sky-50 text-sky-800 ring-1 ring-sky-500", hover: "hover:border-sky-300 hover:bg-sky-50/70 hover:text-sky-800" },
  yellow: { ativa: "border-yellow-500 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-500", hover: "hover:border-yellow-300 hover:bg-yellow-50/70 hover:text-yellow-800" },
} as const;

function Opcao({ ativa, Icone, rotulo, disabled, aoEscolher, tom, editavel = false }: { ativa: boolean; Icone: typeof Mail; rotulo: string; disabled: boolean; aoEscolher: () => void; tom: keyof typeof TOM_OPCAO; /** Já marcada, mas tocar de novo edita (lápis no canto). */ editavel?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      disabled={disabled || (ativa && !editavel)}
      onClick={aoEscolher}
      className={`relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition disabled:cursor-default ${
        ativa ? TOM_OPCAO[tom].ativa : `border-stone-200 bg-white text-stone-600 disabled:opacity-60 ${TOM_OPCAO[tom].hover}`
      }`}
    >
      <Icone size={16} /> {rotulo}
      {editavel && <Pencil size={10} aria-hidden className="absolute top-1.5 right-1.5 opacity-70" />}
    </button>
  );
}
