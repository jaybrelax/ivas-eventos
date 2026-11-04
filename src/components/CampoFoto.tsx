"use client";

import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { iniciais } from "./Avatar";
import { useImagem } from "./useImagem";

/** Envio da foto de perfil com prévia. Manda `foto` (arquivo) e `remover_foto`. */
export function CampoFoto({ nome, fotoAtual, tamanho = 88 }: { nome: string; fotoAtual?: string | null; tamanho?: number }) {
  const { local, erro, otimizando, escolher, limpar } = useImagem("foto");
  const [remover, setRemover] = useState(false);
  const preview = local ?? (fotoAtual && !remover ? `/api/arquivo/${fotoAtual}` : null);

  return (
    <div className="flex items-center gap-4">
      <label className="group relative cursor-pointer" style={{ width: tamanho, height: tamanho }} title="Escolher foto">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto de perfil" className="h-full w-full rounded-full object-cover ring-4 ring-white shadow-cartao" />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-stone-100 to-stone-200 text-xl font-bold text-stone-500 ring-4 ring-white shadow-cartao">
            {iniciais(nome || "?")}
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center rounded-full bg-mata-950/0 text-white opacity-0 transition group-hover:bg-mata-950/45 group-hover:opacity-100">
          <Camera size={22} />
        </span>
        <span className="absolute -right-0.5 -bottom-0.5 grid h-8 w-8 place-items-center rounded-full bg-mata-700 text-white shadow-md ring-2 ring-white">
          <Camera size={15} />
        </span>
        <input
          type="file"
          name="foto"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            escolher(e.currentTarget, f);
            if (f) setRemover(false);
          }}
        />
      </label>
      <div className="text-sm">
        <p className="font-medium text-stone-800">Foto de perfil</p>
        <p className="text-xs text-stone-500">{otimizando ? "Otimizando a foto…" : "PNG, JPG ou WEBP · reduzida automaticamente"}</p>
        {erro && <p className="mt-1.5 text-xs text-red-700">{erro}</p>}
        {(local || (fotoAtual && !remover)) && (
          <button
            type="button"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-700"
            onClick={(e) => {
              limpar(e.currentTarget.closest("form")?.querySelector<HTMLInputElement>('input[name="foto"]'));
              if (fotoAtual) setRemover(true);
            }}
          >
            <Trash2 size={12} /> Remover foto
          </button>
        )}
        {remover && <p className="mt-1.5 text-xs text-red-700">A foto será removida ao salvar.</p>}
        {remover && <input type="hidden" name="remover_foto" value="on" />}
      </div>
    </div>
  );
}
