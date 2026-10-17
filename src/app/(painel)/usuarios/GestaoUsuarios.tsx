"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, Crown, Plus, User, UserPlus, X } from "lucide-react";
import { PERFIS, type Perfil } from "@/lib/config";
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
};

const ICONES = { admin: Crown, coordenador: ClipboardList, normal: User } as const;

/**
 * Cards de perfil que filtram a lista (clique de novo para limpar) e o botão
 * "Novo usuário", que abre o formulário num modal.
 */
export function GestaoUsuarios({ us, euId }: { us: UsuarioLista[]; euId: string }) {
  const [filtro, setFiltro] = useState<Perfil | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const visiveis = filtro ? us.filter((u) => u.perfil === filtro) : us;
  const nomeFiltro = PERFIS.find((p) => p.id === filtro)?.nome;

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
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {PERFIS.map((p) => {
          const Icone = ICONES[p.id];
          const n = us.filter((u) => u.perfil === p.id).length;
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

      <section className="cartao overflow-hidden p-0 sm:p-0">
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

        {visiveis.length ? (
          <ul className="divide-y divide-stone-100">
            {visiveis.map((u) => (
              <LinhaUsuario key={u.id + u.perfil} u={u} souEu={u.id === euId} />
            ))}
          </ul>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-stone-500">Nenhum usuário com esse perfil.</p>
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
