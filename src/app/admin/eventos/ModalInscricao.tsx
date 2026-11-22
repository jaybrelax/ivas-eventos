"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import Link from "next/link";
import {
  CalendarClock, CalendarX2, CheckCircle2, ChevronDown, ExternalLink, IdCard, FileImage, Hourglass, Lock, Mail, MapPin,
  MessageCircle, Receipt, ShieldCheck, Undo2, UserRound, X, ZoomIn,
} from "lucide-react";
import type { SituacaoInscricao, SituacaoPagamento } from "@/lib/types";
import { urlImagem } from "@/lib/links";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { Carregando } from "@/components/ui";
import { confirmarPagamentoAction, isentarPagamentoAction, reabrirPagamentoAction, removerParticipanteAction } from "./participantes-actions";
import type { DadosParticipantes, ItemParticipanteInscrito } from "./Participantes";

type Resultado = { ok?: string; erro?: string };

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso))
    .replace(",", " às");
const dia = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

/** Situação da contribuição como a coordenação vê (inclui o que o próprio participante avisou). */
const SITUACAO_CONTRIBUICAO: Record<SituacaoPagamento, { rotulo: string; detalhe: string; cor: string; Icone: typeof CheckCircle2 }> = {
  pendente: { rotulo: "Pendente", detalhe: "O participante ainda não avisou a contribuição.", cor: "bg-stone-100 text-stone-700 ring-stone-200", Icone: Hourglass },
  informado: { rotulo: "Informada", detalhe: "O participante avisou que contribuiu. Confira o comprovante e confirme.", cor: "bg-amber-50 text-amber-800 ring-amber-200", Icone: Receipt },
  na_hora: { rotulo: "Na hora", detalhe: "O participante vai contribuir no dia do ritual.", cor: "bg-ouro-100 text-ouro-700 ring-ouro-200", Icone: CalendarClock },
  pago: { rotulo: "Confirmada", detalhe: "Contribuição confirmada pela coordenação.", cor: "bg-emerald-50 text-emerald-800 ring-emerald-200", Icone: CheckCircle2 },
  isento: { rotulo: "Isento", detalhe: "Participação isenta de contribuição.", cor: "bg-sky-50 text-sky-800 ring-sky-200", Icone: ShieldCheck },
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
  dados: Pick<DadosParticipantes, "eventoId" | "temContribuicao" | "valorContribuicao" | "gerenciar">;
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
  const [confirmando, setConfirmando] = useState(false);
  const [pedirValor, setPedirValor] = useState(false);
  const [verDados, setVerDados] = useState(false);
  // Contribuição já resolvida (confirmada ou isenta) começa recolhida; pendente/informada começa aberta
  const [contribAberta, setContribAberta] = useState(p.pagamento !== "pago" && p.pagamento !== "isento");
  // Os ícones "viajam" da linha para a coluna: View Transitions quando o navegador suporta
  const alternarDados = () => {
    const trocar = () => flushSync(() => setVerDados((v) => !v));
    const doc = document as Document & { startViewTransition?: (fn: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(trocar);
    else trocar();
  };
  const rodar = (fn: () => Promise<Resultado>) => iniciar(async () => { setPedirValor(false); setMsg(await fn()); });
  const valorSugerido = p.valor ?? dados.valorContribuicao ?? null;

  useEffect(() => {
    // Esc fecha primeiro o que estiver por cima: comprovante ampliado, confirmação e, por fim, o modal
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (ampliado ? setAmpliado(false) : confirmando ? setConfirmando(false) : pedirValor ? setPedirValor(false) : fechar());
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = rolagem;
    };
  }, [fechar, ampliado, confirmando, pedirValor]);

  const c = p.contato;
  const situacao = SITUACAO_CONTRIBUICAO[p.pagamento];
  const pago = p.pagamento === "pago";
  const whatsapp = c?.telefone ? `https://wa.me/${(c.telefone.replace(/\D/g, "").startsWith("55") ? "" : "55") + c.telefone.replace(/\D/g, "")}` : null;
  const local = [c?.cidade, c?.estado].filter(Boolean).join(" — ");
  const contatos = c ? [
    { chave: "email", ordem: 0, Icone: Mail, rotulo: "E-mail", valor: c.email || null, href: c.email ? `mailto:${c.email}` : null, externo: false, vazio: "Não informado" },
    { chave: "whatsapp", ordem: 1, Icone: MessageCircle, rotulo: "WhatsApp", valor: c.telefone, href: whatsapp, externo: true, vazio: "Não informado" },
    { chave: "cidade", ordem: 2, Icone: MapPin, rotulo: "Cidade", valor: local || null, href: null, externo: false, vazio: "Não informada" },
    { chave: "cpf", ordem: 3, Icone: IdCard, rotulo: "CPF", valor: c.cpf, href: null, externo: false, vazio: "Não informado" },
  ] : [];
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
              <Link href={`/admin/participantes/${p.id}`} title="Ver perfil completo" aria-label={`Ver perfil completo de ${p.nome}`} className="shrink-0 rounded-full ring-offset-2 transition hover:ring-2 hover:ring-mata-300 focus-visible:ring-2 focus-visible:ring-mata-500">
                <Avatar nome={p.nome} foto={p.foto} tamanho={56} />
              </Link>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wider text-mata-600 uppercase">Inscrição do participante</p>
                <h3 className="flex min-w-0 items-center gap-1.5 text-lg font-semibold text-stone-900">
                  <span className="truncate">{p.nome}</span>
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
              <div className={verDados ? "flex flex-col gap-2" : "flex items-center gap-2"}>
                {/* Os mesmos ícones: em linha (só ícones) ou em coluna com o dado ao lado; a troca anima (View Transitions) */}
                <ul className={verDados ? "divide-y divide-stone-100 rounded-2xl border border-stone-200/80" : "flex items-center gap-2"}>
                  {contatos.map((x) => (
                    <li key={x.chave} className={verDados ? "flex items-center gap-3 px-3.5 py-2.5" : ""}>
                      <IconeContato Icone={x.Icone} rotulo={x.rotulo} valor={x.valor} href={x.href} externo={x.externo} nome={`contato-${x.chave}`} />
                      {verDados && (
                        <div className="min-w-0 flex-1 animate-surgir" style={{ animationDelay: `${150 + x.ordem * 60}ms` }}>
                          <p className="text-[11px] text-stone-400">{x.rotulo}</p>
                          {x.valor && x.href ? (
                            <a href={x.href} {...(x.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="block truncate text-sm font-medium text-stone-800 hover:text-mata-700 hover:underline">{x.valor}</a>
                          ) : (
                            <p className={`truncate text-sm font-medium ${x.valor ? "text-stone-800" : "text-stone-400"}`}>{x.valor ?? x.vazio}</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={alternarDados}
                  aria-expanded={verDados}
                  style={{ viewTransitionName: "contato-botao" }}
                  className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-mata-700 ring-1 ring-mata-200 transition hover:bg-mata-50 ${verDados ? "self-end" : "ml-auto"}`}
                >
                  {verDados ? "Ocultar dados" : "Exibir dados"} <ChevronDown size={14} className={`transition duration-300 ${verDados ? "rotate-180" : ""}`} aria-hidden />
                </button>
              </div>
            ) : (
              <p className="rounded-2xl border border-stone-200/80 px-3.5 py-3 text-sm text-stone-500">Dados de contato indisponíveis.</p>
            )}
          </section>
          )}

          {/* Contribuição: situação, comprovante e o que a coordenação pode marcar */}
          {dados.temContribuicao && (
            <section>
              <button
                type="button"
                onClick={() => setContribAberta((v) => !v)}
                aria-expanded={contribAberta}
                className="mb-2 flex w-full items-center gap-2 text-left"
              >
                <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Contribuição</span>
                {!contribAberta && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${situacao.cor}`}>
                    <situacao.Icone size={11} aria-hidden /> {situacao.rotulo}
                    {(p.valor ?? dados.valorContribuicao) != null && <span className="tabular-nums">· {formatoReal((p.valor ?? dados.valorContribuicao) as number)}</span>}
                  </span>
                )}
                <ChevronDown size={15} className={`ml-auto text-stone-400 transition duration-300 ${contribAberta ? "rotate-180" : ""}`} aria-hidden />
              </button>
              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${contribAberta ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="min-h-0 overflow-hidden" inert={!contribAberta}>
              <div className={`flex items-start gap-3 rounded-2xl px-3.5 py-3 ring-1 ${situacao.cor}`}>
                <situacao.Icone size={20} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-bold">
                    {situacao.rotulo}
                    {(p.valor ?? dados.valorContribuicao) != null && (
                      <span className="text-base tabular-nums">{formatoReal((p.valor ?? dados.valorContribuicao) as number)}</span>
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

              {/* Comprovante anexado */}
              <div className="mt-3">
                {comprovante ? (
                  <div className="flex items-center gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-2.5">
                    {/* Miniatura quadrada: mostra sempre o topo da imagem, qualquer que seja a proporção */}
                    <button type="button" onClick={() => setAmpliado(true)} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200" aria-label="Ampliar comprovante">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={comprovante} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition group-hover:scale-105" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                        <FileImage size={15} className="shrink-0 text-mata-600" /> Comprovante anexado
                      </p>
                      <button
                        type="button"
                        onClick={() => setAmpliado(true)}
                        className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-mata-700 ring-1 ring-mata-200 transition hover:bg-mata-50"
                      >
                        <ZoomIn size={13} /> Ampliar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 rounded-2xl border border-dashed border-stone-200 px-3.5 py-3 text-xs text-stone-500">
                    <FileImage size={15} className="shrink-0 text-stone-400" /> Nenhum comprovante anexado.
                  </p>
                )}
              </div>

              {dados.gerenciar && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-stone-500">Marcar a contribuição como</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Situação da contribuição">
                    <Opcao ativa={pago || pedirValor} Icone={CheckCircle2} rotulo="Confirmada" disabled={pendente || pago} aoEscolher={() => { setMsg(undefined); setPedirValor(true); }} />
                    <Opcao ativa={p.pagamento === "isento"} Icone={ShieldCheck} rotulo="Isento" disabled={pendente} aoEscolher={() => rodar(() => isentarPagamentoAction(dados.eventoId, p.inscricaoId))} />
                    <Opcao ativa={p.pagamento === "pendente"} Icone={Undo2} rotulo="Pendente" disabled={pendente} aoEscolher={() => rodar(() => reabrirPagamentoAction(dados.eventoId, p.inscricaoId))} />
                  </div>
                  {/* Confirmar pede o valor recebido (já vem preenchido com o valor informado ou o padrão do Instituto) */}
                  {pedirValor && !pago && (
                    <form
                      className="mt-3 flex items-end gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const valor = new FormData(e.currentTarget).get("valor_recebido");
                        iniciar(async () => {
                          const r = await confirmarPagamentoAction(dados.eventoId, p.inscricaoId, valor);
                          setMsg(r);
                          if (r.ok) setPedirValor(false);
                        });
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`valor-${p.inscricaoId}`} className="mb-1 block text-xs font-medium text-emerald-900">Valor recebido (R$)</label>
                        <input
                          id={`valor-${p.inscricaoId}`}
                          name="valor_recebido"
                          inputMode="decimal"
                          autoFocus
                          defaultValue={valorSugerido != null ? valorSugerido.toFixed(2).replace(".", ",") : ""}
                          placeholder="150,00"
                          className="campo h-10 text-sm tabular-nums"
                        />
                      </div>
                      <button type="button" className="btn-secundario h-10" disabled={pendente} onClick={() => setPedirValor(false)}>Voltar</button>
                      <button type="submit" className="btn-primario h-10" disabled={pendente}>Confirmar</button>
                    </form>
                  )}
                </div>
              )}
                </div>
              </div>
            </section>
          )}

          {!evento && (
            <div className="space-y-1.5 border-t border-stone-100 pt-3.5 text-[13px] text-stone-500">
              {c && <p className="flex items-center gap-2"><UserRound size={15} className="shrink-0 text-stone-400" aria-hidden /> Cadastro desde <span className="font-medium text-stone-700">{dia(c.desde)}</span></p>}
              <p className="flex items-center gap-2"><CalendarClock size={15} className="shrink-0 text-stone-400" aria-hidden /> Inscrição em <span className="font-medium text-stone-700">{quando(p.inscritoEm)}</span></p>
            </div>
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
function IconeContato({ Icone, rotulo, valor, href, externo, nome }: { Icone: typeof Mail; rotulo: string; valor: string | null; href?: string | null; externo?: boolean; /** view-transition-name: o mesmo ícone se move entre linha e coluna. */ nome?: string }) {
  const tem = !!valor;
  const classe = `grid h-10 w-10 place-items-center rounded-xl transition ${tem ? "bg-mata-50 text-mata-700 ring-1 ring-mata-200" : "bg-stone-50 text-stone-300 ring-1 ring-stone-100"}`;
  const dica = tem ? `${rotulo}: ${valor}` : `${rotulo}: não informado`;
  return tem && href ? (
    <a href={href} {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${classe} shrink-0 hover:bg-mata-100`} title={dica} aria-label={dica} style={{ viewTransitionName: nome }}><Icone size={17} /></a>
  ) : (
    <span className={`${classe} shrink-0`} title={dica} aria-label={dica} role="img" style={{ viewTransitionName: nome }}><Icone size={17} /></span>
  );
}

function Opcao({ ativa, Icone, rotulo, disabled, aoEscolher }: { ativa: boolean; Icone: typeof Mail; rotulo: string; disabled: boolean; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      disabled={disabled || ativa}
      onClick={aoEscolher}
      className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition disabled:cursor-default ${
        ativa ? "border-mata-600 bg-mata-50 text-mata-800 ring-1 ring-mata-600" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
      }`}
    >
      <Icone size={16} /> {rotulo}
    </button>
  );
}
