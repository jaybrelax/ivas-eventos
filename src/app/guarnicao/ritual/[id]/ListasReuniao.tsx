"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { CircleCheck, Crown, FileText, Pencil, UserCheck, UserX, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import type { DadosReuniao, PessoaReuniao } from "@/lib/reuniao";
import { incluirGuardiaoNaReuniao, justificarPelaCoordenacao, retirarGuardiaoDaReuniao } from "../../actions";
import { Folha } from "../../Folha";
import { vibrar } from "../../nativo";

const MIN = 30;
const MAX = 200;

type Props = {
  dados: DadosReuniao;
  meuId: string;
  /** Coordenação ou mestre: inclui e retira guardiões da lista. */
  gerenciar: boolean;
  /** Coordenação: também registra e edita justificativas pelos guardiões. */
  coordenacao: boolean;
};

/** As três listas da reunião, iguais para todos: confirmados, justificaram e sem resposta. */
export function ListasReuniao({ dados, meuId, gerenciar, coordenacao }: Props) {
  const [pendente, iniciar] = useTransition();
  const [retirando, setRetirando] = useState<PessoaReuniao | null>(null);
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
            <Avatar nome={p.nome} foto={p.foto} tamanho={40} className="ring-2 ring-emerald-500/80" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}<Marca p={p} />{p.id === meuId && <span className="font-normal text-stone-400"> · você</span>}</span>
            {coordenacao && (
              <button type="button" onClick={() => setJustificando({ pessoa: p, texto: "", existe: false })} aria-label={`Justificar ${p.nome}`} title="Justificar ausência" className={`${botao} active:bg-amber-50 active:text-amber-700`}>
                <FileText size={17} />
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
                  <Pencil size={16} />
                </button>
              )}
              {gerenciar && (
                <button type="button" disabled={pendente} onClick={() => rodar(() => incluirGuardiaoNaReuniao(dados.eventoId, p.id))} aria-label={`Marcar ${p.nome} como presente`} title="Marcar como presente" className={`${botao} active:bg-emerald-50 active:text-emerald-700`}>
                  <UserCheck size={18} />
                </button>
              )}
            </div>
            <TextoJustificativa texto={p.texto} />
          </li>
        )}
      />

      <Grupo icone={<UserX size={17} className="text-stone-500" />} titulo="Sem resposta" total={dados.semResposta.length} vazio="Todos os guardiões responderam." pessoas={dados.semResposta} render={(p) => (
          <li key={p.id} className="flex items-center gap-3 py-1.5">
            <Avatar nome={p.nome} foto={p.foto} tamanho={40} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{p.nome}<Marca p={p} />{p.id === meuId && <span className="font-normal text-stone-400"> · você</span>}</span>
            {coordenacao && (
              <button type="button" onClick={() => setJustificando({ pessoa: p, texto: "", existe: false })} aria-label={`Justificar ${p.nome}`} title="Justificar ausência" className={`${botao} active:bg-amber-50 active:text-amber-700`}>
                <FileText size={17} />
              </button>
            )}
            {gerenciar && (
              <button type="button" disabled={pendente} onClick={() => rodar(() => incluirGuardiaoNaReuniao(dados.eventoId, p.id))} aria-label={`Marcar ${p.nome} como presente`} title="Marcar como presente" className={`${botao} active:bg-emerald-50 active:text-emerald-700`}>
                <UserCheck size={18} />
              </button>
            )}
          </li>
        )}
      />

      {/* Justificativa registrada pela coordenação */}
      <Folha aberta={!!justificando} aoFechar={() => setJustificando(null)} titulo={justificando ? `Justificativa de ${justificando.pessoa.nome.split(" ")[0]}` : undefined}>
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

      {/* Confirmar retirada */}
      <Folha aberta={!!retirando} aoFechar={() => setRetirando(null)} titulo={retirando ? `Retirar ${retirando.nome.split(" ")[0]}?` : undefined}>
        <p className="text-sm text-stone-600">A pessoa sai dos confirmados e passa para “sem resposta”.</p>
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

/** Justificativa recolhida em 3 linhas; tocando, abre o texto completo (e tocando de novo, recolhe). */
function TextoJustificativa({ texto }: { texto: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [aberto, setAberto] = useState(false);
  const [corta, setCorta] = useState(false);
  // Só vira "tocável" se o texto realmente passa de 3 linhas
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !aberto) setCorta(el.scrollHeight > el.clientHeight + 1);
  }, [texto, aberto]);
  return (
    <button
      type="button"
      onClick={() => setAberto((a) => !a)}
      aria-expanded={aberto}
      className={`mt-2 ml-[3.25rem] block w-[calc(100%-3.25rem)] rounded-2xl bg-amber-50 px-3.5 py-2.5 text-left cursor-pointer active:opacity-80`}
    >
      <span ref={ref} className={`text-[15px] leading-relaxed whitespace-pre-line break-words text-amber-900 ${aberto ? "block" : "line-clamp-3"}`}>{texto}</span>
      {(corta || aberto) && <span className="mt-1 block text-right text-xs font-bold text-emerald-700">{aberto ? "Ver menos" : "Ver mais"}</span>}
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

/** Lista de pessoas: os mestres sempre vêm primeiro; com `separar`, cada grupo ganha o seu título (Mestres, depois Guardiões). */
function Grupo<T extends PessoaReuniao>({ icone, titulo, total, vazio, pessoas, render, separar = false }: { icone: React.ReactNode; titulo: string; total: number; vazio: string; pessoas: T[]; render: (p: T) => React.ReactNode; separar?: boolean }) {
  const mestres = pessoas.filter((p) => p.mestre);
  const guardioes = pessoas.filter((p) => !p.mestre);
  const bloco = (rotulo: string, lista: T[], primeiro: boolean) => (
    <div key={rotulo} className={primeiro ? "mt-3" : "mt-4"}>
      <div className="flex items-center gap-2.5" role="separator" aria-label={rotulo}>
          <span aria-hidden className="h-px flex-1 bg-stone-200" />
          <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-stone-500 uppercase">
            {rotulo === "Mestres" && <Crown size={13} className="text-emerald-700" />} {rotulo} · {lista.length}
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
          {guardioes.length > 0 && bloco("Guardiões", guardioes, mestres.length === 0)}
        </>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100">{[...mestres, ...guardioes].map((p) => render(p))}</ul>
      )}
    </section>
  );
}
