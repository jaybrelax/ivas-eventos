"use client";

import { useEffect, useRef } from "react";

/** Quanto a imagem acompanha a rolagem: 0 = rola junto com a página; 1 = fica parada. */
const VELOCIDADE = 0.55;

/**
 * Capa desfocada no fundo do topo com efeito parallax: ao rolar, a imagem sobe bem mais devagar
 * que o conteúdo. Funciona também no celular (onde `background-attachment: fixed` não funciona)
 * e respeita quem pediu menos movimento no sistema.
 */
export function FundoParallax({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const mover = () => {
      quadro = 0;
      const caixa = img.parentElement!.getBoundingClientRect();
      if (caixa.bottom < 0) return; // topo já saiu da tela: não precisa mexer
      img.style.transform = `translate3d(0, ${Math.max(0, -caixa.top) * VELOCIDADE}px, 0)`;
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(mover);
    };
    mover();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* mais alta que o topo e começando acima dele, para nunca aparecer borda ao descer */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt=""
        className="absolute inset-x-0 -top-[60%] h-[160%] w-full scale-105 object-cover opacity-30 blur-md will-change-transform"
      />
    </div>
  );
}
