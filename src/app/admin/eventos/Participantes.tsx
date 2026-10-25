"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Clock, Paperclip, UserPlus, Users } from "lucide-react";
import type { Sexo, SituacaoPagamento } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Aviso, Carregando } from "@/components/ui";
import { incluirParticipanteAction } from "./participantes-actions";
import { ModalInscricao } from "./ModalInscricao";

export type PessoaParticipante = { id: string; nome: string; foto: string | null };
/** Contato do participante: só vem preenchido para quem gerencia o evento. */
export type ContatoParticipante = { email: string; telefone: string | null; cidade: string | null; estado: string | null; sexo: Sexo | null; desde: string };
export type ItemParticipanteInscrito = PessoaParticipante & {
  pagamento: SituacaoPagamento; inscricaoId: string; comprovante: string | null;
  inscritoEm: string; valor: number | null; informadoEm: string | null; pagoEm: string | null;
  contato: ContatoParticipante | null;
};

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
  // Modal da inscrição: guarda só o id, para mostrar sempre os dados atualizados depois de cada ação
  const [aberta, setAberta] = useState<string | null>(null);
  const posEspera = dados.espera.findIndex((p) => p.inscricaoId === aberta);
  const atual = dados.confirmados.find((p) => p.inscricaoId === aberta) ?? dados.espera[posEspera];

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
              <Linha key={p.id} p={p} temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} abrir={() => setAberta(p.inscricaoId)} />
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
                <Linha key={p.id} p={p} posicao={i + 1} temContribuicao={dados.temContribuicao} gerenciar={dados.gerenciar} abrir={() => setAberta(p.inscricaoId)} />
              ))}
            </ol>
          </div>
        )}

        {dados.gerenciar && <Incluir opcoes={dados.disponiveis} pendente={pendente} aoIncluir={(id) => rodar(() => incluirParticipanteAction(dados.eventoId, id))} />}
      </div>

      {atual && (
        <ModalInscricao
          p={atual}
          posicaoEspera={posEspera >= 0 ? posEspera + 1 : undefined}
          dados={dados}
          fechar={() => setAberta(null)}
          aoCancelar={(r) => { setAberta(null); setMsg(r); }}
        />
      )}
    </section>
  );
}

/** Linha da lista: quem gerencia toca para abrir o modal da inscrição (contato, contribuição, comprovante e cancelamento). */
function Linha({
  p, posicao, temContribuicao, gerenciar, abrir,
}: {
  p: ItemParticipanteInscrito; posicao?: number; temContribuicao: boolean; gerenciar: boolean; abrir: () => void;
}) {
  const pg = PAGAMENTO[p.pagamento];
  const conteudo = (
    <>
      {posicao !== undefined && <span className="w-4 text-center text-xs font-semibold text-stone-400 tabular-nums">{posicao}</span>}
      <Avatar nome={p.nome} foto={p.foto} tamanho={28} className="ring-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}</span>
      {temContribuicao && p.comprovante && <Paperclip size={14} className="shrink-0 text-stone-400" aria-label="Comprovante anexado" />}
      {temContribuicao && <span className={`chip shrink-0 ${pg.cor}`}>{pg.rotulo}</span>}
    </>
  );
  if (!gerenciar)
    return <li className="flex items-center gap-2.5 rounded-lg bg-stone-50/70 px-2 py-1.5">{conteudo}</li>;
  return (
    <li>
      <button
        type="button"
        onClick={abrir}
        className="group flex w-full items-center gap-2.5 rounded-lg bg-stone-50/70 px-2 py-1.5 text-left transition hover:bg-mata-50/70 hover:ring-1 hover:ring-mata-200"
        aria-label={`Gerenciar a inscrição de ${p.nome}`}
      >
        {conteudo}
        <ChevronRight size={16} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-mata-600" />
      </button>
    </li>
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
