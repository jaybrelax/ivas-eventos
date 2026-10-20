import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Sem conexão — Instituto IVAS", robots: { index: false } };

/** Tela mostrada pelo app instalado quando não há internet (guardada pelo service worker). */
export default function SemConexao() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-mata-950 via-mata-900 to-stone-900 px-6 text-center text-white">
      <div className="max-w-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
          <WifiOff size={28} />
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold">Sem conexão</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-300">
          Não foi possível carregar esta página. Confira sua internet e tente de novo; a agenda e a sua conta precisam de conexão para mostrar as informações mais recentes.
        </p>
        <a href="/eventos" className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-ouro-400 to-ouro-600 px-6 text-sm font-bold text-mata-950 shadow-md">
          Tentar novamente
        </a>
      </div>
    </main>
  );
}
