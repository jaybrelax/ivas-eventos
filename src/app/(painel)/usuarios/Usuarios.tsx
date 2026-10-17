"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Flame, KeyRound, Mail, Phone, ShieldCheck, SquarePen, Trash2, User, UserPlus, X, type LucideIcon } from "lucide-react";
import { criarUsuario, excluirUsuario, redefinirSenha, salvarDadosPessoais } from "./actions";
import { PERFIS, type Perfil } from "@/lib/config";
import { Aviso, BotaoEnviar, Carregando } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { CampoFoto } from "@/components/CampoFoto";
import { CampoGenero } from "@/components/CampoGenero";
import { InputTelefone } from "@/components/InputTelefone";
import { mascararTelefone } from "@/lib/telefone";
import { GENERO_ROTULO, IconeGenero } from "@/components/genero";
import { BotaoConfirmar } from "@/components/Confirmar";
import { Participacoes } from "@/components/Participacoes";
import type { ItemParticipacao } from "@/lib/types";

type U = {
  id: string; nome: string; email: string; perfil: Perfil | null; telefone: string | null; foto: string | null;
  funcaoRitual: "mestre" | "guardiao" | "nenhuma"; sexo: "masculino" | "feminino" | null;
  participacoes?: ItemParticipacao[];
};

const FUNCAO_ROTULO = { mestre: "Mestre", guardiao: "Guardião", nenhuma: "" } as const;

/** Rótulo de campo com ícone. */
function Rot({ icone: Icone, htmlFor, children }: { icone: LucideIcon; htmlFor?: string; children: React.ReactNode }) {
  return (
    <label className="rotulo flex items-center gap-1.5" htmlFor={htmlFor}>
      <Icone size={14} className="text-stone-400" aria-hidden />
      {children}
    </label>
  );
}

/** Link do WhatsApp a partir do telefone (assume Brasil se vier sem DDI). */
export function linkWhats(tel: string) {
  const d = tel.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}`;
}

/** Formulário de novo usuário (sem moldura: quem exibe é o modal em GestaoUsuarios). */
export function FormNovoUsuario({ aoCriar }: { aoCriar?: (mensagem: string) => void }) {
  const [estado, acao] = useActionState(criarUsuario, undefined);
  // Criou com sucesso: quem exibe o formulário (o modal) fecha e mostra o aviso na lista.
  useEffect(() => {
    if (estado?.ok) aoCriar?.(estado.ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
  return (
    <form action={acao} className="space-y-5">
      <p className="text-sm text-stone-500">A pessoa entra com o e-mail e a senha definidos aqui.</p>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <CampoFoto nome="" tamanho={72} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Rot icone={User} htmlFor="nu-nome">Nome</Rot>
          <input id="nu-nome" name="nome" required className="campo" />
        </div>
        <div>
          <Rot icone={Mail} htmlFor="nu-email">E-mail</Rot>
          <input id="nu-email" name="email" type="email" required className="campo" />
        </div>
        <div>
          <Rot icone={Phone} htmlFor="nu-tel">Telefone</Rot>
          <InputTelefone id="nu-tel" name="telefone" autoComplete="off" />
        </div>
        <div>
          <Rot icone={KeyRound} htmlFor="nu-senha">Senha</Rot>
          <input id="nu-senha" name="senha" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required autoComplete="new-password" className="campo" />
        </div>
        <div>
          <Rot icone={Flame} htmlFor="nu-funcao">Função do usuário</Rot>
          <select id="nu-funcao" name="funcao_ritual" defaultValue="nenhuma" className="campo">
            <option value="mestre">Mestre</option>
            <option value="guardiao">Guardião</option>
            <option value="nenhuma">Nenhuma (não é escalado)</option>
          </select>
        </div>
        <div>
          <Rot icone={ShieldCheck} htmlFor="nu-perfil">Perfil de acesso</Rot>
          <select id="nu-perfil" name="perfil" defaultValue="normal" className="campo">
            {PERFIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <CampoGenero id="nu-sexo" />
        </div>
      </div>
      <div className="flex justify-end">
        <BotaoEnviar pendente="Criando…"><UserPlus size={16} /> Criar usuário</BotaoEnviar>
      </div>
    </form>
  );
}

export function LinhaUsuario({ u, souEu }: { u: U; souEu: boolean }) {
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const [pendente, iniciar] = useTransition();
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [editando, setEditando] = useState(false);
  const [senha, setSenha] = useState("");
  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) => iniciar(async () => setMsg(await fn()));

  return (
    <li className="px-5 py-4 transition hover:bg-stone-50/60 sm:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar nome={u.nome} foto={u.foto} perfil={u.perfil} tamanho={44} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 font-semibold text-stone-900">
            <span className="truncate">{u.nome}</span>
            {u.sexo && (
              <span title={GENERO_ROTULO[u.sexo]} className="inline-flex">
                <IconeGenero genero={u.sexo} size={16} />
              </span>
            )}
            {souEu && <span className="chip bg-stone-100 text-stone-500">você</span>}
            {u.funcaoRitual !== "nenhuma" && (
              <span className="chip bg-mata-50 text-mata-700 ring-1 ring-mata-200 ring-inset">{FUNCAO_ROTULO[u.funcaoRitual]}</span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-stone-500">
            <span className="truncate">{u.email}</span>
            {u.telefone && (
              <a href={linkWhats(u.telefone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-mata-700" title="Abrir no WhatsApp">
                <Phone size={13} />{mascararTelefone(u.telefone)}
              </a>
            )}
          </p>
        </div>
        <span className="text-sm text-stone-500 italic" title="Perfil de acesso ao painel">
          {PERFIS.find((p) => p.id === u.perfil)?.nome ?? "sem perfil"}
        </span>
        <div className="flex gap-1">
          {pendente && <span className="grid h-10 w-6 place-items-center text-stone-400"><Carregando /></span>}
          <button className="btn-icone" disabled={pendente} onClick={() => { setEditando((v) => !v); setTrocandoSenha(false); }} title="Editar usuário" aria-label="Editar dados">
            <SquarePen size={17} />
          </button>
          <button className="btn-icone" disabled={pendente} onClick={() => { setTrocandoSenha((v) => !v); setEditando(false); }} title="Redefinir senha" aria-label="Redefinir senha">
            <KeyRound size={17} />
          </button>
        </div>
      </div>

      {editando && (
        <PainelEdicao u={u} onFechar={() => setEditando(false)}>
          <EditarDados u={u} souEu={souEu} aoSalvar={() => setEditando(false)} aoExcluir={() => { setEditando(false); rodar(() => excluirUsuario(u.id)); }} />
        </PainelEdicao>
      )}

      {trocandoSenha && (
        <form
          className="mt-3 flex animate-surgir flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 sm:ml-14"
          onSubmit={(e) => {
            e.preventDefault();
            rodar(async () => {
              const r = await redefinirSenha(u.id, senha);
              if (r?.ok) { setTrocandoSenha(false); setSenha(""); }
              return r;
            });
          }}
        >
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={8}
            required
            autoFocus
            autoComplete="new-password"
            placeholder={`Nova senha para ${u.nome.split(" ")[0]} (mín. 8)`}
            className="campo max-w-xs flex-1"
          />
          <button className="btn-primario" disabled={pendente || senha.length < 8}>Salvar senha</button>
          <button type="button" className="btn-icone" onClick={() => setTrocandoSenha(false)} aria-label="Cancelar"><X size={17} /></button>
        </form>
      )}
      {msg && <div className="mt-3 sm:ml-14"><Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso></div>}
    </li>
  );
}

function EditarDados({ u, souEu, aoSalvar, aoExcluir }: { u: U; souEu: boolean; aoSalvar: () => void; aoExcluir: () => void }) {
  const [estado, acao, salvando] = useActionState(async (prev: Awaited<ReturnType<typeof salvarDadosPessoais>>, form: FormData) => {
    const r = await salvarDadosPessoais(prev, form);
    if (r?.ok) aoSalvar();
    return r;
  }, undefined);
  return (
    <form action={acao} className="flex min-h-full flex-col gap-5">
      <input type="hidden" name="userId" value={u.id} />
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoFoto nome={u.nome} fotoAtual={u.foto} tamanho={64} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Rot icone={User} htmlFor={`ed-nome-${u.id}`}>Nome</Rot>
          <input id={`ed-nome-${u.id}`} name="nome" defaultValue={u.nome} required className="campo" />
        </div>
        <div>
          <Rot icone={Phone} htmlFor={`ed-tel-${u.id}`}>Telefone</Rot>
          <InputTelefone id={`ed-tel-${u.id}`} name="telefone" defaultValue={u.telefone} />
        </div>
        <div>
          <Rot icone={Flame} htmlFor={`ed-funcao-${u.id}`}>Função do usuário</Rot>
          <select id={`ed-funcao-${u.id}`} name="funcao_ritual" defaultValue={u.funcaoRitual} className="campo">
            <option value="mestre">Mestre</option>
            <option value="guardiao">Guardião</option>
            <option value="nenhuma">Nenhuma (não é escalado)</option>
          </select>
        </div>
        <div>
          <Rot icone={ShieldCheck} htmlFor={`ed-perfil-${u.id}`}>Perfil de acesso</Rot>
          <select id={`ed-perfil-${u.id}`} name="perfil" defaultValue={u.perfil ?? ""} disabled={souEu} className="campo">
            {!u.perfil && <option value="">Sem perfil</option>}
            {PERFIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        {souEu && <p className="ajuda -mt-2 sm:col-span-2">Você não pode tirar o seu próprio acesso de Admin.</p>}
        <div className="sm:col-span-2">
          <CampoGenero id={`ed-${u.id}-sexo`} inicial={u.sexo} />
        </div>
      </div>
      {(u.funcaoRitual === "guardiao" || (u.participacoes?.length ?? 0) > 0) && (
        <div className="border-t border-stone-100 pt-5">
          <Participacoes itens={u.participacoes ?? []} />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
        {!souEu ? (
          <BotaoConfirmar
            acima
            alinhar="esquerda"
            className="btn border border-red-200 bg-white px-3 text-sm text-red-700 hover:bg-red-50"
            pergunta={`Excluir ${u.nome}? Remove o acesso e a foto. Essa ação não pode ser desfeita.`}
            aoConfirmar={aoExcluir}
          >
            <Trash2 size={16} /> Excluir
          </BotaoConfirmar>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secundario" onClick={aoSalvar}>Cancelar</button>
          <button className="btn-primario" disabled={salvando}>{salvando ? <><Carregando /> Salvando…</> : "Salvar"}</button>
        </div>
      </div>
    </form>
  );
}

/** Painel lateral (no body) com o formulário de edição do usuário. Fecha com Esc, X ou clicando fora. */
function PainelEdicao({ u, onFechar, children }: { u: U; onFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Editar ${u.nome}`}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-mata-950/40 backdrop-blur-[2px]" onClick={onFechar} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg animate-surgir flex-col bg-white shadow-elevado">
        <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
          <Avatar nome={u.nome} foto={u.foto} perfil={u.perfil} tamanho={40} />
          <div className="min-w-0 flex-1">
            <h2 className="cartao-titulo truncate">Editar usuário</h2>
            <p className="truncate text-sm text-stone-500">{u.email}</p>
          </div>
          <button type="button" onClick={onFechar} className="btn-icone h-9 w-9" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
