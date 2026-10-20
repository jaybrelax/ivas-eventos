"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, Hash, Palette, Plus, SquarePen, Trash2, X } from "lucide-react";
import { IconeTipo } from "@/components/IconeTipo";
import { SeletorIcone } from "./TiposEvento";
import { excluirItem, salvarItem, type Resultado } from "./actions";
import { Aviso, Carregando } from "@/components/ui";
import { BotaoConfirmar } from "@/components/Confirmar";

export type TagItem = { $id: string; nome: string; cor: string | null; icone: string | null; descricao: string | null; ativo: boolean };

const CORES = ["#7c3aed", "#4f46e5", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#57534e"];
const LIMITE = 3000;

/** Tags de evento: cada uma tem um texto que complementa a descrição dos eventos que a usam. */
export function TagsEvento({ itens, contagem }: { itens: TagItem[]; contagem: Record<string, number> }) {
  const [aberto, setAberto] = useState<TagItem | "nova" | null>(null);
  return (
    <section id="tags" className="cartao">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="cartao-titulo">Tags de evento</h2>
          <p className="cartao-sub">
            O texto de cada tag é somado à descrição de todos os eventos que usam a tag, mesmo quando o evento já tem descrição própria.
          </p>
        </div>
        <button type="button" onClick={() => setAberto("nova")} className="btn-primario h-9 shrink-0 px-3.5 text-sm">
          <Plus size={16} /> Nova tag
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {itens.map((t) => {
          const n = contagem[t.$id] ?? 0;
          const cor = t.cor || CORES[0];
          return (
            <button
              key={t.$id}
              type="button"
              onClick={() => setAberto(t)}
              className={`group flex flex-col gap-2.5 rounded-2xl border bg-white p-4 text-left shadow-cartao transition hover:-translate-y-px hover:shadow-elevado ${
                t.ativo ? "border-stone-200/80 hover:border-stone-300" : "border-dashed border-stone-300 opacity-70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${cor}1a`, color: cor }}>
                  <IconeTipo nome={t.icone || "hash"} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-900">{t.nome}</p>
                  <p className="text-xs text-stone-500 tabular-nums">{n} evento{n === 1 ? "" : "s"}</p>
                </div>
                <SquarePen size={16} className="shrink-0 text-stone-300 transition group-hover:text-stone-500" aria-hidden />
              </div>
              <p className={`line-clamp-3 text-sm whitespace-pre-line ${t.descricao ? "text-stone-600" : "text-stone-400 italic"}`}>
                {t.descricao || "Sem texto"}
              </p>
              {!t.ativo && <span className="chip w-fit bg-stone-100 text-stone-500">Inativa</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAberto("nova")}
          className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 text-sm font-medium text-stone-500 transition hover:border-mata-300 hover:bg-mata-50/40 hover:text-mata-700"
        >
          <Plus size={20} /> Nova tag de evento
        </button>
      </div>

      {aberto && (
        <PainelTag
          key={aberto === "nova" ? "nova" : aberto.$id}
          tag={aberto === "nova" ? null : aberto}
          usos={aberto === "nova" ? 0 : (contagem[aberto.$id] ?? 0)}
          onFechar={() => setAberto(null)}
        />
      )}
    </section>
  );
}

function PainelTag({ tag, usos, onFechar }: { tag: TagItem | null; usos: number; onFechar: () => void }) {
  const [nome, setNome] = useState(tag?.nome ?? "");
  const [cor, setCor] = useState(tag?.cor ?? CORES[0]);
  const [icone, setIcone] = useState(tag?.icone || "hash");
  const [texto, setTexto] = useState(tag?.descricao ?? "");
  const [erroExcluir, setErroExcluir] = useState<string>();
  const [excluindo, iniciar] = useTransition();
  const [estado, acao, salvando] = useActionState(async (prev: Resultado, form: FormData) => {
    const r = await salvarItem("tags", prev, form);
    if (r?.ok) onFechar();
    return r;
  }, undefined);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={tag ? `Editar ${tag.nome}` : "Nova tag de evento"}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-mata-950/40 backdrop-blur-[2px]" onClick={onFechar} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg animate-surgir flex-col bg-white shadow-elevado">
        <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl transition" style={{ background: `${cor}1a`, color: cor }}>
            <IconeTipo nome={icone} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="cartao-titulo truncate">{tag ? "Editar tag" : "Nova tag de evento"}</h2>
            <p className="truncate text-sm text-stone-500">{nome || "Sem nome"}</p>
          </div>
          <button type="button" onClick={onFechar} className="btn-icone h-9 w-9" aria-label="Fechar"><X size={18} /></button>
        </div>

        <form action={acao} className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          {tag && <input type="hidden" name="$id" value={tag.$id} />}
          {(estado?.erro || erroExcluir) && <Aviso>{estado?.erro || erroExcluir}</Aviso>}

          <div>
            <label className="rotulo flex items-center gap-1.5" htmlFor="tg-nome"><Hash size={14} className="text-stone-400" /> Nome</label>
            <input id="tg-nome" name="nome" required maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} className="campo" placeholder="Ex.: Jejum de 3 dias" />
          </div>

          <div>
            <span className="rotulo flex items-center gap-1.5"><Palette size={14} className="text-stone-400" /> Cor</span>
            <div className="flex flex-wrap items-center gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  aria-label={`Cor ${c}`}
                  aria-pressed={cor.toLowerCase() === c}
                  className={`grid h-8 w-8 place-items-center rounded-full ring-offset-2 transition ${cor.toLowerCase() === c ? "ring-2 ring-stone-900" : "hover:scale-110"}`}
                  style={{ background: c }}
                >
                  {cor.toLowerCase() === c && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
              ))}
              <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 pr-2.5 pl-1 text-xs text-stone-600 hover:border-stone-300" title="Outra cor">
                <input type="color" name="cor" value={cor} onChange={(e) => setCor(e.target.value)} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                Outra
              </label>
            </div>
          </div>

          <SeletorIcone valor={icone} cor={cor} aoEscolher={setIcone} />
          <input type="hidden" name="icone" value={icone} />

          <div>
            <label className="rotulo" htmlFor="tg-texto">Texto da tag</label>
            <textarea
              id="tg-texto"
              name="descricao"
              rows={9}
              maxLength={LIMITE}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="campo"
              placeholder="Ex.: orientações do jejum, o que levar, horários de chegada…"
            />
            <p className="ajuda">
              Entra no fim da descrição de cada evento com esta tag, depois do que foi escrito no evento. Quebras de linha são mantidas.{" "}
              <span className="tabular-nums">{texto.length}/{LIMITE}</span>
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition hover:border-stone-300">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-stone-900">Ativa</span>
              <span className="block text-xs text-stone-500">Desligada, a tag some da escolha em eventos e o texto deixa de aparecer.</span>
            </span>
            <input type="checkbox" name="ativo" defaultChecked={tag?.ativo ?? true} className="interruptor mt-1" />
          </label>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
            {tag ? (
              <BotaoConfirmar
                acima
                alinhar="esquerda"
                disabled={excluindo}
                className="btn border border-red-200 bg-white px-3 text-sm text-red-700 hover:bg-red-50"
                pergunta={usos ? `Há ${usos} evento(s) com esta tag: não dá para excluir. Desligue “Ativa” em vez disso.` : `Excluir a tag “${tag.nome}”?`}
                confirmar={usos ? "Entendi" : "Sim, excluir"}
                aoConfirmar={() => {
                  if (usos) return;
                  iniciar(async () => {
                    const r = await excluirItem("tags", tag.$id);
                    if (r?.erro) setErroExcluir(r.erro);
                    else onFechar();
                  });
                }}
              >
                {excluindo ? <Carregando /> : <Trash2 size={16} />} Excluir
              </BotaoConfirmar>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secundario" onClick={onFechar}>Cancelar</button>
              <button className="btn-primario" disabled={salvando}>{salvando ? <><Carregando /> Salvando…</> : tag ? "Salvar" : "Criar tag"}</button>
            </div>
          </div>
        </form>
      </aside>
    </div>,
    document.body,
  );
}
