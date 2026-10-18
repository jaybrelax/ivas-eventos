"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

type Props = {
  titulo: string;
  data: string;
  hora: string;
};

export function BotoesCompartilhar({ titulo, data, hora }: Props) {
  const [copiado, setCopiado] = useState(false);

  const obterUrl = () => {
    if (typeof window !== "undefined") return window.location.href;
    return "";
  };

  const copiarLink = async () => {
    const url = obterUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // fallback
    }
  };

  const compartilharWhatsApp = () => {
    const url = obterUrl();
    const texto = encodeURIComponent(
      `🌟 *${titulo}*\n📅 ${data} às ${hora}\n📍 Instituto IVAS\n\nSaiba mais e participe pelo link:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${texto}`, "_blank");
  };

  // Discretos, sem fundo: só contorno leve sobre o topo escuro.
  // No celular os dois dividem a largura toda e ficam mais altos (alvo de toque maior).
  const discreto =
    "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-xs sm:text-[13px] font-medium whitespace-nowrap text-white/75 ring-1 ring-white/15 ring-inset transition hover:bg-white/5 hover:text-white active:scale-[0.98] sm:h-9 sm:justify-start sm:px-3";

  return (
    <div className="grid w-full grid-cols-[3fr_2fr] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={compartilharWhatsApp}
        className={discreto}
        title="Compartilhar no WhatsApp"
      >
        <MessageCircle size={15} />
        <span className="truncate">Compartilhar no WhatsApp</span>
      </button>

      <button
        type="button"
        onClick={copiarLink}
        className={discreto}
        title="Copiar link"
      >
        {copiado ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
        <span>{copiado ? "Copiado!" : "Copiar link"}</span>
      </button>
    </div>
  );
}
