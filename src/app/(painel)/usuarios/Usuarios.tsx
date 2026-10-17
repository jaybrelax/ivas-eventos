"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { KeyRound, Pencil, Phone, Trash2, UserPlus, X } from "lucide-react";
import { alterarPerfil, criarUsuario, excluirUsuario, redefinirSenha, salvarDadosPessoais } from "./actions";
import { PERFIS, type Perfil } from "@/lib/config";
import { Aviso, BotaoEnviar, Carregando } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { CampoFoto } from "@/components/CampoFoto";
import { BotaoConfirmar } from "@/components/Confirmar";

type U = {
  id: string; nome: string; email: string; perfil: Perfil | null; telefone: string | null; foto: string | null;
  funcaoRitual: "mestre" | "guardiao" | "nenhuma"; sexo: "masculino" | "feminino" | null;
};

const FUNCAO_ROTULO = { mestre: "Mestre", guardiao: "Guardião", nenhuma: "" } as const;
const SEXO_ROTULO = { masculino: "Masculino", feminino: "Feminino" } as const;

/** Selects de função nos rituais e categoria, usados ao criar e ao editar. */
function CamposRitual({ id, funcao, sexo, comAuto }: { id: string; funcao?: U["funcaoRitual"]; sexo?: U["sexo"]; comAuto?: boolean }) {
  return (
    <>
      <div>
        <label className="rotulo" htmlFor={`${id}-funcao`}>Função nos rituais</label>
        <select id={`${id}-funcao`} name="funcao_ritual" defaultValue={comAuto ? "" : funcao} className="campo">
          {comAuto && <option value="">Igual ao perfil</option>}
          <option value="mestre">Mestre</option>
          <option value="guardiao">Guardião</option>
          <option value="nenhuma">Nenhuma (não é escalado)</option>
        </select>
      </div>
      <div>
        <label className="rotulo" htmlFor={`${id}-sexo`}>Categoria</label>
        <select id={`${id}-sexo`} name="sexo" defaultValue={sexo ?? ""} className="campo">
          <option value="">Não informada</option>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
        </select>
      </div>
    </>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div><label className="rotulo" htmlFor="nu-nome">Nome</label><input id="nu-nome" name="nome" required className="campo" /></div>
        <div><label className="rotulo" htmlFor="nu-email">E-mail</label><input id="nu-email" name="email" type="email" required className="campo" /></div>
        <div><label className="rotulo" htmlFor="nu-tel">Telefone</label><input id="nu-tel" name="telefone" type="tel" inputMode="tel" placeholder="(43) 99999-0000" autoComplete="off" className="campo" /></div>
        <div><label className="rotulo" htmlFor="nu-senha">Senha</label><input id="nu-senha" name="senha" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required autoComplete="new-password" className="campo" /></div>
        <CamposRitual id="nu" comAuto />
        <div>
          <label className="rotulo" htmlFor="nu-perfil">Perfil de acesso</label>
          <select id="nu-perfil" name="perfil" defaultValue="guardiao" className="campo">
            {PERFIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
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
            {souEu && <span className="chip bg-stone-100 text-stone-500">você</span>}
            {u.funcaoRitual !== "nenhuma" && (
              <span className="chip bg-mata-50 text-mata-700 ring-1 ring-mata-200 ring-inset">
                {FUNCAO_ROTULO[u.funcaoRitual]}{u.sexo && ` · ${SEXO_ROTULO[u.sexo]}`}
              </span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-stone-500">
            <span className="truncate">{u.email}</span>
            {u.telefone && (
              <a href={linkWhats(u.telefone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-mata-700" title="Abrir no WhatsApp">
                <Phone size={13} />{u.telefone}
              </a>
            )}
          </p>
        </div>
        <select
          defaultValue={u.perfil ?? ""}
          disabled={pendente}
          onChange={(e) => rodar(() => alterarPerfil(u.id, e.target.value as Perfil))}
          className="campo w-auto min-w-36"
          aria-label={`Perfil de acesso de ${u.nome}`}
          title="Perfil de acesso" 
        >
          {!u.perfil && <option value="">Sem perfil</option>}
          {PERFIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <div className="flex gap-1">
          {pendente && <span className="grid h-10 w-6 place-items-center text-stone-400"><Carregando /></span>}
          <button className="btn-icone" disabled={pendente} onClick={() => { setEditando((v) => !v); setTrocandoSenha(false); }} title="Editar nome, telefone e foto" aria-label="Editar dados">
            <Pencil size={17} />
          </button>
          <button className="btn-icone" disabled={pendente} onClick={() => { setTrocandoSenha((v) => !v); setEditando(false); }} title="Redefinir senha" aria-label="Redefinir senha">
            <KeyRound size={17} />
          </button>
          {!souEu && (
            <BotaoConfirmar
              className="btn-icone hover:bg-red-50 hover:text-red-700"
              disabled={pendente}
              title="Excluir usuário"
              pergunta={`Excluir ${u.nome}? Essa ação não pode ser desfeita.`}
              aoConfirmar={() => rodar(() => excluirUsuario(u.id))}
            >
              <Trash2 size={17} />
            </BotaoConfirmar>
          )}
        </div>
      </div>

      {editando && <EditarDados u={u} aoSalvar={() => setEditando(false)} />}

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

function EditarDados({ u, aoSalvar }: { u: U; aoSalvar: () => void }) {
  const [estado, acao, salvando] = useActionState(async (prev: Awaited<ReturnType<typeof salvarDadosPessoais>>, form: FormData) => {
    const r = await salvarDadosPessoais(prev, form);
    if (r?.ok) aoSalvar();
    return r;
  }, undefined);
  return (
    <form action={acao} className="mt-3 animate-surgir space-y-4 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200 sm:ml-14">
      <input type="hidden" name="userId" value={u.id} />
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoFoto nome={u.nome} fotoAtual={u.foto} tamanho={64} />
      <div className="grid gap-3 sm:grid-cols-2">
        <CamposRitual id={`ed-${u.id}`} funcao={u.funcaoRitual} sexo={u.sexo} />
        <div><label className="rotulo" htmlFor={`ed-nome-${u.id}`}>Nome</label><input id={`ed-nome-${u.id}`} name="nome" defaultValue={u.nome} required className="campo" /></div>
        <div><label className="rotulo" htmlFor={`ed-tel-${u.id}`}>Telefone</label><input id={`ed-tel-${u.id}`} name="telefone" type="tel" inputMode="tel" defaultValue={u.telefone ?? ""} placeholder="(43) 99999-0000" className="campo" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secundario" onClick={aoSalvar}>Cancelar</button>
        <button className="btn-primario" disabled={salvando}>{salvando ? <><Carregando /> Salvando…</> : "Salvar"}</button>
      </div>
    </form>
  );
}
