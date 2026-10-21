"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "@/components/Toaster";

/** Copia o link público do evento para a área de transferência. */
export function CopiarLinkPublico({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Navegadores sem a API de área de transferência (ou sem permissão): cai no método antigo
      const campo = document.createElement("textarea");
      campo.value = url;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand("copy");
      campo.remove();
      if (!ok) return toast("Não foi possível copiar. Copie pelo botão Ver público.");
    }
    setCopiado(true);
    toast("Link público copiado.", "ok");
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button type="button" onClick={copiar} className="btn-secundario" title={url}>
      {copiado ? <Check size={16} /> : <Link2 size={16} />} {copiado ? "Copiado" : "Copiar link"}
    </button>
  );
}
