"use client";

import { useState, useTransition } from "react";
import { CircleCheck, Clock, Hourglass, Shield, UserPlus, X } from "lucide-react";
import type { Sexo } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Aviso, Carregando } from "@/components/ui";
import { BotaoConfirmar } from "@/components/Confirmar";
import { IconeGenero } from "@/components/genero";
import { adicionarGuardiaoAction, cancelarAction, candidatarAction, removerGuardiaoAction } from "./guarnicao-actions";

export type PessoaGuarnicao = { id: string; nome: string; foto: string | null };

export type DadosGuarnicao = {
  eventoId: string;
  vagas: Record<Sexo, number>;
  abertas: boolean;
  jaComecou: boolean;
  prazoPassou: boolean;
  prazoTexto: string;
  confirmados: Record<Sexo, PessoaGuarnicao[]>;
  espera: Record<Sexo, PessoaGuarnicao[]>;
  eu: { id: string; guardiao: boolean; sexo: Sexo | null; situacao: "confirmada" | "espera" | null; posicaoEspera: number | null };
  gerenciar: boolean;
  disponiveis: (PessoaGuarnicao & { sexo: Sexo })[];
};

const GRUPO: Record<Sexo, { titulo: string; um: string }> = {
  masculino: { titulo: "Guardiões", um: "guardião" },
  feminino: { titulo: "Guardiãs", um: "guardiã" },
};

/**
 * Guarnição do evento: vagas, candidatos, candidatura do guardião e ações do coordenador.
 * `embutido`: sem moldura nem cabeçalho, para ficar dentro do grupo "Guarnição" do formulário.
 */
export function Guarnicao({ dados, embutido = false }: { dados: DadosGuarnicao; embutido?: boolean }) {
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const [pendente, iniciar] = useTransition();
  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) => iniciar(async () => setMsg(await fn()));
  const { eu, vagas, confirmados, espera } = dados;
  const livresMeu = eu.sexo ? Math.max(0, vagas[eu.sexo] - confirmados[eu.sexo].length) : 0;

  return (
    <section id="guarnicao" className={`scroll-mt-6 space-y-5 ${embutido ? "" : "cartao"}`}>
      {embutido ? (
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-stone-500">
          <Shield size={14} className="text-stone-400" />
          Guardiões deste evento · cancelamento até 4 h antes do início ({dados.prazoTexto})
          {!dados.abertas && <span className="chip bg-stone-100 text-stone-600">Candidaturas fechadas</span>}
        </p>
      ) : (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-mata-50 text-mata-600"><Shield size={19} /></span>
          <div>
            <h2 className="cartao-titulo">Guarnição</h2>
            <p className="cartao-sub">Vagas por ordem de chegada. Cancelamento até 4 h antes do início ({dados.prazoTexto}).</p>
          </div>
        </div>
        {!dados.abertas && <span className="chip bg-stone-100 text-stone-600">Candidaturas fechadas</span>}
      </div>
      )}

      {msg && <Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso>}

      {/* Situação do próprio guardião */}
      {eu.guardiao && (
        <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
          {eu.situacao === "confirmada" ? (
            <Situacao icone={<CircleCheck size={18} className="text-emerald-600" />} texto="Você está confirmado(a) na guarnição deste evento.">
              <BotaoCancelar dados={dados} pendente={pendente} aoCancelar={() => rodar(() => cancelarAction(dados.eventoId))} />
            </Situacao>
          ) : eu.situacao === "espera" ? (
            <Situacao icone={<Hourglass size={18} className="text-amber-600" />} texto={`Você está na lista de espera (posição ${eu.posicaoEspera}). Entra sozinho(a) se alguém sair.`}>
              <BotaoCancelar dados={dados} pendente={pendente} aoCancelar={() => rodar(() => cancelarAction(dados.eventoId))} />
            </Situacao>
          ) : dados.jaComecou ? (
            <p className="text-sm text-stone-500">Este evento já começou.</p>
          ) : !eu.sexo ? (
            <p className="text-sm text-stone-600">Para se candidatar, informe seu gênero em <a href="/admin/perfil" className="font-medium text-mata-700 hover:underline">Meu perfil</a>.</p>
          ) : !dados.abertas ? (
            <p className="text-sm text-stone-500">As candidaturas deste evento estão fechadas.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-600">
                {livresMeu > 0
                  ? `${livresMeu} vaga${livresMeu > 1 ? "s" : ""} de ${GRUPO[eu.sexo].um} disponível${livresMeu > 1 ? "is" : ""}.`
                  : `As vagas de ${GRUPO[eu.sexo].um} estão preenchidas.`}
              </p>
              <button type="button" className="btn-primario" disabled={pendente} onClick={() => rodar(() => candidatarAction(dados.eventoId))}>
                {pendente ? <Carregando /> : <Shield size={16} />}
                {livresMeu > 0 ? `Quero servir como ${GRUPO[eu.sexo].um}` : "Entrar na lista de espera"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vagas por gênero */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["masculino", "feminino"] as const).map((sexo) => {
          const lista = confirmados[sexo];
          const fila = espera[sexo];
          const livres = Math.max(0, vagas[sexo] - lista.length);
          const disponiveis = dados.disponiveis.filter((p) => p.sexo === sexo);
          return (
            <div key={sexo} className="rounded-xl border border-stone-200/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-semibold text-stone-900">
                  <IconeGenero genero={sexo} size={16} /> {GRUPO[sexo].titulo}
                </p>
                <span className={`chip tabular-nums ${livres ? "bg-stone-100 text-stone-600" : "bg-mata-100 text-mata-800"}`}>
                  {lista.length}/{vagas[sexo]}
                </span>
              </div>

              <ul className="space-y-1.5">
                {lista.map((p) => (
                  <Linha key={p.id} p={p} destaque={p.id === eu.id}>
                    {dados.gerenciar && (
                      <BotaoConfirmar
                        className="btn-icone h-8 w-8 hover:bg-red-50 hover:text-red-700"
                        title={`Retirar ${p.nome}`}
                        pergunta={`Retirar ${p.nome} da guarnição? O primeiro da lista de espera assume a vaga.`}
                        confirmar="Retirar"
                        disabled={pendente}
                        aoConfirmar={() => rodar(() => removerGuardiaoAction(dados.eventoId, p.id))}
                      >
                        <X size={15} />
                      </BotaoConfirmar>
                    )}
                  </Linha>
                ))}
                {Array.from({ length: livres }, (_, i) => (
                  <li key={`livre-${i}`} className="flex h-10 items-center rounded-lg border border-dashed border-stone-200 px-3 text-sm text-stone-400">
                    Vaga livre
                  </li>
                ))}
              </ul>

              {fila.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-400 uppercase">
                    <Clock size={12} /> Lista de espera
                  </p>
                  <ol className="space-y-1.5">
                    {fila.map((p, i) => (
                      <Linha key={p.id} p={p} posicao={i + 1} destaque={p.id === eu.id}>
                        {dados.gerenciar && (
                          <BotaoConfirmar
                            className="btn-icone h-8 w-8 hover:bg-red-50 hover:text-red-700"
                            title={`Retirar ${p.nome}`}
                            pergunta={`Retirar ${p.nome} da lista de espera?`}
                            confirmar="Retirar"
                            disabled={pendente}
                            aoConfirmar={() => rodar(() => removerGuardiaoAction(dados.eventoId, p.id))}
                          >
                            <X size={15} />
                          </BotaoConfirmar>
                        )}
                      </Linha>
                    ))}
                  </ol>
                </div>
              )}

              {dados.gerenciar && <Incluir sexo={sexo} opcoes={disponiveis} pendente={pendente} aoIncluir={(id) => rodar(() => adicionarGuardiaoAction(dados.eventoId, id))} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Situacao({ icone, texto, children }: { icone: React.ReactNode; texto: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-sm font-medium text-stone-800">{icone}{texto}</p>
      {children}
    </div>
  );
}

function BotaoCancelar({ dados, pendente, aoCancelar }: { dados: DadosGuarnicao; pendente: boolean; aoCancelar: () => void }) {
  if (dados.prazoPassou)
    return <span className="text-xs text-stone-500">Prazo para cancelar encerrado ({dados.prazoTexto}). Fale com a coordenação.</span>;
  return (
    <BotaoConfirmar
      className="btn-secundario h-9 px-3 text-sm"
      disabled={pendente}
      pergunta="Cancelar sua participação? O primeiro da lista de espera assume a vaga."
      confirmar="Sim, cancelar"
      aoConfirmar={aoCancelar}
    >
      Cancelar participação
    </BotaoConfirmar>
  );
}

function Linha({ p, posicao, destaque, children }: { p: PessoaGuarnicao; posicao?: number; destaque?: boolean; children?: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${destaque ? "bg-mata-50 ring-1 ring-mata-200" : "bg-stone-50/70"}`}>
      {posicao !== undefined && <span className="w-4 text-center text-xs font-semibold text-stone-400 tabular-nums">{posicao}</span>}
      <Avatar nome={p.nome} foto={p.foto} tamanho={28} className="ring-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}{destaque && <span className="ml-1.5 text-xs font-normal text-mata-700">(você)</span>}</span>
      {children}
    </li>
  );
}

function Incluir({ sexo, opcoes, pendente, aoIncluir }: { sexo: Sexo; opcoes: PessoaGuarnicao[]; pendente: boolean; aoIncluir: (id: string) => void }) {
  const [sel, setSel] = useState("");
  if (!opcoes.length)
    return <p className="mt-3 text-xs text-stone-400">{sexo === "masculino" ? "Nenhum outro guardião disponível" : "Nenhuma outra guardiã disponível"} para incluir.</p>;
  return (
    <div className="mt-3 flex gap-2">
      <select value={sel} onChange={(e) => setSel(e.target.value)} className="campo h-9 flex-1 text-sm" aria-label={`Incluir ${GRUPO[sexo].um}`}>
        <option value="">Incluir {GRUPO[sexo].um}…</option>
        {opcoes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
      <button
        type="button"
        className="btn-secundario h-9 px-3"
        disabled={!sel || pendente}
        onClick={() => {
          aoIncluir(sel);
          setSel("");
        }}
        aria-label="Incluir"
      >
        <UserPlus size={15} />
      </button>
    </div>
  );
}
