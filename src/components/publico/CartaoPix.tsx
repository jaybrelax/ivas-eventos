"use client";

import { useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import type { ChavePix } from "@/lib/types";
import { ROTULO_PIX } from "@/lib/pix";

/** Chave Pix com botão de copiar. Aparece na janela “Participar”. */
export function CartaoPix({ chave }: { chave: ChavePix }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(chave.chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão de área de transferência: a chave continua selecionável
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-ouro-100 via-ouro-50 to-mata-100 p-5 text-stone-900 ring-1 ring-ouro-300/80">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-ouro-700 uppercase">
        <QrCode size={14} /> Pix · {ROTULO_PIX[chave.tipo] || chave.tipo}
      </p>
      <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-[15px] leading-snug font-semibold break-all text-stone-900 ring-1 ring-stone-200 select-all">{chave.chave}</p>
      <p className="mt-1.5 text-xs text-stone-500">
        {chave.favorecido}
        {chave.banco && <> · {chave.banco}</>}
      </p>
      <button
        type="button"
        onClick={copiar}
        className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition active:scale-[0.98] ${
          copiado ? "bg-emerald-600 text-white" : "bg-mata-700 text-white hover:bg-mata-800"
        }`}
      >
        {copiado ? <Check size={16} /> : <Copy size={15} />}
        {copiado ? "Chave copiada" : "Copiar chave Pix"}
      </button>
    </div>
  );
}
