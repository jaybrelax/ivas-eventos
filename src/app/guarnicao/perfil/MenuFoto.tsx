"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { EllipsisVertical, ImagePlus, Trash2 } from "lucide-react";
import { RecorteFoto } from "@/components/RecorteFoto";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { trocarFotoGuarnicao } from "../actions";

/**
 * Foto do perfil: tocar na própria foto abre o seletor de imagem; o menu de três pontinhos no canto
 * do cartão tem "Enviar foto" e "Remover foto".
 */
export function MenuFoto({ temFoto, avatar }: { temFoto: boolean; avatar: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  // Foto escolhida, aguardando o recorte circular antes de enviar
  const [escolhida, setEscolhida] = useState<File | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
    };
  }, [aberto]);

  const enviar = (fd: FormData) =>
    iniciar(async () => {
      const r = await trocarFotoGuarnicao(fd);
      if (r.erro) toast(r.erro);
      else if (r.ok) toast(r.ok, "ok");
    });

  return (
    <>
      <button
        type="button"
        aria-label="Trocar foto"
        disabled={pendente}
        onClick={() => arquivo.current?.click()}
        className="relative shrink-0 rounded-full transition active:scale-95 disabled:opacity-60"
      >
        {avatar}
        {pendente && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/35">
            <Carregando />
          </span>
        )}
      </button>
    <div ref={caixa} className="absolute top-3 right-3">
      <button
        type="button"
        aria-label="Opções da foto"
        aria-expanded={aberto}
        disabled={pendente}
        onClick={() => setAberto((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-full text-stone-500 transition active:scale-90 active:bg-stone-100 disabled:opacity-50"
      >
        <EllipsisVertical size={20} />
      </button>
      {aberto && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-48 animate-surgir overflow-hidden rounded-2xl bg-white p-1.5 shadow-elevado ring-1 ring-stone-200">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              arquivo.current?.click();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 active:bg-stone-100"
          >
            <ImagePlus size={17} className="text-emerald-700" /> Enviar foto
          </button>
          {temFoto && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAberto(false);
                const fd = new FormData();
                fd.set("remover_foto", "on");
                enviar(fd);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 active:bg-red-50"
            >
              <Trash2 size={17} /> Remover foto
            </button>
          )}
        </div>
      )}
    </div>
            <input
          ref={arquivo}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (!f.type.startsWith("image/")) return toast("Escolha uma imagem PNG, JPG ou WEBP.");
            setEscolhida(f);
          }}
        />
      {escolhida && (
        <RecorteFoto
          arquivo={escolhida}
          aoCancelar={() => setEscolhida(null)}
          aoConfirmar={(recortada) => {
            setEscolhida(null);
            const fd = new FormData();
            fd.set("foto", recortada);
            enviar(fd);
          }}
        />
      )}
    </>
  );
}
