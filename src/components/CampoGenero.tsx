"use client";

import { useState } from "react";
import { VenusAndMars } from "lucide-react";
import { GENERO_ROTULO, IconeGenero, type Genero } from "./genero";

const OPCOES: { valor: Genero; rotulo: string }[] = [
  { valor: "masculino", rotulo: GENERO_ROTULO.masculino },
  { valor: "feminino", rotulo: GENERO_ROTULO.feminino },
];

/** Escolha entre Masculino e Feminino, com o ícone de cada opção. Envia o campo `sexo`. */
export function CampoGenero({ id, inicial }: { id: string; inicial?: Genero | null }) {
  const [valor, setValor] = useState<Genero | "">(inicial ?? "");
  return (
    <fieldset>
      <legend className="rotulo flex items-center gap-1.5"><VenusAndMars size={14} className="text-stone-400" aria-hidden />Gênero</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {OPCOES.map((o) => {
          const on = valor === o.valor;
          return (
            <label
              key={o.valor}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ouro-500 ${
                on
                  ? o.valor === "masculino"
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              <input
                id={`${id}-${o.valor}`}
                type="radio"
                name="sexo"
                value={o.valor}
                checked={on}
                onChange={() => setValor(o.valor)}
                className="sr-only"
              />
              <IconeGenero genero={o.valor} size={17} />
              {o.rotulo}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
