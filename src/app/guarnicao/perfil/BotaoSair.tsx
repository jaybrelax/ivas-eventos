"use client";

import { LogOut } from "lucide-react";

/** Sair: antes, apaga as telas da Guarnição guardadas para uso sem internet neste aparelho. */
export function BotaoSair({ sair, rotulo = "Sair" }: { sair: () => Promise<void>; rotulo?: string }) {
  return (
    <form
      action={async () => {
        try {
          const chaves = await caches.keys();
          await Promise.all(chaves.filter((k) => k.endsWith("-guarnicao")).map((k) => caches.delete(k)));
        } catch {}
        await sair();
      }}
      className="mx-4 mt-4 mb-6"
    >
      <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-red-700 shadow-cartao ring-1 ring-stone-200/70 active:scale-[0.98]">
        <LogOut size={17} /> {rotulo}
      </button>
    </form>
  );
}
