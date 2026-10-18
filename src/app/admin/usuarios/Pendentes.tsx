"use client";

import { useState, useTransition } from "react";
import { Clock, Flame, Mail, MapPin, Phone, Shield, UserCheck, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PERFIS, type Perfil } from "@/lib/config";
import type { Pendente } from "@/lib/usuarios";
import { IconeGenero } from "@/components/genero";
import { BotaoConfirmar } from "@/components/Confirmar";
import { Aviso, Carregando } from "@/components/ui";
import { mascararTelefone } from "@/lib/telefone";
import { aprovarCadastro, recusarCadastro } from "./actions";

type FuncaoEscolha = "mestre" | "guardiao" | "nenhuma";
const FUNCOES: { id: FuncaoEscolha; nome: string }[] = [
  { id: "guardiao", nome: "Guardião" },
  { id: "mestre", nome: "Mestre" },
  { id: "nenhuma", nome: "Nenhuma" },
];

/** Cadastros feitos pela página pública, aguardando o Admin aprovar (com função e perfil) ou recusar. */
export function Pendentes({ lista }: { lista: Pendente[] }) {
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  if (!lista.length && !aviso) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700"><Clock size={16} /></span>
        <h2 className="cartao-titulo">Cadastros pendentes</h2>
        {lista.length > 0 && <span className="chip bg-amber-100 text-amber-800 tabular-nums">{lista.length}</span>}
      </div>
      {aviso && <div className="mb-3"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      <div className="grid gap-3 lg:grid-cols-2">
        {lista.map((p) => <CartaoPendente key={p.id} p={p} aoTerminar={setAviso} />)}
      </div>
    </section>
  );
}

function CartaoPendente({ p, aoTerminar }: { p: Pendente; aoTerminar: (a: { tipo: "ok" | "erro"; texto: string }) => void }) {
  const [funcao, setFuncao] = useState<FuncaoEscolha>(p.funcaoSolicitada ?? "nenhuma");
  const [perfil, setPerfil] = useState<Perfil>("normal");
  const [pendente, iniciar] = useTransition();
  const quando = new Date(p.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

  const rodar = (fn: () => Promise<{ ok?: string; erro?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      aoTerminar(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: `${p.nome}: ${r.ok}` });
    });

  return (
    <article className="cartao space-y-4 border-amber-200/80 p-4 sm:p-5">
      {/* Cabeçalho: foto, nome e data na mesma linha */}
      <div className="flex items-center gap-3">
        <Avatar nome={p.nome} foto={p.foto} tamanho={48} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold text-stone-900">
            <span className="truncate">{p.nome}</span>
            {p.sexo && <IconeGenero genero={p.sexo} size={15} />}
          </p>
          <p className="text-xs text-stone-400">Cadastro em {quando}</p>
        </div>
      </div>

      {/* Contato em linhas inteiras, sem disputar espaço com outros elementos */}
      <dl className="space-y-1.5 rounded-xl bg-stone-50 px-3.5 py-3 text-sm text-stone-600 ring-1 ring-stone-100">
        <div className="flex items-center gap-2"><Mail size={14} className="shrink-0 text-stone-400" /><dd className="min-w-0 truncate" title={p.email}>{p.email}</dd></div>
        {p.telefone && <div className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-stone-400" /><dd className="whitespace-nowrap">{mascararTelefone(p.telefone)}</dd></div>}
        {p.endereco && <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" /><dd className="min-w-0">{p.endereco}</dd></div>}
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor={`f-${p.id}`}>Função do usuário</label>
          <select id={`f-${p.id}`} value={funcao} onChange={(e) => setFuncao(e.target.value as FuncaoEscolha)} className="campo">
            {FUNCOES.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor={`p-${p.id}`}>Perfil de acesso</label>
          <select id={`p-${p.id}`} value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)} className="campo">
            {PERFIS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </div>
        {p.funcaoSolicitada && (
          <p className="flex items-center gap-1.5 text-xs whitespace-nowrap text-mata-700 sm:col-span-2">
            {p.funcaoSolicitada === "mestre" ? <Flame size={13} /> : <Shield size={13} />}
            Cadastro pelo link de {p.funcaoSolicitada === "mestre" ? "mestres" : "guardiões"}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
        <BotaoConfirmar
          acima
          alinhar="esquerda"
          disabled={pendente}
          className="btn border border-red-200 bg-white px-3 text-sm text-red-700 hover:bg-red-50"
          pergunta={`Recusar e apagar o cadastro de ${p.nome}?`}
          confirmar="Sim, recusar"
          aoConfirmar={() => rodar(() => recusarCadastro(p.id))}
        >
          <X size={16} /> Recusar
        </BotaoConfirmar>
        <button type="button" className="btn-primario" disabled={pendente} onClick={() => rodar(() => aprovarCadastro(p.id, funcao, perfil))}>
          {pendente ? <Carregando /> : <UserCheck size={16} />} Aprovar
        </button>
      </div>
    </article>
  );
}
