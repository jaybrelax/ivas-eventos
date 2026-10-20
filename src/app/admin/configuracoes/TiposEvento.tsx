"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Flame, Lock, Palette, Plus, Search, SquarePen, Tag, Trash2, X } from "lucide-react";
import { excluirItem, salvarItem, type Resultado } from "./actions";
import { Aviso, Carregando } from "@/components/ui";
import { BotaoConfirmar } from "@/components/Confirmar";
import { IconeTipo, NOMES_ICONES } from "@/components/IconeTipo";

export type TipoItem = {
  $id: string;
  nome: string;
  cor: string;
  icone: string | null;
  descricao: string | null;
  conta_como_ritual: boolean;
  ativo: boolean;
  aberto_publico?: boolean | null;
  fechado_guardioes?: boolean | null;
};

const CORES = ["#7c3aed", "#4f46e5", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#57534e"];

/** Sugestões de ícones mostradas antes da busca. */
const SUGESTOES = [
  "flame", "moon", "sun", "sunrise", "sparkles", "star", "leaf", "sprout", "trees", "mountain", "flower-2", "feather",
  "heart", "hand-heart", "eye", "infinity", "droplets", "wind", "cloud-sun", "music", "drum", "book-open", "users",
  "handshake", "party-popper", "cake", "gift", "tent", "compass", "shield", "crown", "gem", "coffee", "utensils", "bell", "calendar-days",
];

/** Termos em português que viram buscas em inglês (os nomes dos ícones são em inglês). */
const APELIDOS: Record<string, string[]> = {
  fogo: ["flame", "fire"], chama: ["flame"], lua: ["moon"], sol: ["sun"], estrela: ["star"], folha: ["leaf"], planta: ["sprout", "plant"],
  arvore: ["tree"], montanha: ["mountain"], flor: ["flower"], pena: ["feather"], coracao: ["heart"], olho: ["eye"], agua: ["droplet", "waves"],
  musica: ["music"], tambor: ["drum"], livro: ["book"], pessoas: ["users"], grupo: ["users"], festa: ["party"], bolo: ["cake"],
  presente: ["gift"], mao: ["hand"], ceu: ["cloud"], vento: ["wind"], escudo: ["shield"], coroa: ["crown"], cafe: ["coffee"],
  comida: ["utensils"], sino: ["bell"], calendario: ["calendar"], reuniao: ["users", "handshake"], ritual: ["flame", "sparkles"],
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Tipos de evento em cartões; clicar abre o painel de edição. */
export function TiposEvento({ itens, contagem }: { itens: TipoItem[]; contagem: Record<string, number> }) {
  const [aberto, setAberto] = useState<TipoItem | "novo" | null>(null);
  return (
    <section id="tipos" className="cartao">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="cartao-titulo">Tipos de evento</h2>
          <p className="cartao-sub">Cada tipo tem cor, ícone e descrição. Marque “Conta como ritual” para entrar na numeração e na guarnição.</p>
        </div>
        <button type="button" onClick={() => setAberto("novo")} className="btn-primario h-9 shrink-0 px-3.5 text-sm">
          <Plus size={16} /> Novo tipo
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {itens.map((t) => {
          const n = contagem[t.$id] ?? 0;
          return (
            <button
              key={t.$id}
              type="button"
              onClick={() => setAberto(t)}
              className={`group flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left shadow-cartao transition hover:-translate-y-px hover:shadow-elevado ${
                t.ativo ? "border-stone-200/80 hover:border-stone-300" : "border-dashed border-stone-300 opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: `${t.cor}1a`, color: t.cor }}>
                  <IconeTipo nome={t.icone} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-900">{t.nome}</p>
                  <p className="text-xs text-stone-500 tabular-nums">{n} evento{n === 1 ? "" : "s"}</p>
                </div>
                <SquarePen size={16} className="shrink-0 text-stone-300 transition group-hover:text-stone-500" aria-hidden />
              </div>
              <p className={`line-clamp-2 text-sm ${t.descricao ? "text-stone-600" : "text-stone-400 italic"}`}>{t.descricao || "Sem descrição"}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {t.conta_como_ritual ? (
                  <span className="chip bg-mata-50 text-mata-700 ring-1 ring-mata-200 ring-inset"><Flame size={11} /> Conta como ritual</span>
                ) : (
                  <span className="chip bg-stone-100 text-stone-600">Evento</span>
                )}
                {t.fechado_guardioes && <span className="chip bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset"><Lock size={11} /> Só guardiões</span>}
                {!t.ativo && <span className="chip bg-stone-100 text-stone-500">Inativo</span>}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAberto("novo")}
          className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 text-sm font-medium text-stone-500 transition hover:border-mata-300 hover:bg-mata-50/40 hover:text-mata-700"
        >
          <Plus size={20} /> Novo tipo de evento
        </button>
      </div>

      {/* key: cada tipo abre um painel novo, sem herdar o que foi digitado em outro */}
      {aberto && <PainelTipo key={aberto === "novo" ? "novo" : aberto.$id} tipo={aberto === "novo" ? null : aberto} usos={aberto === "novo" ? 0 : (contagem[aberto.$id] ?? 0)} onFechar={() => setAberto(null)} />}
    </section>
  );
}

function PainelTipo({ tipo, usos, onFechar }: { tipo: TipoItem | null; usos: number; onFechar: () => void }) {
  // Inscrição: aberto ao público (padrão) ou fechado para guardiões
  const [acesso, setAcesso] = useState<"publico" | "guardioes" | null>(
    tipo ? (tipo.fechado_guardioes ? "guardioes" : tipo.aberto_publico === false ? null : "publico") : "publico",
  );
  const [nome, setNome] = useState(tipo?.nome ?? "");
  const [cor, setCor] = useState(tipo?.cor ?? CORES[0]);
  const [icone, setIcone] = useState(tipo?.icone ?? "flame");
  const [erroExcluir, setErroExcluir] = useState<string>();
  const [excluindo, iniciar] = useTransition();
  const [estado, acao, salvando] = useActionState(async (prev: Resultado, form: FormData) => {
    const r = await salvarItem("tipos", prev, form);
    if (r?.ok) onFechar();
    return r;
  }, undefined);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={tipo ? `Editar ${tipo.nome}` : "Novo tipo de evento"}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-mata-950/40 backdrop-blur-[2px]" onClick={onFechar} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg animate-surgir flex-col bg-white shadow-elevado">
        {/* Cabeçalho com a prévia do tipo */}
        <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl transition" style={{ background: `${cor}1a`, color: cor }}>
            <IconeTipo nome={icone} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="cartao-titulo truncate">{tipo ? "Editar tipo de evento" : "Novo tipo de evento"}</h2>
            <p className="truncate text-sm text-stone-500">{nome || "Sem nome"}</p>
          </div>
          <button type="button" onClick={onFechar} className="btn-icone h-9 w-9" aria-label="Fechar"><X size={18} /></button>
        </div>

        <form action={acao} className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          {tipo && <input type="hidden" name="$id" value={tipo.$id} />}
          {(estado?.erro || erroExcluir) && <Aviso>{estado?.erro || erroExcluir}</Aviso>}

          <div>
            <label className="rotulo flex items-center gap-1.5" htmlFor="tp-nome"><Tag size={14} className="text-stone-400" /> Nome</label>
            <input id="tp-nome" name="nome" required maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} className="campo" placeholder="Ex.: Ritual normal" />
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
            <label className="rotulo" htmlFor="tp-desc">Descrição</label>
            <textarea
              id="tp-desc"
              name="descricao"
              rows={4}
              maxLength={1000}
              defaultValue={tipo?.descricao ?? ""}
              className="campo"
              placeholder="Ex.: O que é, o que levar, cuidados de dieta… Aparece junto dos eventos deste tipo."
            />
            <p className="ajuda">Aparece junto dos eventos deste tipo, na página do evento e na escolha do tipo.</p>
          </div>

          <div className="space-y-2.5">
            <Interruptor nome="conta_como_ritual" titulo="Conta como ritual" texto="Entra na numeração automática e tem guarnição." inicial={tipo?.conta_como_ritual ?? false} />
            <Interruptor nome="ativo" titulo="Ativo" texto="Desligado, o tipo some da escolha em eventos novos." inicial={tipo?.ativo ?? true} />
          </div>

          <div>
            <span className="rotulo">Quem pode se inscrever</span>
            <div className="space-y-2.5">
              <Interruptor
                nome="aberto_publico"
                titulo="Aberto ao público"
                texto="Qualquer pessoa pode se inscrever para participar."
                checked={acesso === "publico"}
                aoMudar={(v) => setAcesso(v ? "publico" : null)}
              />
              <Interruptor
                nome="fechado_guardioes"
                titulo="Evento fechado para guardiões"
                texto="Só guardiões logados podem se inscrever."
                checked={acesso === "guardioes"}
                aoMudar={(v) => setAcesso(v ? "guardioes" : null)}
              />
            </div>
            <p className="ajuda">As duas opções se excluem: ligar uma desliga a outra.</p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
            {tipo ? (
              <BotaoConfirmar
                acima
                alinhar="esquerda"
                disabled={excluindo}
                className="btn border border-red-200 bg-white px-3 text-sm text-red-700 hover:bg-red-50"
                pergunta={usos ? `Há ${usos} evento(s) com este tipo: não dá para excluir. Desligue “Ativo” em vez disso.` : `Excluir o tipo “${tipo.nome}”?`}
                confirmar={usos ? "Entendi" : "Sim, excluir"}
                aoConfirmar={() => {
                  if (usos) return;
                  iniciar(async () => {
                    const r = await excluirItem("tipos", tipo.$id);
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
              <button className="btn-primario" disabled={salvando}>{salvando ? <><Carregando /> Salvando…</> : tipo ? "Salvar" : "Criar tipo"}</button>
            </div>
          </div>
        </form>
      </aside>
    </div>,
    document.body,
  );
}

export function SeletorIcone({ valor, cor, aoEscolher }: { valor: string; cor: string; aoEscolher: (n: string) => void }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const termo = semAcento(busca).replace(/\s+/g, "-");
  const lista = useMemo(() => {
    if (!termo) return SUGESTOES.filter((n) => NOMES_ICONES.includes(n));
    const ingles = Object.entries(APELIDOS).filter(([pt]) => pt.startsWith(termo) || termo.startsWith(pt)).flatMap(([, en]) => en);
    const achados = NOMES_ICONES.filter((n) => n.includes(termo) || ingles.some((en) => n.includes(en)));
    return achados.slice(0, 120);
  }, [termo]);

  return (
    <div>
      <span className="rotulo">Ícone</span>
      {/* Fechado mostra só o ícone escolhido; ao clicar abre a busca e a galeria */}
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="campo flex h-12 items-center gap-3 text-left"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${cor}1a`, color: cor }}>
          <IconeTipo nome={valor} size={18} />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-stone-700">{valor || "Escolher ícone"}</span>
        <ChevronDown size={17} className={`shrink-0 text-stone-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
      <div className="mt-2 rounded-xl border border-stone-200 bg-white p-2 shadow-sm animate-aparecer">
      <label className="relative mb-2 block">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar entre ${NOMES_ICONES.length} ícones (ex.: fogo, lua, folha, heart)`}
          className="campo pl-9"
          aria-label="Buscar ícone"
          autoFocus
        />
      </label>
      <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
        {lista.map((n) => {
          const on = n === valor;
          return (
            <button
              key={n}
              type="button"
              title={n}
              aria-pressed={on}
              onClick={() => { aoEscolher(n); setAberto(false); setBusca(""); }}
              className={`grid aspect-square place-items-center rounded-lg transition ${on ? "ring-2 ring-offset-1" : "text-stone-600 hover:bg-stone-100"}`}
              style={on ? { background: `${cor}1a`, color: cor, ["--tw-ring-color" as string]: cor } : undefined}
            >
              <IconeTipo nome={n} size={20} />
            </button>
          );
        })}
        {!lista.length && <p className="col-span-full py-6 text-center text-sm text-stone-500">Nenhum ícone encontrado. Tente em inglês (ex.: star, tree).</p>}
      </div>
      </div>
      )}
      <p className="ajuda">Ícones da biblioteca Lucide.</p>
    </div>
  );
}

function Interruptor({
  nome, titulo, texto, inicial, checked, aoMudar,
}: { nome: string; titulo: string; texto: string; inicial?: boolean; checked?: boolean; aoMudar?: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition hover:border-stone-300">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-900">{titulo}</span>
        <span className="block text-xs text-stone-500">{texto}</span>
      </span>
      <input
        type="checkbox"
        name={nome}
        {...(aoMudar ? { checked: !!checked, onChange: (e) => aoMudar(e.target.checked) } : { defaultChecked: inicial })}
        className="interruptor mt-1"
      />
    </label>
  );
}
