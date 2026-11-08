"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CalendarCheck, FileText, ShieldCheck, ShieldPlus } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { cancelarPresencaReuniao, ingressarNaReuniao, justificarAusenciaReuniao } from "../../actions";
import { Folha } from "../../Folha";
import { vibrar } from "../../nativo";

const MIN = 30;
const MAX = 200;

type Props = {
  eventoId: string;
  situacao: "confirmada" | "justificada" | null;
  justificativa: string | null;
  jaComecou: boolean;
  prazoPassou: boolean;
  prazoTexto: string;
};

/** Barra fixa do guardião na reunião: marcar presença, cancelar (até o prazo) ou justificar a ausência. */
export function AcaoReuniao({ eventoId, situacao, justificativa, jaComecou, prazoPassou, prazoTexto }: Props) {
  const [pendente, iniciar] = useTransition();
  const [justificando, setJustificando] = useState(false);
  // Etapa 1: escrever a justificativa. Etapa 2: ler o termo, marcar a ciência e enviar.
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [aceito, setAceito] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [texto, setTexto] = useState(justificativa ?? "");
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>, aoOk?: () => void) =>
    iniciar(async () => {
      const r = await fn();
      if (r.erro) toast(r.erro);
      else {
        vibrar();
        if (r.ok) toast(r.ok, "ok");
        aoOk?.();
      }
    });

  const abrirJustificativa = () => {
    setTexto(justificativa ?? "");
    setEtapa(1);
    setAceito(false);
    setJustificando(true);
  };
  const tamanho = texto.trim().length;
  const dataHoje = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

  const btnPrincipal =
    "flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl px-2 text-[13px] font-bold transition active:scale-[0.98] disabled:bg-none disabled:bg-stone-300 disabled:text-stone-600 disabled:shadow-none";
  const ouro = "bg-gradient-to-br from-[#e0b04a] to-[#b8862a] text-[#1c1040] shadow-[0_8px_20px_-8px_rgb(184_134_42/0.7)]";
  const neutro = "bg-stone-100 text-stone-700";

  return (
    <>
      {montado && createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl px-4">
          <div className="borda-animada pointer-events-auto animate-surgir space-y-2.5 rounded-3xl bg-white/60 p-3 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] ring-1 ring-white/70 backdrop-blur-xl backdrop-saturate-150">
            {situacao === "confirmada" && (
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck size={22} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">Presença confirmada</p>
                  <p className="text-xs text-stone-500">{prazoPassou ? "Prazo para cancelar encerrado" : `Pode cancelar até ${prazoTexto}`}</p>
                </div>
                {!prazoPassou && (
                  <button type="button" onClick={() => setConfirmarCancelar(true)} disabled={pendente} className="h-11 shrink-0 rounded-2xl bg-stone-100 px-4 text-sm font-semibold text-stone-700 active:scale-95">
                    Cancelar
                  </button>
                )}
              </div>
            )}
            {situacao === "justificada" && (
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700"><FileText size={22} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">Ausência justificada</p>
                  <p className="text-xs text-stone-500">Todos os guardiões veem sua justificativa.</p>
                </div>
              </div>
            )}

            <div className={`grid gap-2 ${situacao === "confirmada" ? "" : "grid-cols-2"}`}>
              {situacao !== "confirmada" && (
                <button
                  type="button"
                  disabled={jaComecou || pendente}
                  onClick={() => rodar(() => ingressarNaReuniao(eventoId))}
                  className={`${btnPrincipal} ${ouro} order-2`}
                >
                  {pendente ? <><Carregando /> Enviando…</> : jaComecou ? "Reunião já começou" : <><ShieldPlus size={18} /> Confirmar presença</>}
                </button>
              )}
              <button type="button" onClick={abrirJustificativa} disabled={pendente} className={`${btnPrincipal} ${neutro} order-1`}>
                <FileText size={18} /> {situacao === "justificada" ? "Editar justificativa" : "Justificar ausência"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <Folha aberta={justificando} aoFechar={() => setJustificando(false)} titulo={etapa === 1 ? "Justificar ausência" : "Justificativa de Ausência"}>
        {etapa === 1 ? (
          <>
            <p className="mb-3 text-sm text-stone-600">Conte por que você não vai participar desta reunião. A justificativa aparece para todos os guardiões.</p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              maxLength={MAX}
              autoFocus
              placeholder="Descreva o motivo da sua ausência…"
              className="campo min-h-32 w-full resize-y rounded-2xl text-base"
            />
            <p className={`mt-1 text-right text-xs tabular-nums ${tamanho > 0 && tamanho < MIN ? "text-red-600" : "text-stone-400"}`}>
              {tamanho}/{MAX}{tamanho < MIN ? ` · mínimo ${MIN}` : ""}
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={tamanho < MIN}
                onClick={() => setEtapa(2)}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white active:scale-[0.98] disabled:bg-stone-300 disabled:text-stone-600"
              >
                Confirmar
              </button>
              <button type="button" onClick={() => setJustificando(false)} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">Voltar</button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-700 ring-1 ring-stone-200/70">
              <p>Venho justificar minha ausência no Ritual e na Reunião, ciente de que tenho direito a até cinco justificativas durante o ano.</p>
              <p>Peço que esta justificativa seja analisada e considerada, em razão de um impedimento legítimo, justo e honesto que me impossibilitou de estar presente.</p>
              <p>Renovo meu compromisso de respeitar o Juramento e as Regras dos Mestres e Guardiões do Instituto das Virtudes da Ayahuasca e do Sol (IVAS), mantendo meu empenho com os princípios e valores da instituição.</p>
              <p className="font-semibold text-stone-900">Data: {dataHoje}</p>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 p-3.5">
              <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
              <span className="text-sm font-medium text-stone-800">Li e confirmo o texto acima.</span>
            </label>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={!aceito || pendente}
                onClick={() => rodar(() => justificarAusenciaReuniao(eventoId, texto), () => setJustificando(false))}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white active:scale-[0.98] disabled:bg-stone-300 disabled:text-stone-600"
              >
                {pendente ? <><Carregando /> Enviando…</> : <><CalendarCheck size={18} /> Enviar justificativa</>}
              </button>
              <button type="button" onClick={() => setEtapa(1)} disabled={pendente} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">Voltar</button>
            </div>
          </>
        )}
      </Folha>

      <Folha aberta={confirmarCancelar} aoFechar={() => setConfirmarCancelar(false)} titulo="Cancelar sua presença?">
        <p className="text-sm text-stone-600">Você sai da lista de presença. Depois pode marcar de novo, se a reunião ainda não tiver começado.</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirmarCancelar(false);
              rodar(() => cancelarPresencaReuniao(eventoId));
            }}
            className="h-12 rounded-2xl bg-red-600 text-sm font-bold text-white active:scale-[0.98]"
          >
            Sim, cancelar
          </button>
          <button type="button" onClick={() => setConfirmarCancelar(false)} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">Voltar</button>
        </div>
      </Folha>
    </>
  );
}
