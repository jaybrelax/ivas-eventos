"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Flame, Plus, Search, Shield, SlidersHorizontal, UserPlus, X, type LucideIcon } from "lucide-react";
import type { Perfil } from "@/lib/config";
import type { ItemParticipacao } from "@/lib/types";
import { Aviso } from "@/components/ui";
import { FormNovoUsuario, LinhaUsuario } from "./Usuarios";

export type UsuarioLista = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil | null;
  telefone: string | null;
  foto: string | null;
  funcaoRitual: "mestre" | "guardiao" | "nenhuma";
  sexo: "masculino" | "feminino" | null;
  participacoes: ItemParticipacao[];
};

type Funcao = "mestre" | "guardiao";
type Marca = "mestre" | "guardiao" | "coordenador" | "admin";

/** Opções do filtro em menu: funções nos rituais e perfis de acesso. */
const MARCAS: { id: Marca; nome: string }[] = [
  { id: "mestre", nome: "Mestre" },
  { id: "guardiao", nome: "Guardião" },
  { id: "coordenador", nome: "Coordenador" },
  { id: "admin", nome: "Admin" },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Cartões de filtro pela função do usuário. */
const FUNCOES: { id: Funcao; nome: string; descricao: string; Icone: LucideIcon }[] = [
  { id: "mestre", nome: "Mestres", descricao: "Conduzem os rituais", Icone: Flame },
  { id: "guardiao", nome: "Guardiões", descricao: "Cuidam dos participantes", Icone: Shield },
];

/**
 * Cards de mestres e guardiões que filtram a lista (clique de novo para limpar) e o botão
 * "Novo usuário", que abre o formulário num modal.
 */
export function GestaoUsuarios({ us, euId }: { us: UsuarioLista[]; euId: string }) {
  const [filtro, setFiltro] = useState<Funcao | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const termo = semAcento(busca.trim());
  const digitos = busca.replace(/\D/g, "");
  const [marcados, setMarcados] = useState<Set<Marca>>(new Set());
  const [menuAberto, setMenuAberto] = useState(false);
  const raizFiltro = useRef<HTMLDivElement>(null);
  const alternar = (m: Marca) => setMarcados((atual) => { const n = new Set(atual); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  const casa = (u: UsuarioLista, m: Marca) => (m === "mestre" || m === "guardiao" ? u.funcaoRitual === m : u.perfil === m);

  // Fecha o menu do filtro ao clicar fora ou com Esc
  useEffect(() => {
    if (!menuAberto) return;
    const fora = (e: MouseEvent) => { if (!raizFiltro.current?.contains(e.target as Node)) setMenuAberto(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [menuAberto]);

  const porCard = filtro ? us.filter((u) => u.funcaoRitual === filtro) : us;
  // Várias marcas = quem tem qualquer uma delas
  const porFuncao = marcados.size ? porCard.filter((u) => [...marcados].some((m) => casa(u, m))) : porCard;
  // Busca por nome, e-mail, telefone, função (Mestre/Guardião) e perfil (Admin/Coordenador/Normal)
  const visiveis = termo
    ? porFuncao.filter((u) =>
        semAcento(`${u.nome} ${u.email} ${u.funcaoRitual === "nenhuma" ? "" : u.funcaoRitual} ${u.perfil ?? ""}`).includes(termo) ||
        (digitos.length >= 3 && (u.telefone ?? "").replace(/\D/g, "").includes(digitos)))
    : porFuncao;
  const nomeFiltro = FUNCOES.find((f) => f.id === filtro)?.nome;

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    if (!novoAberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setNovoAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [novoAberto]);

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {FUNCOES.map((p) => {
          const Icone = p.Icone;
          const n = us.filter((u) => u.funcaoRitual === p.id).length;
          const ativo = filtro === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFiltro(ativo ? null : p.id)}
              className={`cartao flex gap-3.5 p-4 text-left transition sm:p-5 ${
                ativo ? "border-mata-400 bg-mata-50/40 ring-2 ring-mata-200" : "hover:border-stone-300 hover:shadow-elevado"
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ativo ? "bg-mata-700 text-white" : "bg-stone-100 text-stone-600"}`}>
                <Icone size={18} />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-stone-900">
                  {p.nome}
                  <span className="chip bg-stone-100 text-stone-500 tabular-nums">{n}</span>
                </p>
                <p className="mt-0.5 text-sm text-stone-500">{p.descricao}</p>
              </div>
            </button>
          );
        })}
      </div>

      {aviso && <div className="mb-4"><Aviso tipo="ok">{aviso}</Aviso></div>}

      <section className="cartao p-0 sm:p-0 [&>ul>li:last-child]:rounded-b-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="cartao-titulo">{nomeFiltro ? `Somente ${nomeFiltro.toLowerCase()}` : "Pessoas com acesso"}</h2>
            <span className="chip bg-stone-100 text-stone-600 tabular-nums">{visiveis.length}</span>
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro(null)}
                className="chip bg-mata-50 text-mata-700 ring-1 ring-mata-200 ring-inset hover:bg-mata-100"
              >
                Limpar filtro <X size={12} />
              </button>
            )}
          </div>
          <button type="button" onClick={() => setNovoAberto(true)} className="btn-primario h-9 px-3.5 text-sm">
            <Plus size={16} /> Novo usuário
          </button>
        </div>

        <div className="relative z-30 flex items-center gap-2 border-b border-stone-100 px-5 py-3 sm:px-6">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou função"
              aria-label="Buscar usuário"
              autoComplete="off"
              className="campo h-10 pl-9 text-sm"
            />
          </div>

          {/* Filtro por função/perfil: menu com caixas de seleção; a lista muda na hora */}
          <div ref={raizFiltro} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuAberto}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap ring-1 transition ${
                marcados.size ? "bg-mata-700 text-white ring-mata-700" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              <SlidersHorizontal size={15} aria-hidden /> Filtrar
              {marcados.size > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{marcados.size}</span>}
              <ChevronDown size={14} aria-hidden className={`transition ${menuAberto ? "rotate-180" : ""}`} />
            </button>
            {menuAberto && (
              <div role="group" aria-label="Filtrar por função ou perfil" className="menu-pop absolute top-full right-0 z-20 mt-2 w-60 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_2px_6px_rgb(0_0_0/0.06),0_18px_40px_-10px_rgb(20_42_29/0.35)]">
                <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Mostrar</p>
                {MARCAS.map((m) => {
                  const on = marcados.has(m.id);
                  const n = us.filter((u) => casa(u, m.id)).length;
                  return (
                    <label key={m.id} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${on ? "bg-mata-50 font-semibold text-mata-800" : "text-stone-700 hover:bg-stone-50"}`}>
                      <input type="checkbox" checked={on} onChange={() => alternar(m.id)} className="sr-only" />
                      <span aria-hidden className={`grid h-4 w-4 shrink-0 place-items-center rounded ring-1 ${on ? "bg-mata-700 text-white ring-mata-700" : "bg-white ring-stone-300"}`}>{on && <Check size={11} strokeWidth={3} />}</span>
                      <span className="flex-1">{m.nome}</span>
                      <span className="rounded-full bg-stone-100 px-1.5 text-xs font-medium text-stone-500 tabular-nums">{n}</span>
                    </label>
                  );
                })}
                {marcados.size > 0 && (
                  <button type="button" onClick={() => setMarcados(new Set())} className="mt-1 w-full rounded-lg border-t border-stone-100 px-2.5 py-2 text-left text-xs font-semibold text-mata-700 hover:bg-stone-50">Limpar filtro</button>
                )}
              </div>
            )}
          </div>
        </div>

        {visiveis.length ? (
          <ul className="divide-y divide-stone-100">
            {visiveis.map((u) => (
              <LinhaUsuario key={u.id + u.perfil} u={u} souEu={u.id === euId} />
            ))}
          </ul>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-stone-500">{termo || marcados.size ? "Ninguém encontrado com esse filtro." : "Ninguém com essa função."}</p>
        )}
      </section>

      {/* No body (portal): dentro da página, o menu lateral e a animação do conteúdo ficariam por cima do modal. */}
      {novoAberto && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="novo-usuario-titulo">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-mata-950/50 backdrop-blur-sm" onClick={() => setNovoAberto(false)} />
          <div className="cartao relative max-h-[90vh] w-full max-w-2xl animate-surgir overflow-y-auto shadow-elevado">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mata-50 text-mata-600">
                  <UserPlus size={19} />
                </span>
                <div>
                  <h2 id="novo-usuario-titulo" className="cartao-titulo">Novo usuário</h2>
                  <p className="cartao-sub">Cadastre quem vai acessar o painel.</p>
                </div>
              </div>
              <button type="button" onClick={() => setNovoAberto(false)} className="btn-icone h-9 w-9" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <FormNovoUsuario aoCriar={(mensagem) => { setNovoAberto(false); setAviso(mensagem); }} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
