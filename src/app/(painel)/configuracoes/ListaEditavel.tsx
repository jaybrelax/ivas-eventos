"use client";

import { startTransition, useActionState, useId, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { excluirItem, salvarItem, type Resultado } from "./actions";
import { CAMPOS, type Campo, type TabelaEditavel } from "./campos";
import { Aviso } from "@/components/ui";
import { InputTelefone } from "@/components/InputTelefone";
import { BotaoConfirmar } from "@/components/Confirmar";

type Item = Record<string, unknown> & { $id: string };

const LARG = { sm: "sm:w-36", md: "sm:w-56", lg: "sm:flex-1 sm:min-w-64" };

function Entrada({ c, valor }: { c: Campo; valor: unknown }) {
  const id = useId();
  if (c.tipo === "checkbox")
    return (
      <label className="flex h-10 cursor-pointer items-center gap-2 self-end rounded-xl px-1 text-sm whitespace-nowrap text-stone-700">
        <input type="checkbox" name={c.nome} defaultChecked={valor === undefined ? c.nome === "ativo" || c.nome === "whatsapp" : !!valor} className="h-4 w-4 cursor-pointer rounded accent-mata-700" />
        {c.rotulo}
      </label>
    );
  const largura = c.largura ? LARG[c.largura] : "sm:w-24";
  return (
    <div className={`w-full ${largura}`}>
      <label className="rotulo" htmlFor={id}>{c.rotulo}</label>
      {c.tipo === "select" ? (
        <select id={id} name={c.nome} defaultValue={String(valor ?? c.opcoes?.[0]?.valor ?? "")} className="campo">
          {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
      ) : c.tipo === "telefone" ? (
        <InputTelefone id={id} name={c.nome} defaultValue={valor == null ? "" : String(valor)} required={c.obrigatorio} placeholder={c.dica} autoComplete="off" />
      ) : c.tipo === "color" ? (
        <span className="campo flex items-center px-1.5">
          <input id={id} name={c.nome} type="color" defaultValue={String(valor ?? "#6d28d9")} className="h-7 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0" />
        </span>
      ) : (
        <input id={id} name={c.nome} type={c.tipo} defaultValue={valor == null ? "" : String(valor)} required={c.obrigatorio} placeholder={c.dica} className="campo" />
      )}
    </div>
  );
}

function Linha({ tabela, item, aoSalvar }: { tabela: TabelaEditavel; item?: Item; aoSalvar?: () => void }) {
  const [estado, acao, salvando] = useActionState(async (prev: Resultado, form: FormData) => {
    const r = await salvarItem(tabela, prev, form);
    if (r?.ok) aoSalvar?.();
    return r;
  }, undefined);
  const [excluindo, iniciar] = useTransition();
  const [erroExcluir, setErroExcluir] = useState<string>();

  return (
    <form
      className={`rounded-xl border p-3 transition sm:p-4 ${item ? "border-stone-200/80 bg-stone-50/40 hover:border-stone-300 hover:bg-white" : "border-dashed border-stone-300 bg-white"}`}
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
    >
      {item && <input type="hidden" name="$id" value={item.$id} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {CAMPOS[tabela].campos.map((c) => <Entrada key={c.nome} c={c as Campo} valor={item?.[c.nome]} />)}
        <div className="flex gap-2 sm:ml-auto">
          <button type="submit" className={item ? "btn-secundario" : "btn-primario"} disabled={salvando}>
            {salvando ? "Salvando…" : item ? "Salvar" : <><Plus size={16} /> Adicionar</>}
          </button>
          {item && (
            <BotaoConfirmar
              className="btn-icone text-stone-400 hover:bg-red-50 hover:text-red-700"
              disabled={excluindo}
              title="Excluir"
              pergunta="Excluir este item?"
              aoConfirmar={() =>
                iniciar(async () => {
                  const r = await excluirItem(tabela, item.$id);
                  setErroExcluir(r?.erro);
                })
              }
            >
              <Trash2 size={15} />
            </BotaoConfirmar>
          )}
        </div>
      </div>
      {(estado?.erro || erroExcluir) && <div className="mt-2"><Aviso>{estado?.erro || erroExcluir}</Aviso></div>}
      {estado?.ok && !item && <div className="mt-2"><Aviso tipo="ok">{estado.ok}</Aviso></div>}
    </form>
  );
}

export function ListaEditavel({ tabela, itens }: { tabela: TabelaEditavel; itens: Item[] }) {
  const def = CAMPOS[tabela];
  const [chaveNovo, setChaveNovo] = useState(0);
  return (
    <section id={tabela} className="cartao">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="cartao-titulo">{def.titulo}</h2>
          <p className="cartao-sub">{def.descricao}</p>
        </div>
        <span className="chip shrink-0 bg-stone-100 text-stone-600 tabular-nums">{itens.length}</span>
      </div>
      <div className="space-y-2.5">
        {itens.map((i) => <Linha key={i.$id + JSON.stringify(i)} tabela={tabela} item={i} />)}
        <div>
          <p className="mt-5 mb-2 text-xs font-semibold tracking-wider text-stone-400 uppercase">Adicionar novo</p>
          <Linha key={chaveNovo} tabela={tabela} aoSalvar={() => setChaveNovo((k) => k + 1)} />
        </div>
      </div>
    </section>
  );
}
