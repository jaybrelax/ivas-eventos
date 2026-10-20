"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const CHAVE = "ivas-cookies-ok";

/** Aviso de cookies no site público: aparece até a pessoa tocar em "Ok, entendi" (lembrado neste navegador). */
export function AvisoCookies() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE) !== "1") setVisivel(true);
    } catch {
      setVisivel(true);
    }
  }, []);

  if (!visivel) return null;

  const aceitar = () => {
    setVisivel(false);
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl animate-surgir flex-col gap-3 rounded-2xl border border-white/20 bg-mata-950/45 p-4 text-white shadow-elevado backdrop-blur-md backdrop-saturate-150 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      {/* Ícone e texto lado a lado também no celular; o botão vai embaixo */}
      <div className="flex flex-1 items-start gap-3 sm:items-center sm:gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ouro-400/15 text-ouro-300 ring-1 ring-ouro-400/25 sm:h-11 sm:w-11">
        <Cookie size={20} />
      </span>
      <p className="flex-1 text-sm leading-relaxed text-white/75">
        Usamos cookies essenciais para manter seu login e fazer o site funcionar. Saiba mais na nossa{" "}
        <Link href="/privacidade" className="font-semibold text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
          Política de Privacidade
        </Link>
        .
      </p>
      </div>
      <button
        type="button"
        onClick={aceitar}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-mata-950 shadow-md transition hover:bg-ouro-100 active:scale-[0.98]"
      >
        Ok, entendi
      </button>
    </div>
  );
}
