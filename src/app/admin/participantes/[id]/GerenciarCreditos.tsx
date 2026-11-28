"use client";

import { useEffect, useState } from "react";
import { Ticket, X } from "lucide-react";
import Link from "next/link";
import { ROTULO_PACOTE } from "@/lib/creditos-rotulos";

export type CreditoVisual = {
  id: string;
  rotulo: string;
  situacao: "bloqueado" | "disponivel" | "utilizado" | "cancelado";
  /** Foi cedido a outra pessoa (o titular não é quem comprou). */
  cedidoParaOutro: boolean;
  titularNome: string | null;
  /** Pacote ou ritual onde foi usado, para o aviso ao passar o mouse. */
  detalhe: string;
};
export type PessoaVisual = { id: string; nome: string; foto?: string | null };
export type PacoteVisual = {
  id: string;
  nome: string;
  quantidade: number;
  valor: number | null;
  situacao: "pendente" | "informado" | "pago" | "cancelado";
  origem: "participante" | "equipe";
  criadoEm: string;
  /** Descrição do pacote no catálogo (ou a observação do lançamento). */
  descricao: string | null;
  disponiveis: number;
  bloqueados: number;
  utilizados: number;
  cedidos: number;
};

/** Cor de cada crédito, igual às bolinhas da ficha: violeta disponível, verde usado, âmbar aguardando, azul cedido. */
const ESTILO: Record<CreditoVisual["situacao"], string> = {
  disponivel: "disponivel",
  utilizado: "utilizado",
  bloqueado: "bloqueado",
  cancelado: "cancelado",
};
const ROTULO: Record<CreditoVisual["situacao"], string> = {
  disponivel: "Disponível",
  utilizado: "Utilizado",
  bloqueado: "Aguardando pagamento",
  cancelado: "Cancelado",
};

const estiloDe = (c: CreditoVisual) => (c.cedidoParaOutro ? "cedido" : ESTILO[c.situacao]);
const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

/**
 * Créditos da pessoa como ícones, com os pacotes acima. Só consulta: a cessão de crédito é feita pela própria pessoa,
 * no app dela (Minha conta). A equipe não cede nem devolve créditos.
 */
export function GerenciarCreditos({
  nome, creditos, pacotes,
}: { pessoaId: string; nome: string; creditos: CreditoVisual[]; pessoas?: PessoaVisual[]; pacotes: PacoteVisual[] }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = rolagem; };
  }, [aberto]);

  const fechar = () => setAberto(false);

  const disponiveis = creditos.filter((c) => c.situacao === "disponivel");

  return (
    <>
      <button type="button" className="btn-secundario h-10 text-sm" onClick={() => setAberto(true)}>
        <Ticket size={16} aria-hidden /> Gerenciar créditos <span className="rounded-full bg-stone-100 px-2 text-xs font-semibold tabular-nums text-stone-700">{creditos.length}</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Créditos de ${nome}`}>
          <div className="fixed inset-0 bg-stone-950/60" onClick={fechar} />
          <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Créditos de {nome}</h3>
                <p className="text-xs text-stone-500 tabular-nums">{disponiveis.length} disponíveis de {creditos.length}</p>
              </div>
              <button type="button" onClick={fechar} className="grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="credito-resumo-card rounded-xl border border-stone-200 bg-stone-50/60 p-3" role="group" aria-label="Créditos">
            <div className="flex flex-wrap gap-2.5">
              {creditos.map((c) => (
                <span
                  key={c.id}
                  title={`Crédito ${c.rotulo} · ${c.detalhe} · ${c.cedidoParaOutro ? `cedido para ${c.titularNome ?? "outra pessoa"}` : ROTULO[c.situacao]}`}
                  className={`credito-bolinha ${estiloDe(c)} grid h-12 w-12 place-items-center rounded-full`}
                >
                  <Ticket size={20} aria-hidden />
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-600" aria-label="Legenda dos créditos">
              {[["utilizado", "Usado"], ["cedido", "Cedido"], ["disponivel", "Disponível"], ...(creditos.some((c) => c.situacao === "bloqueado") ? [["bloqueado", "Aguardando pagamento"]] : [])].map(([estado, rotulo]) => <span key={estado} className="inline-flex items-center gap-1.5"><span className={`credito-bolinha ${estado} h-2.5 w-2.5 rounded-full`} aria-hidden />{rotulo}</span>)}
            </div>
            </div>

            {pacotes.length > 0 && (
              <div className="space-y-2">
                {pacotes.map((p) => (
                  <Link key={p.id} href={`/admin/creditos?pacote=${encodeURIComponent(p.id)}`} className="block rounded-xl border border-stone-200 bg-stone-50/60 p-3 transition hover:border-violet-300 hover:bg-violet-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500" aria-label={`Configurar pacote ${p.nome}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-900">
                        {p.nome} <span className="font-normal text-stone-500">· {p.quantidade} {p.quantidade === 1 ? "crédito" : "créditos"}</span>
                      </p>
                      <span className={`chip ${ROTULO_PACOTE[p.situacao].cor}`}>{ROTULO_PACOTE[p.situacao].rotulo}</span>
                    </div>
                    {p.descricao && <p className="mt-1 text-xs text-stone-600">{p.descricao}</p>}
                    <p className="mt-1.5 text-xs text-stone-500 tabular-nums">
                      {p.valor != null ? formatoReal(p.valor) : "Sem valor (cortesia)"} · {p.origem === "equipe" ? "lançado pela equipe" : "comprado pelo app"} · {data(p.criadoEm)}
                    </p>
                    <p className="mt-1 text-xs text-stone-500 tabular-nums">
                      {p.disponiveis} disponíveis · {p.utilizados} usados
                      {p.bloqueados ? ` · ${p.bloqueados} aguardando` : ""}
                      {p.cedidos ? ` · ${p.cedidos} cedidos` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
