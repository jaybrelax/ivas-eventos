"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Ticket, X } from "lucide-react";
import { toast } from "@/components/Toaster";
import { BuscaPessoa, type OpcaoPessoa } from "@/components/BuscaPessoa";
import { cederCreditoEquipeAction, desfazerCessaoAction } from "@/app/admin/creditos/actions";
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
  disponivel: "bg-violet-600 text-white hover:bg-violet-700",
  utilizado: "bg-emerald-500 text-white",
  bloqueado: "border-2 border-amber-400 bg-white text-amber-500",
  cancelado: "bg-stone-200 text-stone-400",
};
const ROTULO: Record<CreditoVisual["situacao"], string> = {
  disponivel: "Disponível",
  utilizado: "Utilizado",
  bloqueado: "Aguardando pagamento",
  cancelado: "Cancelado",
};

const estiloDe = (c: CreditoVisual) => (c.cedidoParaOutro ? "bg-sky-500 text-white" : ESTILO[c.situacao]);
const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

/**
 * Créditos da pessoa como ícones, com os pacotes acima. Toque num crédito disponível para escolher; "Ceder crédito"
 * pede o destinatário numa busca por nome. Crédito cedido a outra pessoa pode ser devolvido ao comprador.
 */
export function GerenciarCreditos({
  pessoaId, nome, creditos, pessoas, pacotes,
}: { pessoaId: string; nome: string; creditos: CreditoVisual[]; pessoas: PessoaVisual[]; pacotes: PacoteVisual[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [destino, setDestino] = useState(false);
  const [para, setPara] = useState("");
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = rolagem; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const fechar = () => { setAberto(false); setEscolhido(null); setDestino(false); setPara(""); };

  const disponiveis = creditos.filter((c) => c.situacao === "disponivel");
  const sel = creditos.find((c) => c.id === escolhido) ?? null;
  // Sem escolha, cede o primeiro disponível; com escolha, cede o escolhido (se ele estiver disponível)
  const alvo = escolhido ? (sel?.situacao === "disponivel" ? sel : null) : (disponiveis[0] ?? null);
  const devolvivel = !!sel && sel.cedidoParaOutro && sel.situacao === "disponivel";
  const opcoesDestino: OpcaoPessoa[] = pessoas.filter((p) => p.id !== pessoaId).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto ?? null }));

  const ceder = () => {
    if (!alvo || !para) return;
    iniciar(async () => {
      const r = await cederCreditoEquipeAction(alvo.id, para);
      if (r.erro) toast(r.erro, "erro");
      else toast(r.ok ?? "Crédito cedido.", "ok");
      setDestino(false);
      setPara("");
      setEscolhido(null);
      router.refresh();
    });
  };

  const devolver = () => {
    if (!sel) return;
    iniciar(async () => {
      const r = await desfazerCessaoAction(sel.id);
      if (r.erro) toast(r.erro, "erro");
      else toast(r.ok ?? "Crédito devolvido.", "ok");
      setEscolhido(null);
      router.refresh();
    });
  };

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

            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Créditos">
              {creditos.map((c) => {
                const ativo = escolhido === c.id;
                const clicavel = c.situacao === "disponivel" || c.cedidoParaOutro;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={ativo}
                    disabled={!clicavel || pendente}
                    onClick={() => { setEscolhido(ativo ? null : c.id); setDestino(false); setPara(""); }}
                    title={`Crédito ${c.rotulo} · ${c.detalhe} · ${c.cedidoParaOutro ? `cedido para ${c.titularNome ?? "outra pessoa"}` : ROTULO[c.situacao]}`}
                    className={`grid h-12 w-12 place-items-center rounded-full transition disabled:cursor-default ${estiloDe(c)} ${ativo ? "ring-2 ring-violet-500 ring-offset-2" : ""}`}
                  >
                    <Ticket size={20} aria-hidden />
                  </button>
                );
              })}
            </div>

            {pacotes.length > 0 && (
              <div className="space-y-2">
                {pacotes.map((p) => (
                  <div key={p.id} className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
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
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
              {!destino ? (
                <>
                  <p className="text-xs text-stone-500">
                    {sel ? `Crédito ${sel.rotulo} selecionado` : "Toque num crédito para escolher, ou ceda o primeiro disponível."}
                  </p>
                  <div className="flex gap-2">
                    {devolvivel && (
                      <button type="button" className="btn-secundario h-10" disabled={pendente} onClick={devolver}>Devolver ao comprador</button>
                    )}
                    <button type="button" className="btn-primario h-10" disabled={!alvo || pendente} onClick={() => setDestino(true)}>
                      <Send size={15} aria-hidden /> Ceder crédito
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-2.5">
                  <p className="text-sm text-stone-800">Ceder o crédito <strong>{alvo?.rotulo}</strong> para:</p>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <BuscaPessoa id="gc-para" name="para" opcoes={opcoesDestino} aoMudar={(o) => setPara(o?.id ?? "")} placeholder="Busque pelo nome…" />
                    </div>
                    <button type="button" className="btn-secundario h-10" disabled={pendente} onClick={() => { setDestino(false); setPara(""); }}>Voltar</button>
                    <button type="button" className="btn-primario h-10" disabled={!para || pendente} onClick={ceder}>
                      {pendente ? "Cedendo…" : "Confirmar cessão"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
