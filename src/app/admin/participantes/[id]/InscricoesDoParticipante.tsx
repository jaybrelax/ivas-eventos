"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ItemInscricao } from "@/lib/inscricoes";
import { dataCurta, formatarIdRitual } from "@/lib/format";
import { urlImagem } from "@/lib/links";
import { Aviso } from "@/components/ui";
import { ModalInscricao } from "@/app/admin/eventos/ModalInscricao";
import type { PessoaParticipante } from "@/app/admin/eventos/Participantes";

const SITUACAO: Record<ItemInscricao["situacao"], { rotulo: string; cor: string }> = {
  confirmada: { rotulo: "Confirmado", cor: "bg-mata-100 text-mata-800" },
  espera: { rotulo: "Lista de espera", cor: "bg-amber-50 text-amber-700" },
  cancelada: { rotulo: "Cancelado", cor: "bg-stone-100 text-stone-500" },
};

const PAGAMENTO: Record<ItemInscricao["pagamento"], { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-100 text-stone-600" },
  informado: { rotulo: "Informado", cor: "bg-amber-50 text-amber-700" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
};

/** Inscrições da ficha do participante: card com a miniatura do evento; ao tocar, abre o modal da participação. */
export function InscricoesDoParticipante({
  itens, pessoa, valorContribuicao,
}: { itens: ItemInscricao[]; pessoa: PessoaParticipante; valorContribuicao: number | null }) {
  // Guarda só o id: depois de cada ação o modal mostra os dados atualizados da página
  const [aberta, setAberta] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const atual = itens.find((i) => i.inscricaoId === aberta);

  if (!itens.length) return <p className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">Nenhuma inscrição ainda.</p>;

  return (
    <>
      {msg && <div className="px-5 pt-4 sm:px-6"><Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso></div>}
      <ul className="grid gap-2.5 p-4 sm:p-5">
        {itens.map((i) => (
          <li key={i.inscricaoId}>
            <button
              type="button"
              onClick={() => { setMsg(undefined); setAberta(i.inscricaoId); }}
              className="group flex w-full items-center gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-2.5 pr-3 text-left transition hover:border-mata-200 hover:bg-mata-50/40 hover:shadow-sm"
            >
              {/* Miniatura quadrada da capa, na versão reduzida */}
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mata-900 ring-1 ring-stone-200">
                {i.capa && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagem(i.capa, 160)} width={64} height={64} loading="lazy" decoding="async" alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold text-stone-900">
                  {i.ritualNumero ? `${formatarIdRitual(i.ritualNumero, null, null)} — ` : ""}{i.titulo}
                </span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  {dataCurta(i.data)} às {i.hora}{i.passado ? " · realizado" : ""}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className={`chip ${SITUACAO[i.situacao].cor}`}>{SITUACAO[i.situacao].rotulo}</span>
                  {i.temContribuicao && <span className={`chip ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-mata-600" />
            </button>
          </li>
        ))}
      </ul>

      {atual && (
        <ModalInscricao
          p={{
            ...pessoa,
            pagamento: atual.pagamento, inscricaoId: atual.inscricaoId, comprovante: atual.comprovante,
            inscritoEm: atual.inscritoEm, valor: atual.valor, informadoEm: atual.informadoEm, pagoEm: atual.pagoEm,
            contato: null,
          }}
          situacaoInscricao={atual.situacao}
          dados={{ eventoId: atual.eventoId, temContribuicao: atual.temContribuicao, valorContribuicao, gerenciar: true }}
          evento={{
            titulo: atual.ritualNumero ? `Ritual ${formatarIdRitual(atual.ritualNumero, null, null)}: ${atual.titulo}` : atual.titulo,
            quando: `${dataCurta(atual.data)} às ${atual.hora}${atual.passado ? " · realizado" : ""}`,
            capa: atual.capa,
            href: `/admin/eventos/${atual.eventoId}`,
          }}
          podeCancelar={!atual.passado}
          fechar={() => setAberta(null)}
          aoCancelar={(r) => { setAberta(null); setMsg(r); }}
        />
      )}
    </>
  );
}
