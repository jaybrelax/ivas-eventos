"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

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

  const compartilharNativo = async () => {
    const url = obterUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${titulo} — Instituto IVAS`,
          text: `Confira o evento "${titulo}" no Instituto IVAS em ${data} às ${hora}.`,
          url,
        });
        return;
      } catch {
        // usuário cancelou
      }
    }
    copiarLink();
  };

  const compartilharWhatsApp = () => {
    const url = obterUrl();
    const texto = encodeURIComponent(
      `🌟 *${titulo}*\n📅 ${data} às ${hora}\n📍 Instituto IVAS\n\nSaiba mais e participe pelo link:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${texto}`, "_blank");
  };

  // Discretos, sem fundo: só contorno leve sobre o topo escuro
  const discreto =
    "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-white/70 ring-1 ring-white/15 ring-inset transition hover:bg-white/5 hover:text-white active:scale-[0.98]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={compartilharWhatsApp}
        className={discreto}
        title="Compartilhar no WhatsApp"
      >
        <MessageCircle size={15} />
        <span>WhatsApp</span>
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

      <button
        type="button"
        onClick={compartilharNativo}
        className={`${discreto} w-9 justify-center px-0 sm:hidden`}
        title="Compartilhar"
      >
        <Share2 size={15} />
      </button>
    </div>
  );
}
