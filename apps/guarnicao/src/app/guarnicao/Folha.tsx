"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * "Bottom sheet" como nos apps nativos: sobe de baixo sobre um fundo escurecido.
 * Fecha tocando fora, no puxador ou com Esc.
 */
export function Folha({ aberta, aoFechar, titulo, topo, cheia = false, tituloGrande = false, escuro = false, children }: { aberta: boolean; aoFechar: () => void; titulo?: string; /** Título maior (usado nas telas cheias). */ tituloGrande?: boolean; /** Sempre no estilo escuro, mesmo com o app no tema claro. */ escuro?: boolean; /** Ocupa a tela inteira (mais espaço para o conteúdo). */ cheia?: boolean; /** Elemento no topo da folha, antes do título (ex.: uma ilustração centralizada). */ topo?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = antes;
    };
  }, [aberta, aoFechar]);

  // Acompanha a área realmente visível (o teclado do celular encolhe a tela): a folha fica dentro dela e não corta o topo
  const [vv, setVv] = useState<{ top: number; height: number; max: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    if (!aberta || !v) return;
    // Com o teclado aberto (área visível bem menor que a janela) a folha usa toda a área visível; sem ele, 90% da tela
    const atualizar = () => setVv({ top: v.offsetTop, height: v.height, max: v.height < window.innerHeight - 80 ? v.height : v.height * 0.9 });
    atualizar();
    v.addEventListener("resize", atualizar);
    v.addEventListener("scroll", atualizar);
    return () => {
      v.removeEventListener("resize", atualizar);
      v.removeEventListener("scroll", atualizar);
    };
  }, [aberta]);

  if (!aberta) return null;
  return createPortal(
    <div className={escuro ? "tema-escuro fixed inset-0 z-50" : "fixed inset-0 z-50"} role="dialog" style={vv ? ({ top: vv.top, bottom: "auto", height: vv.height, "--vvh": `${vv.max}px` } as CSSProperties) : undefined} aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 animate-aparecer bg-black/45 backdrop-blur-[2px]" />
      <div className={cheia ? "absolute inset-0 mx-auto flex max-w-xl animate-folha flex-col overflow-y-auto bg-white px-5 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]" : "absolute inset-x-0 bottom-0 mx-auto max-h-[var(--vvh,90dvh)] max-w-xl animate-folha overflow-y-auto rounded-t-[28px] bg-white px-5 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-10px_rgb(0_0_0/0.35)]"}>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-stone-300" />
        {topo}
        {titulo && <h2 className={tituloGrande ? "mb-1.5 text-xl font-bold leading-tight text-stone-900" : "mb-4 text-lg font-semibold text-stone-900"}>{titulo}</h2>}
        {cheia ? <div className="flex flex-1 flex-col">{children}</div> : children}
      </div>
    </div>,
    document.body,
  );
}
