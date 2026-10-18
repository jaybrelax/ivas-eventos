"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CartaoPix } from "./CartaoPix";
import type { ChavePix } from "@/lib/types";
import { ArrowRight, Calendar, CalendarCheck, CheckCircle2, HeartHandshake, MessageCircle, X } from "lucide-react";

type Props = {
  tituloEvento: string;
  dataEvento: string; // Ex: "Sábado, 17 de Outubro"
  horaEvento: string; // Ex: "19:00"
  localEvento?: string | null;
  telefoneWhatsapp?: string | null;
  /** Chave Pix mostrada na janela, para quem quer contribuir logo. */
  chavePix?: ChavePix | null;
  /** Ritual: “Participar do Ritual”; demais tipos: “Participar do Encontro”. */
  ehRitual?: boolean;
  variante?: "hero" | "sidebar" | "sticky";
  className?: string;
};

export function BotaoParticipar({
  tituloEvento,
  dataEvento,
  horaEvento,
  localEvento,
  telefoneWhatsapp,
  ehRitual = true,
  chavePix,
  variante = "hero",
  className = "",
}: Props) {
  const [aberto, setAberto] = useState(false);

  const numWhats = telefoneWhatsapp ? telefoneWhatsapp.replace(/\D/g, "") : "43999489000";
  const numFinal = numWhats.startsWith("55") ? numWhats : `55${numWhats}`;
  const textoMsg = encodeURIComponent(
    `Olá! Gostaria de informações sobre como participar do encontro "${tituloEvento}" (${dataEvento} às ${horaEvento}) no Instituto IVAS.`
  );
  const linkWhatsApp = `https://wa.me/${numFinal}?text=${textoMsg}`;

  // Verde sólido, sem sombra; só o ícone (sem quadro) e o texto
  const base =
    "group inline-flex cursor-pointer items-center justify-center font-semibold text-white " +
    "bg-emerald-600 transition duration-200 hover:bg-emerald-700 active:scale-[0.98] " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";
  const estilosBotao = {
    hero: "h-13 gap-2.5 rounded-2xl px-7 text-base",
    sidebar: "h-12 w-full gap-2.5 rounded-xl px-5 text-[15px]",
    sticky: "h-11 gap-2 rounded-xl px-4 text-sm",
  }[variante];

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={`${base} ${estilosBotao} ${className}`}>
        <CalendarCheck size={variante === "sticky" ? 17 : 19} strokeWidth={2.2} className="shrink-0" />
        <span className="whitespace-nowrap">{variante === "sticky" ? "Participar" : ehRitual ? "Participar do Ritual" : "Participar do encontro"}</span>
        {variante !== "sticky" && <ArrowRight size={17} className="shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5" />}
      </button>

      {/* Modal / Dialog de Confirmação e Informações */}
      {aberto && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Fundo escurecido com blur */}
          <div
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setAberto(false)}
          />

          {/* Cartão do Modal */}
          <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-surgir overflow-y-auto rounded-3xl border border-stone-200/90 bg-white p-6 shadow-2xl sm:p-8">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ouro-100 text-ouro-700">
                <HeartHandshake size={24} />
              </span>
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-ouro-700 uppercase">Inscrições & Presença</span>
                <h3 className="font-display text-xl font-bold text-stone-900">{ehRitual ? "Participar do ritual" : "Participar do encontro"}</h3>
              </div>
            </div>

            {/* Resumo do Evento */}
            <div className="mt-5 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200/70">
              <p className="font-semibold text-stone-900">{tituloEvento}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                <Calendar size={13} className="text-mata-600" />
                <span>{dataEvento} às {horaEvento}</span>
              </p>
              {localEvento && (
                <p className="mt-1 text-xs text-stone-500">📍 {localEvento}</p>
              )}
            </div>

            {/* Orientações */}
            <div className="mt-5 space-y-3 text-sm text-stone-600">
              <div className="flex gap-2.5">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <p>
                  As inscrições automatizadas pelo sistema serão disponibilizadas em breve.
                </p>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <p>
                  Para reservar sua vaga antecipadamente e obter orientações detalhadas, confirme sua presença diretamente com a coordenação via WhatsApp.
                </p>
              </div>
            </div>

            {chavePix && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Contribuição</p>
                <CartaoPix chave={chavePix} />
              </div>
            )}

            {/* Botão de Ação WhatsApp */}
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAberto(false)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                <MessageCircle size={18} />
                <span>Confirmar Participação</span>
              </a>

              <button
                type="button"
                onClick={() => setAberto(false)}
                className="btn-secundario w-full"
              >
                Voltar à página
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
