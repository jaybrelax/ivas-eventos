"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CalendarCheck, Check, Copy, FileText, ShieldCheck, ShieldPlus } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { cancelarPresencaReuniao, ingressarNaReuniao, justificarAusenciaReuniao } from "../../actions";
import { Folha } from "../../Folha";
import { vibrar } from "../../nativo";

/** Ilustração do topo das folhas de justificativa (Anúbis com a balança), com um fundo geométrico animado e suave atrás. */
export const FiguraJustica = (
  <div aria-hidden className="pointer-events-none relative z-10 mx-auto mt-0 -mb-4 flex h-60 w-full justify-center select-none">
    <svg viewBox="0 0 300 300" className="absolute top-1/2 left-1/2 h-[19rem] w-[19rem] -translate-x-1/2 -translate-y-1/2 overflow-visible">
      <defs>
        <radialGradient id="geo-brilho" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#6d28d9" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* brilho que respira */}
      <circle className="geo-peca geo-pulsar" cx="150" cy="150" r="128" fill="url(#geo-brilho)" />
      {/* anel externo pontilhado */}
      <circle className="geo-peca geo-girar-120r" cx="150" cy="150" r="138" fill="none" stroke="#e0b04a" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="1.5 7" />
      {/* anel com marcações */}
      <g className="geo-peca geo-girar-60">
        <circle cx="150" cy="150" r="118" fill="none" stroke="#e0b04a" strokeOpacity="0.28" strokeWidth="1" />
        <circle cx="150" cy="32" r="3" fill="#e0b04a" fillOpacity="0.85" />
        <circle cx="252" cy="209" r="2.2" fill="#a78bfa" fillOpacity="0.9" />
        <circle cx="48" cy="209" r="2.2" fill="#a78bfa" fillOpacity="0.9" />
      </g>
      {/* hexagrama (dois triângulos) */}
      <g className="geo-peca geo-girar-90r" fill="none" stroke="#a78bfa" strokeOpacity="0.32" strokeWidth="1">
        <polygon points="150,48 238,201 62,201" />
        <polygon points="150,252 62,99 238,99" />
      </g>
      {/* quadrado em losango tracejado */}
      <rect className="geo-peca geo-girar-40" x="88" y="88" width="124" height="124" fill="none" stroke="#e0b04a" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="4 6" transform="rotate(45 150 150)" />
      {/* anel interno fino */}
      <circle cx="150" cy="150" r="74" fill="none" stroke="#c4b5fd" strokeOpacity="0.2" strokeWidth="0.8" />
    </svg>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/icons/justica-anubis.webp" alt="" width={356} height={450} draggable={false} className="relative h-60 w-auto" />
  </div>
);

const MIN = 25;
const MAX = 200;

type Props = {
  eventoId: string;
  /** Nome completo de quem justifica (abre o termo: "Eu, <nome>, …"). */
  nome: string;
  situacao: "confirmada" | "justificada" | null;
  justificativa: string | null;
  jaComecou: boolean;
  prazoPassou: boolean;
  prazoTexto: string;
};

/** Barra fixa do guardião na reunião: marcar presença, cancelar (até o prazo) ou justificar a ausência. */
export function AcaoReuniao({ eventoId, nome, situacao, justificativa, jaComecou, prazoPassou, prazoTexto }: Props) {
  const [pendente, iniciar] = useTransition();
  const [justificando, setJustificando] = useState(false);
  // Etapa 1: escrever a justificativa. Etapa 2: ler o termo, marcar a ciência e enviar.
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [aceito, setAceito] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [texto, setTexto] = useState(justificativa ?? "");
  // Campo do motivo: começa pequeno e cresce conforme o texto (até um limite, depois rola por dentro)
  const campo = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.35)}px`;
  }, [texto, justificando, etapa]);
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
  const dataHora = useMemo(() => {
    const agora = new Date();
    const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(agora);
    const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(agora);
    return { data, hora };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justificando, etapa]);
  // Termo da justificativa: o que aparece na tela é o que o botão copia
  const paragrafos = [
    `Eu, ${nome}, venho justificar minha ausência no Ritual e na Reunião, ciente de que tenho direito a até cinco justificativas durante o ano.`,
    `MOTIVO: ${texto.trim()}`,
    "Peço que esta justificativa seja analisada e considerada, em razão de um impedimento legítimo, justo e honesto que me impossibilitou de estar presente.",
    "Renovo meu compromisso de respeitar o Juramento e as Regras dos Mestres e Guardiões do Instituto das Virtudes da Ayahuasca e do Sol (IVAS), mantendo meu empenho com os princípios e valores da instituição.",
    `Data: ${dataHora.data} às ${dataHora.hora}`,
  ];
  // Rola a tela de trás: o título do evento fica centralizado na parte visível acima da folha; ao fechar, volta
  useEffect(() => {
    if (!justificando || etapa !== 1) return;
    const antes = window.scrollY;
    let mexeu = false;
    const id = window.setTimeout(() => {
      const titulo = document.querySelector("h1");
      const folha = document.querySelector<HTMLElement>('[role="dialog"] > div:last-child');
      if (!titulo || !folha) return;
      const livre = window.innerHeight - folha.offsetHeight; // área visível acima da folha
      const caixa = titulo.getBoundingClientRect();
      const alvo = window.scrollY + caixa.top + caixa.height / 2 - livre / 2;
      mexeu = true;
      window.scrollTo({ top: Math.max(0, alvo), behavior: "smooth" });
    }, 120);
    return () => {
      window.clearTimeout(id);
      if (mexeu) window.scrollTo({ top: antes, behavior: "smooth" });
    };
  }, [justificando, etapa]);

  const copiar = async () => {
    const conteudo = paragrafos.join("\n\n");
    try {
      await navigator.clipboard.writeText(conteudo);
    } catch {
      // Sem permissão da área de transferência: usa o método antigo
      const area = document.createElement("textarea");
      area.value = conteudo;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    vibrar();
    setCopiado(true);
    toast("Texto copiado.", "ok");
    setTimeout(() => setCopiado(false), 2000);
  };

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
                  {pendente ? <><Carregando /> Enviando…</> : jaComecou ? "Prazo para confirmar encerrado" : <><ShieldPlus size={18} /> Confirmar presença</>}
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

      <Folha aberta={justificando} aoFechar={() => setJustificando(false)} escuro cheia={etapa === 2} tituloGrande={etapa === 2} topo={etapa === 1 ? FiguraJustica : undefined} titulo={etapa === 1 ? "Justificar ausência" : "Justificativa de Ausência"}>
        {etapa === 1 ? (
          <div>
            <p className="mb-3 text-sm text-stone-600">Conte por que você não vai participar desta reunião. A justificativa aparece para todos os guardiões.</p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              ref={campo}
              rows={3}
              maxLength={MAX}
              autoFocus
              placeholder="Descreva o motivo da sua ausência…"
              className="campo min-h-[5.5rem] w-full resize-none overflow-y-auto rounded-2xl text-base"
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
          </div>
        ) : (
          <>
            <div className="relative flex-1 space-y-4 rounded-2xl bg-stone-50 p-5 text-lg leading-relaxed text-stone-700 ring-1 ring-stone-200/70">
              {paragrafos.map((p, i) => (
                <p key={i} className={i === paragrafos.length - 1 ? "font-semibold text-stone-900" : i === 1 ? "font-medium break-words whitespace-pre-line text-stone-900" : undefined}>{p}</p>
              ))}
              <button
                type="button"
                onClick={copiar}
                aria-label="Copiar o texto"
                title="Copiar o texto"
                className="absolute right-2 bottom-2 grid h-9 w-9 place-items-center rounded-xl bg-stone-100/80 text-stone-600 ring-1 ring-stone-200 backdrop-blur-sm active:scale-90"
              >
                {copiado ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
              </button>
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
