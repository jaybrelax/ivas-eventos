"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Eye, MoreVertical, Trash2, UserCog, X } from "lucide-react";
import { PERFIS, type Perfil } from "@/lib/config";
import { Aviso, Carregando } from "@/components/ui";
import { converterParticipante } from "@/app/admin/usuarios/actions";
import { excluirParticipante } from "./actions";

type FuncaoEscolha = "mestre" | "guardiao" | "nenhuma";
const FUNCOES: { id: FuncaoEscolha; nome: string }[] = [
  { id: "guardiao", nome: "Guardião" },
  { id: "mestre", nome: "Mestre" },
  { id: "nenhuma", nome: "Nenhuma" },
];

/**
 * Menu de três pontinhos da linha do participante: ver perfil e, para o Admin, tornar membro da equipe ou excluir.
 * O menu e os modais vão para o body (portal) para não serem cortados pela rolagem da tabela.
 */
export function MenuParticipante({ userId, nome, admin: ehAdmin, equipe = false }: { userId: string; nome: string; admin: boolean; equipe?: boolean }) {
  // Tornar membro e excluir só valem para participantes; a equipe é gerenciada em Usuários.
  const admin = ehAdmin && !equipe;
  const botao = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [modal, setModal] = useState<"membro" | "excluir" | null>(null);

  useEffect(() => {
    if (!pos) return;
    const fechar = () => setPos(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    // Só fecha se a pessoa rolar de verdade: o toque no celular costuma mexer a página alguns pixels.
    const inicio = window.scrollY;
    const rolou = () => Math.abs(window.scrollY - inicio) > 40 && fechar();
    window.addEventListener("scroll", rolou);
    window.addEventListener("resize", fechar);
    document.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("scroll", rolou);
      window.removeEventListener("resize", fechar);
      document.removeEventListener("keydown", esc);
    };
  }, [pos]);

  const abrirMenu = () => {
    const r = botao.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };
  const escolher = (m: "membro" | "excluir") => {
    setPos(null);
    setModal(m);
  };

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition";

  return (
    <>
      <button ref={botao} type="button" onClick={() => (pos ? setPos(null) : abrirMenu())} className="btn-icone h-8 w-8" aria-label={`Ações de ${nome}`} aria-haspopup="menu" aria-expanded={!!pos}>
        <MoreVertical size={16} />
      </button>

      {pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div role="menu" style={{ top: pos.top, right: pos.right }} className="fixed z-50 w-48 animate-surgir rounded-xl border border-stone-200 bg-white p-1.5 shadow-elevado">
            {admin && (
              <button type="button" role="menuitem" onClick={() => escolher("membro")} className={`${item} text-stone-700 hover:bg-stone-50`}>
                <UserCog size={15} className="text-stone-400" /> Tornar membro
              </button>
            )}
            <Link href={`/admin/participantes/${userId}`} role="menuitem" className={`${item} text-stone-700 hover:bg-stone-50`} onClick={() => setPos(null)}>
              <Eye size={15} className="text-stone-400" /> Visualizar perfil
            </Link>
            {admin && (
              <>
                <div className="my-1 h-px bg-stone-100" />
                <button type="button" role="menuitem" onClick={() => escolher("excluir")} className={`${item} text-red-700 hover:bg-red-50`}>
                  <Trash2 size={15} /> Excluir
                </button>
              </>
            )}
          </div>
        </>,
        document.body,
      )}

      {modal === "membro" && <ModalMembro userId={userId} nome={nome} fechar={() => setModal(null)} />}
      {modal === "excluir" && <ModalExcluir userId={userId} nome={nome} fechar={() => setModal(null)} />}
    </>
  );
}

function Modal({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [fechar]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />
      <div className="relative z-10 w-full max-w-md animate-surgir rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
        <button type="button" onClick={fechar} className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
          <X size={17} />
        </button>
        <h3 className="pr-8 text-lg font-semibold text-stone-900">{titulo}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ModalMembro({ userId, nome, fechar }: { userId: string; nome: string; fechar: () => void }) {
  const [funcao, setFuncao] = useState<FuncaoEscolha>("guardiao");
  const [perfil, setPerfil] = useState<Perfil>("normal");
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  return (
    <Modal titulo="Tornar membro da equipe" fechar={fechar}>
      <p className="mt-1 text-sm text-stone-500">
        <strong className="text-stone-700">{nome}</strong> passa a acessar o painel. Inscrições e pagamentos continuam na mesma conta.
      </p>
      {erro && <div className="mt-4"><Aviso>{erro}</Aviso></div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor={`fn-${userId}`}>Função</label>
          <select id={`fn-${userId}`} value={funcao} onChange={(e) => setFuncao(e.target.value as FuncaoEscolha)} className="campo">
            {FUNCOES.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor={`pf-${userId}`}>Perfil de acesso</label>
          <select id={`pf-${userId}`} value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)} className="campo">
            {PERFIS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        {PERFIS.find((x) => x.id === perfil)?.descricao}. Mestre ou Guardião: escolha a função e o perfil “Normal”; Coordenador: perfil “Coordenador”.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={fechar} className="btn-secundario">Cancelar</button>
        <button
          type="button"
          disabled={pendente}
          className="btn-primario"
          onClick={() =>
            iniciar(async () => {
              const r = await converterParticipante(userId, funcao, perfil);
              if (r.erro) setErro(r.erro);
              else fechar();
            })
          }
        >
          {pendente ? <Carregando /> : <UserCog size={16} />} Tornar membro
        </button>
      </div>
    </Modal>
  );
}

function ModalExcluir({ userId, nome, fechar }: { userId: string; nome: string; fechar: () => void }) {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  return (
    <Modal titulo="Excluir participante" fechar={fechar}>
      <p className="mt-1 text-sm text-stone-500">
        Excluir <strong className="text-stone-700">{nome}</strong> da plataforma? A conta, as inscrições e os comprovantes serão apagados
        e as vagas passam para quem estiver na lista de espera. Não dá para desfazer.
      </p>
      {erro && <div className="mt-4"><Aviso>{erro}</Aviso></div>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={fechar} className="btn-secundario">Cancelar</button>
        <button
          type="button"
          disabled={pendente}
          className="btn border border-red-600 bg-red-600 px-4 text-sm text-white hover:bg-red-700"
          onClick={() =>
            iniciar(async () => {
              const r = await excluirParticipante(userId);
              if (r.erro) setErro(r.erro);
              else fechar();
            })
          }
        >
          {pendente ? <Carregando /> : <Trash2 size={15} />} Excluir
        </button>
      </div>
    </Modal>
  );
}
