"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, Receipt, Ticket } from "lucide-react";

const ABAS = [
  { chave: "proximos", rotulo: "Participações", Icone: CalendarCheck },
  { chave: "pagamentos", rotulo: "Contribuições", Icone: Receipt },
  { chave: "creditos", rotulo: "Créditos", Icone: Ticket },
] as const;

export type AbaMinhaConta = (typeof ABAS)[number]["chave"];

export function AbasMinhaConta({ aba }: { aba: AbaMinhaConta }) {
  const [selecao, setSelecao] = useState<{ origem: AbaMinhaConta; destino: AbaMinhaConta } | null>(null);
  const ativa = selecao?.origem === aba ? selecao.destino : aba;
  const indiceAtivo = ABAS.findIndex(({ chave }) => chave === ativa);

  return (
    <nav aria-label="Seções da minha conta" className="relative mb-7 grid grid-cols-3 border-b border-stone-200/80">
      {ABAS.map(({ chave, rotulo, Icone }) => (
        <Link
          key={chave}
          href={`/minha-conta?aba=${chave}`}
          onClick={() => setSelecao({ origem: aba, destino: chave })}
          aria-current={aba === chave ? "page" : undefined}
          className={`inline-flex min-h-12 items-center justify-center gap-1 px-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mata-700 sm:gap-2 sm:text-sm ${
            ativa === chave ? "font-semibold text-mata-800" : "font-medium text-stone-500 hover:text-stone-800"
          }`}
        >
          <Icone size={16} aria-hidden /> {rotulo}
        </Link>
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[2px] left-0 h-[3px] w-1/3 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
        style={{ transform: `translateX(${indiceAtivo * 100}%)` }}
      >
        <span className="mx-2 block h-full rounded-full bg-mata-700" />
      </span>
    </nav>
  );
}
