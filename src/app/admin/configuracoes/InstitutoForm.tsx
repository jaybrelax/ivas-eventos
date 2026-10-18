"use client";

import { useActionState, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { salvarInstituto } from "./actions";
import { FONTES } from "./campos";
import { Aviso, BotaoEnviar } from "@/components/ui";
import { useImagem } from "@/components/useImagem";
import type { Instituto } from "@/lib/types";

function Logo({ rotulo, dica, nome, fileId, fundo }: { rotulo: string; dica: string; nome: string; fileId: string | null; fundo: string }) {
  const { local, erro, otimizando, escolher } = useImagem("logo");
  const [remover, setRemover] = useState(false);
  const preview = local ?? (fileId && !remover ? `/api/arquivo/${fileId}` : null);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="rotulo mb-0">{rotulo}</span>
        {fileId && !local && (
          <button type="button" onClick={() => setRemover((r) => !r)} className={`inline-flex items-center gap-1 text-xs ${remover ? "font-semibold text-red-700" : "text-stone-500 hover:text-red-700"}`}>
            <Trash2 size={12} /> {remover ? "Será removida · desfazer" : "Remover"}
          </button>
        )}
      </div>
      <label
        className="group relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-200 transition hover:border-mata-300"
        style={{ background: fundo }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={rotulo} className="max-h-24 max-w-[80%] object-contain transition group-hover:scale-[1.03]" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-xs text-stone-400">
            <ImagePlus size={22} />
            Clique para enviar
          </span>
        )}
        <input
          type="file"
          name={nome}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            escolher(e.currentTarget, f);
            if (f) setRemover(false);
          }}
        />
      </label>
      {remover && <input type="hidden" name={`remover_${nome}_file_id`} value="on" />}
      {erro ? <p className="ajuda text-red-700">{erro}</p> : <p className="ajuda">{otimizando ? "Otimizando a imagem…" : dica}</p>}
    </div>
  );
}

function Cor({ id, nome, rotulo, inicial }: { id: string; nome: string; rotulo: string; inicial: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <div>
      <label className="rotulo" htmlFor={id}>{rotulo}</label>
      <div className="campo flex items-center gap-2 px-1.5">
        <input id={id} name={nome} type="color" value={valor} onChange={(e) => setValor(e.target.value)} className="h-7 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
        <span className="font-mono text-xs text-stone-500 uppercase">{valor}</span>
      </div>
    </div>
  );
}

export function InstitutoForm({ instituto }: { instituto: Instituto }) {
  const [estado, acao] = useActionState(salvarInstituto, undefined);
  return (
    <form id="instituto" action={acao} className="cartao space-y-6">
      <div>
        <h2 className="cartao-titulo">Instituto</h2>
        <p className="cartao-sub">Nome, logomarca e identidade visual usados no painel e nos banners.</p>
      </div>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="nome">Nome completo</label>
          <input id="nome" name="nome" defaultValue={instituto.nome} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="nome_curto">Nome curto</label>
          <input id="nome_curto" name="nome_curto" defaultValue={instituto.nome_curto} className="campo" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Logo rotulo="Logo para fundo claro" dica="Usada nos banners claros. PNG, JPG, WEBP ou SVG." nome="logo" fileId={instituto.logo_file_id} fundo="#ffffff" />
        <Logo rotulo="Logo para fundo escuro" dica="Aparece no menu lateral e na tela de entrada. PNG, JPG, WEBP ou SVG." nome="logo_escura" fileId={instituto.logo_escura_file_id} fundo={instituto.cor_primaria} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Cor id="cp" nome="cor_primaria" rotulo="Cor primária" inicial={instituto.cor_primaria} />
        <Cor id="cs" nome="cor_secundaria" rotulo="Cor secundária" inicial={instituto.cor_secundaria} />
        <div>
          <label className="rotulo" htmlFor="ft">Fonte de título</label>
          <select id="ft" name="fonte_titulo" defaultValue={instituto.fonte_titulo} className="campo">
            {FONTES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="fx">Fonte de texto</label>
          <select id="fx" name="fonte_texto" defaultValue={instituto.fonte_texto} className="campo">
            {FONTES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="max-w-xs">
        <label className="rotulo" htmlFor="rni">Número inicial dos rituais</label>
        <input id="rni" name="ritual_numero_inicial" type="number" min={1} defaultValue={instituto.ritual_numero_inicial} className="campo" />
        <p className="ajuda">Usado só enquanto não houver nenhum ritual numerado.</p>
      </div>

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar dados do Instituto</BotaoEnviar>
      </div>
    </form>
  );
}
