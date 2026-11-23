"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Endereço de uma foto da Central (rota privada, com checagem de acesso). Sem `w` = tamanho cheio. */
export const urlFotoCentral = (id: string, w?: number) => (w ? `/api/central/${id}?w=${w}` : `/api/central/${id}`);

const VISIVEIS = 6;

/**
 * Fotos de um post em grade que se adapta à quantidade (1 grande, 2 lado a lado, 3+ em grade com "+N").
 * Tocar numa foto abre a visualização em tela cheia.
 */
export function GaleriaFotos({ ids }: { ids: string[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  if (!ids.length) return null;
  const mostrar = ids.slice(0, VISIVEIS);
  const resto = ids.length - mostrar.length;
  const colunas = ids.length === 1 ? "grid-cols-1" : ids.length === 2 || ids.length === 4 ? "grid-cols-2" : "grid-cols-3";
  return (
    <>
      <div className={`grid gap-1 overflow-hidden rounded-xl ${colunas}`}>
        {mostrar.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => setAberta(i)}
            className={`group relative overflow-hidden bg-stone-100 ${ids.length === 1 ? "aspect-[4/3] max-h-[22rem]" : "aspect-square"}`}
            aria-label={`Abrir foto ${i + 1} de ${ids.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlFotoCentral(id, ids.length === 1 ? 960 : 320)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
            {i === mostrar.length - 1 && resto > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-black/50 text-xl font-semibold text-white">+{resto}</span>
            )}
          </button>
        ))}
      </div>
      {aberta !== null && <VisualizarFotos ids={ids} inicial={aberta} fechar={() => setAberta(null)} />}
    </>
  );
}

/** Tela cheia: setas, deslizar no celular, Esc fecha; já carrega as fotos vizinhas. */
function VisualizarFotos({ ids, inicial, fechar }: { ids: string[]; inicial: number; fechar: () => void }) {
  const [i, setI] = useState(inicial);
  const toque = useRef<number | null>(null);
  const ir = useCallback((d: number) => setI((atual) => (atual + d + ids.length) % ids.length), [ids.length]);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowRight") ir(1);
      else if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", teclas);
    const corpo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", teclas); document.body.style.overflow = corpo; };
  }, [fechar, ir]);

  // Pré-carrega as vizinhas para a troca ser instantânea
  useEffect(() => {
    for (const d of [1, -1]) {
      const img = new Image();
      img.src = urlFotoCentral(ids[(i + d + ids.length) % ids.length]);
    }
  }, [i, ids]);

  const varias = ids.length > 1;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fotos do post"
      className="fixed inset-0 z-[70] flex animate-aparecer flex-col bg-black/95"
      onTouchStart={(e) => { toque.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (toque.current === null) return;
        const dx = e.changedTouches[0].clientX - toque.current;
        toque.current = null;
        if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white/80">
        <span className="text-sm tabular-nums">{varias ? `${i + 1} / ${ids.length}` : ""}</span>
        <button type="button" onClick={fechar} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Fechar">
          <X size={20} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6" onClick={(e) => e.target === e.currentTarget && fechar()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={ids[i]} src={urlFotoCentral(ids[i])} alt={`Foto ${i + 1} de ${ids.length}`} className="max-h-full max-w-full animate-aparecer rounded-lg object-contain select-none" draggable={false} />
        {varias && (
          <>
            <button type="button" onClick={() => ir(-1)} className="absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:grid" aria-label="Foto anterior">
              <ChevronLeft size={22} />
            </button>
            <button type="button" onClick={() => ir(1)} className="absolute top-1/2 right-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:grid" aria-label="Próxima foto">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
