"use client"; // Error boundaries precisam ser Client Components

import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

// retry() busca de novo os dados do servidor e redesenha a página; reset() só redesenharia o que já veio.
export default function ErroPainel({ error, retry }: { error: unknown; retry: () => void }) {
  const [tentando, setTentando] = useState(false);

  useEffect(() => {
    console.error(error);
    setTentando(false);
  }, [error]);

  return (
    <div className="cartao mx-auto mt-10 flex max-w-md flex-col items-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
        <WifiOff className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h2 className="cartao-titulo">Não foi possível falar com o servidor</h2>
        <p className="cartao-sub">A conexão falhou ao buscar os dados. Geralmente é passageiro: tente de novo em instantes.</p>
      </div>
      <button
        type="button"
        className="btn-primario"
        disabled={tentando}
        onClick={() => {
          setTentando(true);
          retry();
          // Se falhar de novo com o mesmo erro o efeito não roda; libera o botão mesmo assim.
          setTimeout(() => setTentando(false), 5000);
        }}
      >
        <RefreshCw className={`h-4 w-4 ${tentando ? "animate-spin" : ""}`} aria-hidden />
        {tentando ? "Tentando…" : "Tentar de novo"}
      </button>
    </div>
  );
}
