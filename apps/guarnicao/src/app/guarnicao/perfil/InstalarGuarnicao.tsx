"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { useInstalar } from "@/components/useInstalar";
import { CHAVE_PRIMEIRO_ACESSO } from "../MarcarPrimeiroAcesso";

/** "Instalar o app" no perfil: botão nativo no Android/Chrome, passo a passo no iPhone. */
export function InstalarGuarnicao() {
  const { disponivel, nativo, instalar } = useInstalar();
  const [dica, setDica] = useState(false);
  // Só aparece a partir do segundo acesso: no primeiro, o app ainda está sendo conhecido
  const [jaAcessou, setJaAcessou] = useState(false);
  useEffect(() => {
    try {
      setJaAcessou(localStorage.getItem(CHAVE_PRIMEIRO_ACESSO) === "1");
    } catch {}
  }, []);
  if (!disponivel || !jaAcessou) return null;
  return (
    <section className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-[#1c1040] to-emerald-800 p-5 text-white shadow-cartao">
      <p className="font-semibold">Instale o app da Guarnição</p>
      <p className="mt-1 text-sm text-white/75">Abra direto da tela inicial, como um aplicativo.</p>
      <button
        type="button"
        onClick={() => (nativo ? void instalar() : setDica((v) => !v))}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#1c1040] active:scale-[0.98]"
      >
        <Download size={16} /> Instalar app
      </button>
      {dica && !nativo && (
        <p className="mt-3 text-xs leading-relaxed text-white/80">
          Toque em <Share size={12} className="mx-0.5 inline -translate-y-px" aria-label="Compartilhar" /> no Safari e depois em <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
    </section>
  );
}
