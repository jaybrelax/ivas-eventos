"use client";

import { useEffect } from "react";

/**
 * Páginas que não são o app (ex.: cadastro): o navegador não deve mostrar o aviso de "instalar o app".
 * Cancela o aviso automático; o app da Guarnição tem o próprio botão de instalar, no perfil.
 */
export function SemBannerInstalar() {
  useEffect(() => {
    const cancelar = (e: Event) => e.preventDefault();
    window.addEventListener("beforeinstallprompt", cancelar);
    return () => window.removeEventListener("beforeinstallprompt", cancelar);
  }, []);
  return null;
}
