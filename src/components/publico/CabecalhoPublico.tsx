import Link from "next/link";
import { Calendar } from "lucide-react";
import type { Instituto } from "@/lib/types";
import { MarcaInstituto } from "@/components/Marca";

export function CabecalhoPublico({ instituto }: { instituto: Instituto }) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 shadow-2xs backdrop-blur-md transition-all">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:h-24 sm:px-6 lg:px-8">
        {/* Marca / Logo colorida sem legenda */}
        <Link href="/eventos" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
          <MarcaInstituto instituto={instituto} altura={56} fundoClaro />
        </Link>

        {/* Navegação: apenas Agenda de Rituais (link do Painel removido e mantido apenas no rodapé) */}
        <nav className="flex items-center gap-3">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200/80 bg-stone-50/80 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:border-mata-300 hover:bg-stone-100 hover:text-mata-800 sm:text-sm"
          >
            <Calendar size={15} className="text-mata-600" />
            <span className="sm:hidden">Agenda</span>
            <span className="hidden sm:inline">Agenda de Rituais</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
