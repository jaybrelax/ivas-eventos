"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVALO_MS = 6000;

/**
 * Mantém a página do evento em tempo real: de tempos em tempos (e ao voltar para a aba) pede os dados
 * novos ao servidor, e a tela se atualiza com o que outras pessoas fizeram. Não atualiza enquanto a
 * aba está em segundo plano, com um modal aberto, com um campo em edição ou com gravação em curso,
 * para nunca atrapalhar quem está mexendo.
 */
export function AtualizarAoVivo() {
  const router = useRouter();

  useEffect(() => {
    const ocupado = () => {
      if (document.documentElement.dataset.gravando) return true;
      if (document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"]')) return true;
      const a = document.activeElement;
      return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || (a as HTMLElement).isContentEditable);
    };
    const atualizar = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine || ocupado()) return;
      router.refresh();
    };
    const id = setInterval(atualizar, INTERVALO_MS);
    document.addEventListener("visibilitychange", atualizar);
    window.addEventListener("online", atualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atualizar);
      window.removeEventListener("online", atualizar);
    };
  }, [router]);

  return null;
}
