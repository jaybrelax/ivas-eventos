"use client";

import { useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Crown, Settings, Shield, SlidersHorizontal, X } from "lucide-react";
import { AcoesListaContexto } from "../Participantes";
import type { Pessoa } from "@/lib/types";
import { Aviso, Carregando } from "@/components/ui";
import { EscolhaEquipe } from "../Equipe";
import { Guarnicao, type DadosGuarnicao } from "../Guarnicao";
import { definirMestresAction } from "../actions";

/** Pop-up padrão da página do evento: Esc e clique fora fecham, a rolagem da página fica presa. */
function Modal({ titulo, sub, fechar, children, rodape }: { titulo: string; sub?: string; fechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = rolagem;
    };
  }, [fechar]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl animate-surgir flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{titulo}</h3>
            {sub && <p className="text-sm text-stone-500">{sub}</p>}
          </div>
          <button type="button" onClick={fechar} className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {rodape && <footer className="shrink-0 border-t border-stone-100 bg-stone-50/70 px-5 py-3.5 sm:px-6">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  );
}

function BotaoGerenciar({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button type="button" onClick={onClick} title={rotulo} aria-label={rotulo} className="inline-flex h-6 items-center gap-1 rounded-full bg-stone-100 px-2.5 text-[11px] font-medium tracking-normal text-stone-500 normal-case ring-1 ring-stone-200/80 transition hover:bg-mata-50 hover:text-mata-700 hover:ring-mata-200 active:scale-95">
      <SlidersHorizontal size={11} aria-hidden /> Gerenciar
    </button>
  );
}

/** Botão "Gerenciar" dos mestres: escolhe quem conduz o ritual, por gênero. */
type Controle = { aberto: boolean; setAberto: (v: boolean) => void };

export function GerenciarMestres({ eventoId, equipe, inicial, controle }: { eventoId: string; equipe: Pessoa[]; inicial: string[]; /** Aberto por fora (menu ⋮), sem o botão próprio. */ controle?: Controle }) {
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = controle ? controle.aberto : abertoLocal;
  const setAberto = controle ? controle.setAberto : setAbertoLocal;
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const fechar = () => { setAberto(false); setMsg(undefined); };

  return (
    <>
      {!controle && <BotaoGerenciar onClick={() => setAberto(true)} rotulo="Gerenciar mestres" />}
      {aberto && (
        <Modal titulo="Mestres do ritual" sub="Escolha quem conduz este ritual." fechar={fechar}
          rodape={
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-xs">{pendente ? <span className="inline-flex items-center gap-1.5 text-stone-500"><Carregando tamanho={13} /> Salvando…</span> : msg?.erro && <span className="font-semibold text-red-700">{msg.erro}</span>}</span>
              <div className="flex gap-2">
                <button type="button" className="btn-secundario" onClick={fechar} disabled={pendente}>Cancelar</button>
                <button type="submit" form="form-mestres" className="btn-primario" disabled={pendente}>Salvar</button>
              </div>
            </div>
          }
        >
          {msg?.ok && <div className="mb-3"><Aviso tipo="ok">{msg.ok}</Aviso></div>}
          <form
            id="form-mestres"
            onSubmit={(e) => {
              e.preventDefault();
              const ids = new FormData(e.currentTarget).getAll("mestres").map(String);
              iniciar(async () => {
                const r = await definirMestresAction(eventoId, ids);
                setMsg(r);
                if (r.ok) { router.refresh(); setAberto(false); }
              });
            }}
          >
            <EscolhaEquipe funcao="mestre" equipe={equipe} inicial={inicial} />
          </form>
        </Modal>
      )}
    </>
  );
}

/** Botão "Gerenciar" dos guardiões: abre o cartão da guarnição (vagas por gênero, incluir e retirar). */
export function GerenciarGuardioes({ dados, controle }: { dados: DadosGuarnicao; controle?: Controle }) {
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = controle ? controle.aberto : abertoLocal;
  const setAberto = controle ? controle.setAberto : setAbertoLocal;
  return (
    <>
      {!controle && <BotaoGerenciar onClick={() => setAberto(true)} rotulo="Gerenciar guardiões" />}
      {aberto && (
        <Modal titulo="Guarnição" sub="Adicionar por aqui escala diretamente, mesmo acima das vagas configuradas." fechar={() => setAberto(false)}>
          <Guarnicao dados={dados} embutido />
        </Modal>
      )}
    </>
  );
}

/** Desktop: engrenagem no canto do card da equipe, com "Editar mestres" e "Editar guardiões". */
export function MenuEquipeCard({ mestres, guarnicao }: {
  mestres?: { eventoId: string; equipe: Pessoa[]; inicial: string[] };
  guarnicao?: DadosGuarnicao | null;
}) {
  const [menu, setMenu] = useState(false);
  const [editMestres, setEditMestres] = useState(false);
  const [editGuardioes, setEditGuardioes] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const fora = (e: Event) => { if (!raiz.current?.contains(e.target as Node)) setMenu(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [menu]);

  if (!mestres && !guarnicao) return null;
  const item = "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100";

  return (
    <div ref={raiz} className="relative">
      <button type="button" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} aria-label="Gerenciar mestres e guardiões" title="Gerenciar equipe"
        className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200/70 active:scale-95">
        <Settings size={18} aria-hidden />
      </button>
      {menu && (
        <div role="menu" className="menu-pop absolute top-full right-0 z-30 mt-2 w-56 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.06),0_18px_40px_-10px_rgb(20_42_29/0.35)]">
          {mestres && <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); setEditMestres(true); }}><Crown size={16} className="text-mata-600" aria-hidden /> Editar mestres</button>}
          {guarnicao && <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); setEditGuardioes(true); }}><Shield size={16} className="text-sky-600" aria-hidden /> Editar guardiões</button>}
        </div>
      )}
      {mestres && <GerenciarMestres {...mestres} controle={{ aberto: editMestres, setAberto: setEditMestres }} />}
      {guarnicao && <GerenciarGuardioes dados={guarnicao} controle={{ aberto: editGuardioes, setAberto: setEditGuardioes }} />}
    </div>
  );
}

/** Mobile: menu ⋮ do card da lista de presença: "Editar mestres", "Editar guardiões" e "Filtrar". */
export function MenuEquipeMobile({ mestres, guarnicao }: {
  mestres?: { eventoId: string; equipe: Pessoa[]; inicial: string[] };
  guarnicao?: DadosGuarnicao | null;
}) {
  const [menu, setMenu] = useState(false);
  const [editMestres, setEditMestres] = useState(false);
  const [editGuardioes, setEditGuardioes] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const fora = (e: Event) => { if (!raiz.current?.contains(e.target as Node)) setMenu(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [menu]);

  const { abrirFiltro, chamada } = useContext(AcoesListaContexto);
  if (!mestres && !guarnicao && !abrirFiltro && !chamada) return null;
  const item = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100";

  return (
    <div ref={raiz} className="relative md:hidden">
      <button type="button" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} aria-label="Editar equipe do ritual"
        className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200/70 active:bg-stone-200">
        <Settings size={19} aria-hidden />
      </button>
      {menu && (
        <div role="menu" className="menu-pop absolute top-full right-0 z-30 mt-2 w-56 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.06),0_18px_40px_-10px_rgb(20_42_29/0.35)]">
          {mestres && <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); setEditMestres(true); }}><Crown size={16} className="text-mata-600" aria-hidden /> Editar mestres</button>}
          {guarnicao && <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); setEditGuardioes(true); }}><Shield size={16} className="text-sky-600" aria-hidden /> Editar guardiões</button>}
          {chamada && <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); chamada.alternar(); }}><ClipboardCheck size={16} className="text-emerald-600" aria-hidden /> {chamada.ativa ? "Encerrar chamada" : "Ativar chamada"}</button>}
          {abrirFiltro && <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); abrirFiltro(); }}><SlidersHorizontal size={16} className="text-stone-500" aria-hidden /> Filtrar</button>}
        </div>
      )}
      {mestres && <GerenciarMestres {...mestres} controle={{ aberto: editMestres, setAberto: setEditMestres }} />}
      {guarnicao && <GerenciarGuardioes dados={guarnicao} controle={{ aberto: editGuardioes, setAberto: setEditGuardioes }} />}
    </div>
  );
}
