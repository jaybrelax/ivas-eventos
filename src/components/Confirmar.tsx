"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Botão que pede confirmação num balão na própria página, em vez do confirm() do navegador
 * (que alguns navegadores embutidos não suportam).
 */
export function BotaoConfirmar({
  children,
  pergunta,
  confirmar = "Sim, excluir",
  aoConfirmar,
  acima = false,
  alinhar = "direita",
  className,
  disabled,
  title,
}: {
  children: ReactNode;
  pergunta: string;
  confirmar?: string;
  aoConfirmar: () => void;
  /** Abre o balão acima do botão (para botões no rodapé de painéis). */
  acima?: boolean;
  /** Lado do botão em que o balão se alinha (use "esquerda" para botões no canto esquerdo). */
  alinhar?: "direita" | "esquerda";
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <span ref={caixa} className="relative inline-flex">
      <button type="button" className={className} disabled={disabled} title={title} aria-label={title} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        {children}
      </button>
      {aberto && (
        <span
          role="dialog"
          className={`absolute ${alinhar === "esquerda" ? "left-0" : "right-0"} z-30 w-64 animate-surgir ${acima ? "bottom-full mb-2" : "top-full mt-2"} rounded-xl border border-stone-200 bg-white p-3 text-left shadow-elevado`}
        >
          <span className="block text-sm font-medium text-stone-800">{pergunta}</span>
          <span className="mt-3 flex justify-end gap-2">
            <button type="button" className="btn-secundario h-8 px-3 text-xs" onClick={() => setAberto(false)} autoFocus>
              Cancelar
            </button>
            <button
              type="button"
              className="btn h-8 bg-red-600 px-3 text-xs text-white hover:bg-red-700"
              onClick={() => {
                setAberto(false);
                aoConfirmar();
              }}
            >
              {confirmar}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
