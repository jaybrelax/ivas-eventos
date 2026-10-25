"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CalendarClock, CalendarX2, CheckCircle2, ExternalLink, FileImage, Hourglass, Lock, Mail, MapPin,
  MessageCircle, Receipt, ShieldCheck, Undo2, UserRound, X, ZoomIn,
} from "lucide-react";
import type { SituacaoPagamento } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
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

/**
 * Modal da inscrição de um participante no evento: quem é a pessoa (contato e cadastro),
 * a situação da contribuição (com o comprovante anexado) e o cancelamento da participação.
 */
export function ModalInscricao({
  p, posicaoEspera, dados, fechar, aoCancelar,
}: {
  p: ItemParticipanteInscrito;
  /** Posição na lista de espera (sem valor: está confirmado). */
  posicaoEspera?: number;
  dados: DadosParticipantes;
  fechar: () => void;
  /** Depois de cancelar, a linha some da lista: o modal fecha e o aviso aparece no cartão. */
  aoCancelar: (r: Resultado) => void;
}) {
  const [msg, setMsg] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();
  const [ampliado, setAmpliado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const rodar = (fn: () => Promise<Resultado>) => iniciar(async () => setMsg(await fn()));

  useEffect(() => {
    // Esc fecha primeiro o que estiver por cima: comprovante ampliado, confirmação e, por fim, o modal
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (ampliado ? setAmpliado(false) : confirmando ? setConfirmando(false) : fechar());
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = rolagem;
    };
  }, [fechar, ampliado, confirmando]);

  const c = p.contato;
  const situacao = SITUACAO_CONTRIBUICAO[p.pagamento];
  const pago = p.pagamento === "pago";
  const whatsapp = c?.telefone ? `https://wa.me/${(c.telefone.replace(/\D/g, "").startsWith("55") ? "" : "55") + c.telefone.replace(/\D/g, "")}` : null;
  const local = [c?.cidade, c?.estado].filter(Boolean).join(" — ");
  const comprovante = p.comprovante ? `/api/comprovante/${p.comprovante}` : null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Inscrição de ${p.nome}`} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />

      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg animate-surgir flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        {/* Cabeçalho: quem é a pessoa e a situação da inscrição */}
        <header className="relative shrink-0 border-b border-stone-100 bg-gradient-to-b from-mata-50/80 to-white px-5 pt-5 pb-4 sm:px-6">
          <button type="button" onClick={fechar} className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
            <X size={17} />
          </button>
          <div className="flex items-center gap-3.5 pr-8">
            <Avatar nome={p.nome} foto={p.foto} tamanho={56} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-mata-600 uppercase">Inscrição do participante</p>
              <h3 className="truncate text-lg font-semibold text-stone-900">{p.nome}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {posicaoEspera ? (
                  <span className="chip bg-amber-50 text-amber-800"><Hourglass size={12} /> Lista de espera · {posicaoEspera}º</span>
                ) : (
                  <span className="chip bg-emerald-50 text-emerald-800"><CheckCircle2 size={12} /> Presença confirmada</span>
                )}
                {c?.sexo && <span className="chip bg-stone-100 text-stone-600">{c.sexo === "feminino" ? "Feminino" : "Masculino"}</span>}
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Participante */}
          <Secao titulo="Participante">
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200/80">
              {c ? (
                <>
                  <Info Icone={Mail} rotulo="E-mail" valor={c.email} href={`mailto:${c.email}`} />
                  <Info Icone={MessageCircle} rotulo="WhatsApp" valor={c.telefone ?? "Não informado"} href={whatsapp} externo />
                  <Info Icone={MapPin} rotulo="Cidade" valor={local || "Não informada"} />
                  <Info Icone={UserRound} rotulo="Cadastro" valor={`Desde ${dia(c.desde)}`} />
                </>
              ) : (
                <li className="px-3.5 py-3 text-sm text-stone-500">Dados de contato indisponíveis.</li>
              )}
              <Info Icone={CalendarClock} rotulo="Inscrição" valor={`Feita em ${quando(p.inscritoEm)}`} />
            </ul>
            <Link href={`/admin/participantes/${p.id}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-mata-700 hover:underline">
              Ver perfil completo <ExternalLink size={13} />
            </Link>
          </Secao>

          {/* Contribuição: situação, comprovante e o que a coordenação pode marcar */}
          {dados.temContribuicao && (
            <Secao titulo="Contribuição">
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
                  <div className="overflow-hidden rounded-2xl border border-stone-200/80">
                    <button type="button" onClick={() => setAmpliado(true)} className="group relative block w-full bg-stone-50" aria-label="Ampliar comprovante">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={comprovante} alt={`Comprovante de ${p.nome}`} className="mx-auto max-h-60 w-auto object-contain" />
                      <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-stone-900/70 px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 backdrop-blur transition group-hover:opacity-100">
                        <ZoomIn size={12} /> Ampliar
                      </span>
                    </button>
                    <div className="flex items-center justify-between gap-2 border-t border-stone-100 px-3.5 py-2 text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-stone-600"><FileImage size={14} /> Comprovante anexado</span>
                      <a href={comprovante} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-mata-700 hover:underline">
                        Abrir original <ExternalLink size={12} />
                      </a>
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
                    <Opcao ativa={pago} Icone={CheckCircle2} rotulo="Confirmada" disabled={pendente} aoEscolher={() => rodar(() => confirmarPagamentoAction(dados.eventoId, p.inscricaoId))} />
                    <Opcao ativa={p.pagamento === "isento"} Icone={ShieldCheck} rotulo="Isento" disabled={pendente} aoEscolher={() => rodar(() => isentarPagamentoAction(dados.eventoId, p.inscricaoId))} />
                    <Opcao ativa={p.pagamento === "pendente"} Icone={Undo2} rotulo="Pendente" disabled={pendente} aoEscolher={() => rodar(() => reabrirPagamentoAction(dados.eventoId, p.inscricaoId))} />
                  </div>
                </div>
              )}
            </Secao>
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
          {dados.gerenciar && (pago ? (
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
          <img src={comprovante} alt={`Comprovante de ${p.nome}`} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
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
