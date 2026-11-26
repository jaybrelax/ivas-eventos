"use client";

import { useCallback, useEffect, useState } from "react";
import { DepoimentosRitual } from "@/components/DepoimentosRitual";
import type { resumoDepoimentos } from "@/lib/depoimentos";

type Resumo = Awaited<ReturnType<typeof resumoDepoimentos>>;

export function CarregarAvaliacoesRitual({ eventoId }: { eventoId: string }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const resposta = await fetch(`/api/admin/eventos/${encodeURIComponent(eventoId)}/avaliacoes`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Falha ao carregar avaliações");
      setResumo(await resposta.json() as Resumo);
    } catch {
      setErro(true);
    }
  }, [eventoId]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (resumo) return <DepoimentosRitual resumo={resumo} />;
  if (erro) return <div className="p-5 text-center"><p role="alert" className="text-sm text-stone-600">Não foi possível carregar as avaliações.</p><button type="button" onClick={() => void carregar()} className="btn-secundario mt-3 min-h-10">Tentar novamente</button></div>;
  return <div className="m-4 h-32 animate-pulse rounded-2xl bg-stone-100" aria-label="Carregando avaliações" />;
}
