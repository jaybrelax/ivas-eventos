"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, FileImage, ShieldCheck, Undo2, UserPlus, Users, X } from "lucide-react";
import type { SituacaoPagamento } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Aviso, Carregando } from "@/components/ui";
import { BotaoConfirmar } from "@/components/Confirmar";
import {
  confirmarPagamentoAction, incluirParticipanteAction, isentarPagamentoAction, reabrirPagamentoAction, removerParticipanteAction,
} from "./participantes-actions";

export type PessoaParticipante = { id: string; nome: string; foto: string | null };
export type ItemParticipanteInscrito = PessoaParticipante & { pagamento: SituacaoPagamento; inscricaoId: string; comprovante: string | null };

export type DadosParticipantes = {
  eventoId: string;
  vagas: number;
  abertas: boolean;
  jaComecou: boolean;
  prazoPassou: boolean;
  prazoTexto: string;
  confirmados: ItemParticipanteInscrito[];
  espera: ItemParticipanteInscrito[];
  gerenciar: boolean;
  disponiveis: PessoaParticipante[];
  valorContribuicao: number | null;
  /** Contribuição só aparece para tipos que contam como ritual. */
  temContribuicao: boolean;
};

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAGAMENTO: Record<SituacaoPagamento, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-100 text-stone-600" },
  informado: { rotulo: "Informado", cor: "bg-amber-50 text-amber-700" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
};

/**
 * Participantes (público geral) de um evento: confirmados, lista de espera e pagamento.
 * Diferente da Guarnição, aqui não há candidatura pelo próprio usuário — quem se inscreve é
 * sempre pela página pública; este bloco é só para a coordenação acompanhar e gerenciar.
 */
export function Participantes({ dados }: { dados: DadosParticipantes }) {
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const [pendente, iniciar] = useTransition();
  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) => iniciar(async () => setMsg(await fn()));
  const livres = Math.max(0, dados.vagas - dados.confirmados.length);

  return (
    <section id="participantes" className="scroll-mt-6 space-y-5 cartao">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-mata-50 text-mata-600"><Users size={19} /></span>
          <div>
            <h2 className="cartao-titulo">Participantes</h2>
            <p className="cartao-sub">Inscrições do público geral, por ordem de chegada. Cancelamento até 4 h antes do início ({dados.prazoTexto}).</p>
          </div>
        </div>
        {!dados.abertas && <span className="chip bg-stone-100 text-stone-600">Inscrições fechadas</span>}
      </div>

      {msg && <Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso>}

      <div className="rounded-xl border border-stone-200/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-stone-900">Confirmados</p>
          <span className={`chip tabular-nums ${livres ? "bg-stone-100 text-stone-600" : "bg-mata-100 text-mata-800"}`}>
            {dados.confirmados.length}/{dados.vagas}
          </span>
        </div>
        {dados.confirmados.length ? (
          <ul className="space-y-1.5">
            {dados.confirmados.map((p) => (
              <Linha key={p.id} p={p} temContribuicao={dados.temContribuicao} pendente={pendente} dados={dados} rodar={rodar} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-400">Ninguém confirmado ainda.</p>
        )}

        {dados.espera.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-400 uppercase">
              <Clock size={12} /> Lista de espera
            </p>
            <ol className="space-y-1.5">
              {dados.espera.map((p, i) => (
                <Linha key={p.id} p={p} posicao={i + 1} temContribuicao={dados.temContribuicao} pendente={pendente} dados={dados} rodar={rodar} />
              ))}
            </ol>
          </div>
        )}

        {dados.gerenciar && <Incluir opcoes={dados.disponiveis} pendente={pendente} aoIncluir={(id) => rodar(() => incluirParticipanteAction(dados.eventoId, id))} />}
      </div>
    </section>
  );
}

function Linha({
  p, posicao, temContribuicao, pendente, dados, rodar,
}: {
  p: ItemParticipanteInscrito; posicao?: number; temContribuicao: boolean; pendente: boolean;
  dados: DadosParticipantes; rodar: (fn: () => Promise<{ ok?: string; erro?: string }>) => void;
}) {
  const pg = PAGAMENTO[p.pagamento];
  return (
    <li className="flex items-center gap-2.5 rounded-lg bg-stone-50/70 px-2 py-1.5">
      {posicao !== undefined && <span className="w-4 text-center text-xs font-semibold text-stone-400 tabular-nums">{posicao}</span>}
      <Avatar nome={p.nome} foto={p.foto} tamanho={28} className="ring-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}</span>
      {temContribuicao && <PagamentoMenu p={p} pg={pg} dados={dados} pendente={pendente} rodar={rodar} />}
      {/* Cancelar participação: só enquanto a contribuição não foi confirmada */}
      {dados.gerenciar && (p.pagamento === "pago" ? (
        <span
          className="btn-icone h-8 w-8 cursor-not-allowed opacity-35"
          title="Contribuição confirmada: reabra a contribuição para poder cancelar a participação"
          aria-label="Não é possível cancelar: contribuição confirmada"
        >
          <X size={15} />
        </span>
      ) : (
        <BotaoConfirmar
          className="btn-icone h-8 w-8 hover:bg-red-50 hover:text-red-700"
          title={`Cancelar a participação de ${p.nome}`}
          pergunta={`Cancelar a participação de ${p.nome}? Se houver lista de espera, a vaga passa para a próxima pessoa.`}
          confirmar="Sim, cancelar"
          disabled={pendente}
          aoConfirmar={() => rodar(() => removerParticipanteAction(dados.eventoId, p.id))}
        >
          <X size={15} />
        </BotaoConfirmar>
      ))}
    </li>
  );
}

function PagamentoMenu({
  p, pg, dados, pendente, rodar,
}: {
  p: ItemParticipanteInscrito; pg: { rotulo: string; cor: string }; dados: DadosParticipantes; pendente: boolean;
  rodar: (fn: () => Promise<{ ok?: string; erro?: string }>) => void;
}) {
  const [aberto, setAberto] = useState(false);
  if (!dados.gerenciar)
    return <span className={`chip shrink-0 ${pg.cor}`}>{pg.rotulo}</span>;
  return (
    <span className="relative shrink-0">
      <button type="button" onClick={() => setAberto((v) => !v)} className={`chip transition hover:opacity-80 ${pg.cor}`}>
        {pg.rotulo}
      </button>
      {aberto && (
        <span role="dialog" className="absolute top-full right-0 z-30 mt-1 w-52 animate-surgir rounded-xl border border-stone-200 bg-white p-1.5 text-left shadow-elevado">
          {p.comprovante && (
            <a
              href={`/api/comprovante/${p.comprovante}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              onClick={() => setAberto(false)}
            >
              <FileImage size={14} /> Ver comprovante
            </a>
          )}
          {p.pagamento !== "pago" && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => { setAberto(false); rodar(() => confirmarPagamentoAction(dados.eventoId, p.inscricaoId)); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2 size={14} /> Confirmar pago
            </button>
          )}
          {p.pagamento !== "isento" && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => { setAberto(false); rodar(() => isentarPagamentoAction(dados.eventoId, p.inscricaoId)); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50"
            >
              <ShieldCheck size={14} /> Marcar isento
            </button>
          )}
          {p.pagamento !== "pendente" && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => { setAberto(false); rodar(() => reabrirPagamentoAction(dados.eventoId, p.inscricaoId)); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              <Undo2 size={14} /> Reabrir pagamento
            </button>
          )}
        </span>
      )}
    </span>
  );
}

function Incluir({ opcoes, pendente, aoIncluir }: { opcoes: PessoaParticipante[]; pendente: boolean; aoIncluir: (id: string) => void }) {
  const [sel, setSel] = useState("");
  if (!opcoes.length)
    return <p className="mt-3 text-xs text-stone-400">Nenhum participante cadastrado para incluir.</p>;
  return (
    <div className="mt-3 flex gap-2">
      <select value={sel} onChange={(e) => setSel(e.target.value)} className="campo h-9 flex-1 text-sm" aria-label="Incluir participante">
        <option value="">Incluir participante…</option>
        {opcoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
      <button
        type="button"
        className="btn-secundario h-9 px-3"
        disabled={!sel || pendente}
        onClick={() => { aoIncluir(sel); setSel(""); }}
        aria-label="Incluir"
      >
        {pendente ? <Carregando /> : <UserPlus size={15} />}
      </button>
    </div>
  );
}
