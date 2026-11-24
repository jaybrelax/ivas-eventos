"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, IdCard, Mail, MapPin, MessageCircle, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Dose } from "@/lib/doses";
import { Dosagem } from "./Dosagem";
import { salvarDosesEquipeAction } from "./participantes-actions";
import type { ContatoEquipe } from "./Participantes";

/** Modal de dosagem de quem é da equipe do ritual (sem inscrição): só o card Dosagem. */
export function ModalDosagemEquipe({ eventoId, pessoa, rotulo, inicial, fechar, contato = null }: {
  eventoId: string; pessoa: { id: string; nome: string; foto: string | null }; rotulo: string; inicial: Dose[]; fechar: () => void;
  /** Card de informações (só guardiões e quem gerencia). */ contato?: ContatoEquipe | null;
}) {
  // Informações do guardião: sempre começam ocultas; o botão mostra o conteúdo
  const [infoAberta, setInfoAberta] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = rolagem; };
  }, [fechar]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Dosagem de ${pessoa.nome}`} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg animate-surgir flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="relative flex shrink-0 items-center gap-3.5 border-b border-stone-100 bg-gradient-to-b from-mata-50/80 to-white px-5 pt-5 pb-4">
          <button type="button" onClick={fechar} className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
            <X size={17} />
          </button>
          <Avatar nome={pessoa.nome} foto={pessoa.foto} tamanho={56} />
          <div className="min-w-0 pr-8">
            <p className="text-[11px] font-semibold tracking-wider text-mata-600 uppercase">{rotulo} do ritual</p>
            <h3 className="truncate text-lg font-semibold text-stone-900">{pessoa.nome}</h3>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {contato && (
            <section className="mb-4 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setInfoAberta((v) => !v)}
                aria-expanded={infoAberta}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-stone-50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500 ring-1 ring-stone-200">
                  <IdCard size={17} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-stone-900">Informações</h4>
                  <p className="text-xs text-stone-500">Contato e cidade</p>
                </div>
                <span className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition ${infoAberta ? "bg-white text-stone-700 ring-1 ring-stone-300" : "bg-stone-800 text-white"}`}>
                  {infoAberta ? "Ocultar" : "Exibir"} <ChevronDown size={14} className={`transition duration-300 ${infoAberta ? "rotate-180" : ""}`} aria-hidden />
                </span>
              </button>
              {infoAberta && (
              <ul className="divide-y divide-stone-100 border-t border-stone-100">
                {[
                  { rotulo: "WhatsApp", valor: contato.telefone, Icone: MessageCircle },
                  { rotulo: "CPF", valor: contato.cpf, Icone: IdCard },
                  { rotulo: "E-mail", valor: contato.email, Icone: Mail },
                  { rotulo: "Cidade", valor: [contato.cidade, contato.estado].filter(Boolean).join(" — ") || null, Icone: MapPin },
                ].map(({ rotulo: r, valor, Icone }) => (
                  <li key={r} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-50 text-stone-400 ring-1 ring-stone-100">
                      <Icone size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-stone-400">{r}</p>
                      <p className={`truncate text-sm font-medium ${valor ? "text-stone-800" : "text-stone-400"}`}>{valor || "Não informado"}</p>
                    </div>
                  </li>
                ))}
              </ul>
              )}
            </section>
          )}
          <Dosagem salvarDoses={(l) => salvarDosesEquipeAction(eventoId, pessoa.id, l)} inicial={inicial} aoSalvar={() => {}} />
          <div aria-hidden className="h-[100px]" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
