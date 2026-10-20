"use client";

import { useState, useTransition } from "react";
import { Moon, Smartphone, Sun } from "lucide-react";
import type { TemaGuarnicao } from "@/lib/guarnicao-app";
import { salvarTema } from "../actions";

const OPCOES: { valor: TemaGuarnicao; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
  { valor: "auto", rotulo: "Automático", Icone: Smartphone },
];
const CLASSE: Record<TemaGuarnicao, string> = { claro: "", escuro: "tema-escuro", auto: "tema-auto" };

/** Aparência do app: claro, escuro (confortável à noite) ou seguindo o celular. */
export function SeletorTema({ atual }: { atual: TemaGuarnicao }) {
  const [tema, setTema] = useState(atual);
  const [, iniciar] = useTransition();

  const escolher = (t: TemaGuarnicao) => {
    setTema(t);
    // Troca na hora; o servidor guarda a escolha para as próximas visitas
    const html = document.documentElement;
    html.classList.remove("tema-escuro", "tema-auto");
    if (CLASSE[t]) html.classList.add(CLASSE[t]);
    iniciar(() => salvarTema(t));
  };

  return (
    <section className="mx-4 mt-4 rounded-3xl bg-white p-2 shadow-cartao ring-1 ring-stone-200/70">
      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-stone-500 uppercase">Aparência</p>
      <div className="grid grid-cols-3 gap-1.5 p-1">
        {OPCOES.map(({ valor, rotulo, Icone }) => (
          <button
            key={valor}
            type="button"
            onClick={() => escolher(valor)}
            aria-pressed={tema === valor}
            className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition active:scale-[0.97] ${
              tema === valor ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"
            }`}
          >
            <Icone size={18} /> {rotulo}
          </button>
        ))}
      </div>
    </section>
  );
}
