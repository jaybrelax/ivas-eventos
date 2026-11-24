import type { LucideIcon } from "lucide-react";

/**
 * Título no topo do painel de uma aba (Consumo, Central, Financeiro): ícone em degradê,
 * título e uma linha de resumo. Mesmo desenho do cabeçalho do "Consumo da medicina".
 */
export function CabecalhoAba({ Icone, titulo, resumo, fundo, className = "" }: {
  Icone: LucideIcon;
  titulo: string;
  resumo?: string;
  /** Degradê do quadradinho do ícone (CSS `background`). */
  fundo: string;
  className?: string;
}) {
  return (
    <header className={`flex items-center gap-3 ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm shadow-black/20" style={{ background: fundo }}>
        <Icone size={17} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-stone-900">{titulo}</h2>
        {resumo && <p className="text-xs text-stone-500">{resumo}</p>}
      </div>
    </header>
  );
}
