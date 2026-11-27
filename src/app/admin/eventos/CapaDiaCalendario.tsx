"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Hash, MapPin, X } from "lucide-react";
import { urlImagem } from "@/lib/links";

export type ResumoDia = {
  id: string; titulo: string; capaFileId: string; hora: string;
  /** Ex.: "Quarta-feira, 25 de novembro". */
  data: string;
  /** Ex.: "N° 536 · 91/2026". */
  numeros: string | null;
  local: string | null;
};

/**
 * Fundo de um dia do calendário com a imagem do evento (miniatura leve). No computador e no tablet o
 * quadrado leva direto ao evento; no celular abre um resumo (título, numeração, local) com o botão de acesso.
 */
export function CapaDiaCalendario({ resumo }: { resumo: ResumoDia }) {
  const [aberto, setAberto] = useState(false);
  const [carregada, setCarregada] = useState(false);
  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-10 bg-mata-900">
        <span className={`calendario-imagem-skeleton absolute inset-0 transition-opacity duration-300 ${carregada ? "opacity-0" : "opacity-100"}`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlImagem(resumo.capaFileId, 128)} loading="lazy" decoding="async" alt="" onLoad={() => setCarregada(true)} onError={() => setCarregada(true)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${carregada ? "opacity-100" : "opacity-0"}`} />
        <span className="absolute inset-0 bg-black/10" />
      </div>
      {/* Celular: abre o resumo */}
      <button type="button" onClick={() => setAberto(true)} aria-label={`${resumo.titulo}: ver resumo`} className="absolute inset-0 -z-10 active:bg-black/20 sm:hidden" />
      {/* Tablet e computador: abre o evento */}
      <Link href={`/admin/eventos/${resumo.id}`} title={`${resumo.hora} · ${resumo.titulo}`} aria-label={resumo.titulo} className="group absolute inset-0 -z-10 hidden transition hover:bg-white/10 sm:block" />
      {aberto && <ResumoEvento resumo={resumo} fechar={() => setAberto(false)} />}
    </>
  );
}

function ResumoEvento({ resumo, fechar }: { resumo: ResumoDia; fechar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", tecla);
    const corpo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = corpo; };
  }, [fechar]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="resumo-dia-titulo" className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label="Fechar" className="absolute inset-0 animate-aparecer bg-mata-950/50 backdrop-blur-sm" onClick={fechar} />
      <div className="relative w-full max-w-md animate-surgir rounded-t-3xl bg-fundo p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-elevado">
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-stone-300" />
        <button type="button" onClick={fechar} className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={18} /></button>
        <div className="flex gap-3">
          <span className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-mata-900 ring-1 ring-black/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlImagem(resumo.capaFileId, 320)} alt="" className="h-full w-full object-cover" />
          </span>
          <div className="min-w-0 flex-1 pr-8">
            <h2 id="resumo-dia-titulo" className="font-display text-lg leading-tight font-semibold text-stone-900">{resumo.titulo}</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
              {resumo.numeros && <li className="flex items-center gap-2 font-semibold text-mata-700 tabular-nums"><Hash size={14} className="shrink-0" aria-hidden /> {resumo.numeros}</li>}
              <li className="flex items-center gap-2"><CalendarDays size={14} className="shrink-0 text-stone-400" aria-hidden /> {resumo.data}</li>
              <li className="flex items-center gap-2"><Clock size={14} className="shrink-0 text-stone-400" aria-hidden /> {resumo.hora}</li>
              {resumo.local && <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden /> <span className="min-w-0">{resumo.local}</span></li>}
            </ul>
          </div>
        </div>
        <Link href={`/admin/eventos/${resumo.id}`} className="btn-primario mt-4 h-12 w-full justify-center rounded-xl text-[15px]">
          Acessar evento <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </div>,
    document.body,
  );
}
