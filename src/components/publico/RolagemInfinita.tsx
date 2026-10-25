"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

/** Lista com paginação automática: mostra `porVez` itens e carrega mais ao chegar perto do fim. */
export function RolagemInfinita({ itens, porVez, className }: { itens: ReactNode[]; porVez: number; className?: string }) {
  const [qtd, setQtd] = useState(porVez);
  const fim = useRef<HTMLDivElement>(null);
  const resta = qtd < itens.length;

  useEffect(() => {
    const el = fim.current;
    if (!el || !resta) return;
    // Observa de novo a cada lote: se o fim ainda estiver à vista, carrega o próximo
    const obs = new IntersectionObserver(([x]) => { if (x.isIntersecting) setQtd((q) => q + porVez); }, { rootMargin: "600px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [resta, porVez, qtd]);

  return (
    <>
      <div className={className}>{itens.slice(0, qtd)}</div>
      {resta && (
        <div ref={fim} className="flex justify-center py-8 text-stone-400" aria-live="polite">
          <LoaderCircle size={22} className="animate-spin" aria-label="Carregando mais eventos" />
        </div>
      )}
    </>
  );
}
