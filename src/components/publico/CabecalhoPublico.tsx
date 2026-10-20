import Link from "next/link";
import { Calendar, LogIn } from "lucide-react";
import type { Instituto } from "@/lib/types";
import { MarcaInstituto } from "@/components/Marca";
import { getUsuario } from "@/lib/auth";
import { sair } from "@/app/login/actions";
import { MenuUsuario } from "./MenuUsuario";

/** `mostrarAgenda`: false na própria agenda (o botão seria redundante lá). */
export async function CabecalhoPublico({ instituto, mostrarAgenda = true }: { instituto: Instituto; mostrarAgenda?: boolean }) {
  const u = await getUsuario();
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 shadow-2xs backdrop-blur-md transition-all">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:h-24 sm:px-6 lg:px-8">
        {/* Marca / Logo colorida sem legenda — 20% menor no mobile */}
        <Link href="/eventos" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
          <span className="sm:hidden"><MarcaInstituto instituto={instituto} altura={45} fundoClaro /></span>
          <span className="hidden sm:block"><MarcaInstituto instituto={instituto} altura={56} fundoClaro /></span>
        </Link>

        {/* Logado: avatar com o menu da conta. Visitante: só o link da agenda (painel fica no rodapé). */}
        <nav className="flex items-center gap-3">
          {u ? (
            <MenuUsuario nome={u.nome} foto={u.foto} sair={sair} />
          ) : (
            <>
              {mostrarAgenda && (
              <Link
                href="/eventos"
                aria-label="Agenda de Rituais"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200/80 bg-stone-50/80 px-3 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:border-mata-300 hover:bg-stone-100 hover:text-mata-800 sm:px-3.5 sm:text-sm"
              >
                <Calendar size={15} className="text-mata-600" />
                <span className="sm:hidden">Agenda</span>
                <span className="hidden sm:inline">Agenda de Rituais</span>
              </Link>
              )}
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xl border-[1.5px] border-mata-600 bg-white px-3.5 py-2 text-xs font-bold text-mata-700 shadow-[0_6px_18px_-10px_rgb(85_52_127/0.8)] transition hover:border-mata-700 hover:bg-mata-700 hover:text-white active:scale-[0.98] sm:text-sm"
              >
                <LogIn size={15} className="transition-transform group-hover:translate-x-0.5" /> Entrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
