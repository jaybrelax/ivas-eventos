"use client";

import { useActionState, useState } from "react";
import { KeyRound, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { salvarChavesApi } from "./actions";
import { Aviso, BotaoEnviar } from "@/components/ui";

export function ChavesApiForm({ chaveMascarada, prompt }: { chaveMascarada: string | null; prompt: string }) {
  const [estado, acao] = useActionState(salvarChavesApi, undefined);
  const [remover, setRemover] = useState(false);
  return (
    <form action={acao} className="cartao space-y-6">
      <div>
        <h2 className="cartao-titulo">Chaves API</h2>
        <p className="cartao-sub">Usadas para gerar a imagem de capa dos eventos com inteligência artificial.</p>
      </div>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="rotulo mb-0 flex items-center gap-1.5" htmlFor="openai_api_key">
            <KeyRound size={15} className="text-mata-600" /> Chave da OpenAI
          </label>
          {chaveMascarada && (
            <button
              type="button"
              onClick={() => setRemover((r) => !r)}
              className={`inline-flex items-center gap-1 text-xs ${remover ? "font-semibold text-red-700" : "text-stone-500 hover:text-red-700"}`}
            >
              <Trash2 size={12} /> {remover ? "Será removida · desfazer" : "Remover chave"}
            </button>
          )}
        </div>
        <input
          id="openai_api_key"
          name="openai_api_key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={remover}
          placeholder={chaveMascarada ? `Chave salva (${chaveMascarada}). Cole outra para trocar.` : "sk-…"}
          className="campo font-mono"
        />
        {remover && <input type="hidden" name="remover_chave" value="on" />}
        <p className="ajuda flex items-start gap-1.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          A chave fica guardada só no servidor e nunca volta para a tela. Cada imagem gerada é cobrada na sua conta da OpenAI.
        </p>
      </div>

      <div>
        <label className="rotulo flex items-center gap-1.5" htmlFor="prompt_imagem">
          <Sparkles size={15} className="text-mata-600" /> Prompt personalizado da imagem
        </label>
        <textarea
          id="prompt_imagem"
          name="prompt_imagem"
          rows={7}
          maxLength={3000}
          defaultValue={prompt}
          className="campo leading-relaxed"
          placeholder="Ex.: Arte espiritual em estilo ilustração digital, cores roxo e dourado, luz suave, sem texto nem letras, composição quadrada…"
        />
        <p className="ajuda">É o comando enviado à IA em toda geração. O título, o tipo e a descrição do evento são somados a ele automaticamente.</p>
      </div>

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar chaves API</BotaoEnviar>
      </div>
    </form>
  );
}
