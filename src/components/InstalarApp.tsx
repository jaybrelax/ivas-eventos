"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useInstalar } from "./useInstalar";

const CHAVE = "ivas-instalar-dispensado";

/**
 * Convite para instalar o app: no Android/Chrome usa o botão nativo de instalação;
 * no iPhone (que não tem esse botão) mostra o passo a passo do Safari. Some depois de instalado ou dispensado.
 */
export function InstalarApp() {
  const { disponivel, nativo, instalar } = useInstalar();
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    try {
      setDispensado(localStorage.getItem(CHAVE) === "1");
    } catch {
      setDispensado(false);
    }
  }, []);

  const dispensar = () => {
    setDispensado(true);
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {}
  };

  if (!disponivel || dispensado) return null;

  return (
    <div role="dialog" aria-label="Instalar o app do IVAS" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md animate-surgir rounded-2xl border border-stone-200 bg-white p-4 text-stone-900 shadow-elevado">
      <button type="button" onClick={dispensar} aria-label="Fechar" className="absolute top-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold text-stone-900">Instale o app do IVAS</p>
          {nativo ? (
            <p className="mt-0.5 text-sm text-stone-600">Acesse a agenda e a sua conta direto da tela inicial do celular.</p>
          ) : (
            <p className="mt-0.5 text-sm text-stone-600">
              Toque em <Share size={14} className="mx-0.5 inline -translate-y-px" aria-label="Compartilhar" /> e depois em <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
        </div>
      </div>
      {nativo && (
        <button
          type="button"
          onClick={instalar}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98]"
        >
          <Download size={16} /> Instalar app
        </button>
      )}
    </div>
  );
}
