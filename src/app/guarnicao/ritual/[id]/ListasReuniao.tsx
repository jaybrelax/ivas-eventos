"use client";

import { useState, useTransition } from "react";
import { CircleCheck, Crown, FileText, Shield, ShieldCheck, SquarePen, UserCheck, UserX, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import type { DadosReuniao, JustificadoReuniao, PessoaReuniao } from "@/lib/reuniao";
import { paragrafosTermo } from "@/lib/termo-justificativa";
import { definirGuardiaoDoDia, incluirGuardiaoNaReuniao, justificarPelaCoordenacao, retirarGuardiaoDaReuniao } from "../../actions";
import { Folha } from "../../Folha";
import { Popup } from "../../Popup";
import { FiguraJustica } from "./AcaoReuniao";
import { vibrar } from "../../nativo";

const MIN = 30;
const MAX = 200;

type Props = {
  dados: DadosReuniao;
  meuId: string;
  /** Coordenação ou mestre: inclui e retira guardiões da lista e marca o guardião do dia. */
  gerenciar: boolean;
  /** Coordenação: também registra e edita justificativas pelos guardiões. */
  coordenacao: boolean;
};

/** As três listas da reunião, iguais para todos: confirmados, justificaram e sem resposta. */
export function ListasReuniao({ dados, meuId, gerenciar, coordenacao }: Props) {
  const [pendente, iniciar] = useTransition();
  const [retirando, setRetirando] = useState<PessoaReuniao | null>(null);
  const [incluindo, setIncluindo] = useState<PessoaReuniao | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState("");
  const [verTermo, setVerTermo] = useState<JustificadoReuniao | null>(null);
  const [justificando, setJustificando] = useState<{ pessoa: PessoaReuniao; texto: string; existe: boolean } | null>(null);

  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>, aoOk?: () => void) =>
    iniciar(async () => {
      const r = await fn();
      if (r.erro) toast(r.erro);
      else {
        vibrar();
        if (r.ok) toast(r.ok, "ok");
        aoOk?.();
      }
    });

  const tamanho = justificando?.texto.trim().length ?? 0;
  const botao = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 active:scale-90 disabled:opacity-40";

  return (
    <div className={`space-y-4 ${pendente ? "opacity-70" : ""}`}>
      <Grupo icone={<CircleCheck size={17} className="text-emerald-600" />} titulo="Confirmados" separar total={dados.confirmados.length} vazio="Ninguém marcou presença ainda." pessoas={dados.confirmados} render={(p) => (
          <li key={p.id} className="flex items-center gap-3 py-1.5">
            <Avatar nome={p.nome} foto={p.foto} tamanho={40} className={`ring-2 ${p.guardiaoDoDia ? "ring-[#e0b04a]" : "ring-emerald-500/80"}`} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}<Marca p={p} />{p.guardiaoDoDia && <ShieldCheck size={14} aria-label="Guardião do dia" className="ml-1.5 inline align-middle text-amber-600" />}{p.id === meuId && <span className="font-normal text-stone-400"> · você</span>}</span>
            {coordenacao && (
              <button type="button" onClick={() => setJustificando({ pessoa: p, texto: "", existe: false })} aria-label={`Justificar ${p.nome}`} title="Justificar ausência" className={`${botao} active:bg-amber-50 active:text-amber-700`}>
                <FileText size={17} />
              </button>
            )}
            {gerenciar && p.podeSerGuardiaoDoDia && (
              <button
                type="button"
                disabled={pendente}
                onClick={() => rodar(() => definirGuardiaoDoDia(dados.eventoId, p.id, !p.guardiaoDoDia))}
                aria-pressed={p.guardiaoDoDia}
                aria-label={p.guardiaoDoDia ? `Tirar ${p.nome} de guardião do dia` : `Marcar ${p.nome} como guardião do dia`}
                title={p.guardiaoDoDia ? "Tirar de guardião do dia" : "Marcar como guardião do dia"}
                className={`${botao} ${p.guardiaoDoDia ? "bg-amber-50 text-amber-700" : "active:bg-amber-50 active:text-amber-700"}`}
              >
                {p.guardiaoDoDia ? <ShieldCheck size={18} /> : <Shield size={18} />}
              </button>
            )}
            {gerenciar && (
              <button type="button" onClick={() => setRetirando(p)} aria-label={`Retirar ${p.nome}`} className={`${botao} active:bg-red-50 active:text-red-600`}>
                <X size={18} />
              </button>
            )}
          </li>
        )}
      />

      <Grupo icone={<FileText size={17} className="text-amber-600" />} titulo="Justificaram" total={dados.justificados.length} vazio="Ninguém justificou ausência." pessoas={dados.justificados} render={(p) => (
          <li key={p.id} className="py-2">
            <div className="flex items-center gap-3">
              <Avatar nome={p.nome} foto={p.foto} tamanho={40} className="ring-2 ring-amber-400/80" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-800">{p.nome}<Marca p={p} />{p.id === meuId && <span className="font-normal text-stone-400"> · você</span>}</span>
                {p.por && <span className="block text-[11px] text-stone-400">registrada por {p.por}</span>}
              </span>
              {coordenacao && (
                <button type="button" onClick={() => setJustificando({ pessoa: p, texto: p.texto, existe: true })} aria-label={`Editar justificativa de ${p.nome}`} className={`${botao} active:bg-stone-100 active:text-stone-700`}>
                  <SquarePen size={17} />
                </button>
              )}
            </div>
            <TextoJustificativa texto={p.texto} aoAbrir={() => setVerTermo(p)} />
          </li>
        )}
      />

      <Grupo icone={<UserX size={17} className="text-stone-500" />} titulo="Sem resposta" total={dados.semResposta.length} vazio="Toda a equipe escalada respondeu." pessoas={dados.semResposta} render={(p) => (
          <li key={p.id} className="flex items-center gap-3 py-1.5">
            <Avatar nome={p.nome} foto={p.foto} tamanho={40} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{p.nome}<Marca p={p} />{p.id === meuId && <span className="font-normal text-stone-400"> · você</span>}</span>
            {coordenacao && (
              <button type="button" onClick={() => setJustificando({ pessoa: p, texto: "", existe: false })} aria-label={`Justificar ${p.nome}`} title="Justificar ausência" className={`${botao} active:bg-amber-50 active:text-amber-700`}>
                <FileText size={17} />
              </button>
            )}
            {gerenciar && (
              <button type="button" disabled={pendente} onClick={() => setIncluindo(p)} aria-label={`Marcar ${p.nome} como presente`} title="Marcar como presente" className={`${botao} active:bg-emerald-50 active:text-emerald-700`}>
                <UserCheck size={18} />
              </button>
            )}
          </li>
        )}
      />

      {gerenciar && dados.disponiveis.length > 0 && (
        <button type="button" onClick={() => setEscolhendo(true)} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-cartao ring-1 ring-stone-200/70">
          Adicionar participante à reunião
        </button>
      )}
      <Folha aberta={escolhendo} aoFechar={() => setEscolhendo(false)} titulo="Adicionar participante">
        <p className="mb-3 text-sm text-stone-600">Escolha alguém para registrar presença nesta reunião{coordenacao ? " ou justificar a ausência" : ""}.</p>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome" aria-label="Buscar participante" className="campo mb-3 w-full" />
        <div className="max-h-80 overflow-y-auto">
          {dados.disponiveis.filter((p) => p.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"))).map((p) => (
            <div key={p.id} className="flex items-center gap-2 border-b border-stone-100 py-2 text-sm text-stone-800">
              <Avatar nome={p.nome} foto={p.foto} tamanho={36} />
              <span className="min-w-0 flex-1 truncate">{p.nome}</span>
              <button type="button" onClick={() => { setEscolhendo(false); setIncluindo(p); }} aria-label={`Confirmar presença de ${p.nome}`} className="rounded-full p-2 text-emerald-700"><UserCheck size={18} /></button>
              {coordenacao && <button type="button" onClick={() => { setEscolhendo(false); setJustificando({ pessoa: p, texto: "", existe: false }); }} aria-label={`Justificar ${p.nome}`} className="rounded-full p-2 text-amber-700"><FileText size={18} /></button>}
            </div>
          ))}
        </div>
      </Folha>

      {/* Justificativa registrada pela coordenação */}
      <Folha aberta={!!justificando} aoFechar={() => setJustificando(null)} topo={FiguraJustica} cheia titulo={justificando ? `Justificativa de ${justificando.pessoa.nome.split(" ")[0]}` : undefined}>
        {justificando && (
          <>
            <p className="mb-3 text-sm text-stone-600">Registre o motivo da ausência. Ele aparece para todos os guardiões.</p>
            <textarea
              value={justificando.texto}
              onChange={(e) => setJustificando({ ...justificando, texto: e.target.value })}
              rows={5}
              maxLength={MAX}
              autoFocus
              placeholder="Descreva o motivo da ausência…"
              className="campo min-h-32 w-full resize-y rounded-2xl text-base"
            />
            <p className={`mt-1 text-right text-xs tabular-nums ${tamanho > 0 && tamanho < MIN ? "text-red-600" : "text-stone-400"}`}>
              {tamanho}/{MAX}{tamanho < MIN ? ` · mínimo ${MIN}` : ""}
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={tamanho < MIN || pendente}
                onClick={() => rodar(() => justificarPelaCoordenacao(dados.eventoId, justificando.pessoa.id, justificando.texto), () => setJustificando(null))}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white active:scale-[0.98] disabled:bg-stone-300 disabled:text-stone-600"
              >
                {pendente ? <><Carregando /> Salvando…</> : "Salvar justificativa"}
              </button>
              {justificando.existe && (
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => rodar(() => justificarPelaCoordenacao(dados.eventoId, justificando.pessoa.id, ""), () => setJustificando(null))}
                  className="h-12 rounded-2xl bg-red-50 text-sm font-semibold text-red-700"
                >
                  Remover justificativa
                </button>
              )}
              <button type="button" onClick={() => setJustificando(null)} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">Voltar</button>
            </div>
          </>
        )}
      </Folha>

      {/* Texto legal completo da justificativa de quem foi tocado */}
      <Popup aberto={!!verTermo} aoFechar={() => setVerTermo(null)} titulo="Texto legal">
        {verTermo && (
          <div className="space-y-3 rounded-2xl bg-stone-50 p-4 text-sm leading-snug text-stone-700 ring-1 ring-stone-200/70">
            {paragrafosTermo({ nome: verTermo.nome, dataEvento: dados.dataEvento, motivo: verTermo.texto, quando: verTermo.quando }).map((p, i) => (
              <p key={i} className={i === 0 ? "text-xs font-bold tracking-tight text-stone-900" : i === 2 ? "font-medium break-words whitespace-pre-line text-stone-900" : p.startsWith("Data:") ? "font-semibold text-stone-900" : undefined}>{p}</p>
            ))}
          </div>
        )}
      </Popup>

      {/* Confirmar a presença de alguém da lista */}
      <Folha aberta={!!incluindo} aoFechar={() => setIncluindo(null)} titulo={incluindo ? `Confirmar a presença de ${incluindo.nome.split(" ")[0]}?` : undefined}>
        <p className="text-sm text-stone-600">A pessoa passa para a lista de confirmados desta reunião.</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              const p = incluindo!;
              setIncluindo(null);
              rodar(() => incluirGuardiaoNaReuniao(dados.eventoId, p.id));
            }}
            className="h-12 rounded-2xl bg-emerald-600 text-sm font-bold text-white active:scale-[0.98]"
          >
            Sim, confirmar presença
          </button>
          <button type="button" onClick={() => setIncluindo(null)} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">Voltar</button>
        </div>
      </Folha>

      {/* Confirmar retirada */}
      <Folha aberta={!!retirando} aoFechar={() => setRetirando(null)} titulo={retirando ? `Retirar ${retirando.nome.split(" ")[0]}?` : undefined}>
        <p className="text-sm text-stone-600">A pessoa sai dos confirmados. Se estiver escalada, passa para “sem resposta”.</p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              const p = retirando!;
              setRetirando(null);
              rodar(() => retirarGuardiaoDaReuniao(dados.eventoId, p.id));
            }}
            className="h-12 rounded-2xl bg-red-600 text-sm font-bold text-white active:scale-[0.98]"
          >
            Sim, retirar
          </button>
          <button type="button" onClick={() => setRetirando(null)} className="h-12 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700">Voltar</button>
        </div>
      </Folha>
    </div>
  );
}

/** Justificativa recolhida em 2 linhas; o card todo é clicável e abre o texto legal completo num pop-up. */
function TextoJustificativa({ texto, aoAbrir }: { texto: string; aoAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-haspopup="dialog"
      className="mt-2 ml-[3.25rem] block w-[calc(100%-3.25rem)] cursor-pointer rounded-2xl bg-amber-50 px-3.5 py-2.5 text-left active:opacity-80"
    >
      <span className="line-clamp-2 text-[15px] leading-snug whitespace-pre-line break-words text-amber-900">{texto}</span>
      <span className="mt-2 flex justify-end">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">Ver justificativa</span>
      </span>
    </button>
  );
}

/** Identifica o mestre ao lado do nome: ícone da coroa e (Mestre) ou (Mestra). */
function Marca({ p }: { p: PessoaReuniao }) {
  if (!p.mestre) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-xs font-semibold text-emerald-700">
      <Crown size={12} /> ({p.sexo === "feminino" ? "Mestra" : "Mestre"})
    </span>
  );
}

/** Na presença, a equipe do ritual fica separada dos demais participantes. */
function Grupo<T extends PessoaReuniao>({ icone, titulo, total, vazio, pessoas, render, separar = false }: { icone: React.ReactNode; titulo: string; total: number; vazio: string; pessoas: T[]; render: (p: T) => React.ReactNode; separar?: boolean }) {
  const mestres = pessoas.filter((p) => p.mestre);
  const outros = pessoas.filter((p) => !p.mestre);
  const doDia = separar ? outros.filter((p) => p.guardiaoDoDia) : [];
  const guardioes = separar ? outros.filter((p) => !p.guardiaoDoDia && p.escalado) : outros;
  const participantes = separar ? outros.filter((p) => !p.guardiaoDoDia && !p.escalado) : [];
  const bloco = (rotulo: string, lista: T[], primeiro: boolean) => (
    <div key={rotulo} className={primeiro ? "mt-3" : "mt-4"}>
      <div className="flex items-center gap-2.5" role="separator" aria-label={rotulo}>
          <span aria-hidden className="h-px flex-1 bg-stone-200" />
          <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-stone-500 uppercase">
            {rotulo === "Mestres" && <Crown size={13} className="text-emerald-700" />}{rotulo.endsWith("do dia") && <ShieldCheck size={13} className="text-amber-600" />} {rotulo} · {lista.length}
          </span>
          <span aria-hidden className="h-px flex-1 bg-stone-200" />
        </div>
      <ul className="mt-1 divide-y divide-stone-100">{lista.map((p) => render(p))}</ul>
    </div>
  );
  return (
    <section className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
      <h3 className="flex items-center gap-2 text-base font-semibold text-stone-900">
        {icone} {titulo} <span className="text-sm font-medium text-stone-500 tabular-nums">· {total}</span>
      </h3>
      {total === 0 ? (
        <p className="mt-2 text-sm text-stone-400">{vazio}</p>
      ) : separar ? (
        <>
          {mestres.length > 0 && bloco("Mestres", mestres, true)}
          {doDia.length > 0 && bloco(doDia.length === 1 ? "Guardião do dia" : "Guardiões do dia", doDia, mestres.length === 0)}
          {guardioes.length > 0 && bloco("Guardiões escalados", guardioes, mestres.length === 0 && doDia.length === 0)}
          {participantes.length > 0 && bloco("Participantes", participantes, mestres.length === 0 && doDia.length === 0 && guardioes.length === 0)}
        </>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100">{[...mestres, ...guardioes].map((p) => render(p))}</ul>
      )}
    </section>
  );
}
