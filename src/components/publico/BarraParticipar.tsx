"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { BotaoParticipar } from "./BotaoParticipar";

/** Rolagem (px) a partir da qual a barra aparece: antes disso o botão do topo ainda está à vista. */
const A_PARTIR_DE = 400;

/**
 * Barra fixa de "Participar" no celular. Só aparece depois de rolar 400 px, em três tempos:
 * a barra sobe, o texto entra deslizando e por fim o botão surge com um leve salto.
 */
export function BarraParticipar({
  titulo,
  quando,
  participar,
}: {
  titulo: string;
  quando: string;
  participar: ComponentProps<typeof BotaoParticipar>;
}) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const ver = () => setVisivel(window.scrollY > A_PARTIR_DE);
    ver();
    window.addEventListener("scroll", ver, { passive: true });
    return () => window.removeEventListener("scroll", ver);
  }, []);

  // Ao sumir, tudo sai junto e rápido; ao aparecer, cada parte entra com seu atraso
  const entra = (atraso: string) => (visivel ? `opacity-100 ${atraso}` : "opacity-0 delay-0");

  return (
    <div
      aria-hidden={!visivel}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-mata-950/92 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:hidden ${
        visivel ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`min-w-0 flex-1 transition duration-500 ease-out ${entra("translate-x-0 delay-200")} ${visivel ? "" : "-translate-x-4"}`}>
          <p className="truncate text-sm font-semibold text-white">{titulo}</p>
          <p className="text-xs text-white/60 first-letter:uppercase">{quando}</p>
        </div>
        <div
          className={`transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${entra("translate-y-0 scale-100 delay-[380ms]")} ${
            visivel ? "" : "translate-y-3 scale-90"
          }`}
        >
          <BotaoParticipar {...participar} variante="sticky" />
        </div>
      </div>
    </div>
  );
}
