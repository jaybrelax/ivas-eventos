"use client";

import { useActionState, useState } from "react";
import { KeyRound, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { salvarChavesApi } from "./actions";
import type { OpcoesImagem } from "@/lib/ia";
import { Aviso, BotaoEnviar } from "@/components/ui";

export function ChavesApiForm({ chaveMascarada, prompt, opcoes }: { chaveMascarada: string | null; prompt: string; opcoes: OpcoesImagem }) {
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

      <div className="rounded-xl bg-mata-50 p-4 text-sm text-stone-700">
        <p className="font-semibold">Logos do Instituto · sincronização automática</p>
        <p className="mt-2">Use <code>{"{{logo_ivas_fundo_claro}}"}</code> para a versão colorida ou <code>{"{{logo_ivas_fundo_escuro}}"}</code> para a versão branca.</p>
        <p className="ajuda">As imagens vêm de Configurações › Instituto. Cada versão é enviada à OpenAI no primeiro uso e reutilizada nas próximas gerações. Se você trocar a logo, a nova imagem será registrada no próximo uso.</p>
      </div>

      <div>
        <label className="rotulo flex items-center gap-1.5" htmlFor="prompt_imagem">
          <Sparkles size={15} className="text-mata-600" /> Estrutura do prompt
        </label>
        <textarea
          id="prompt_imagem"
          name="prompt_imagem"
          rows={10}
          maxLength={12000}
          defaultValue={prompt}
          className="campo leading-relaxed"
          placeholder={"Defina aqui a composição, os textos e as regras da imagem. Insira {{art_direction}} onde deseja aplicar a direção artística."}
        />
        <p className="ajuda">O título, o tipo e a descrição do evento são somados automaticamente. Exemplo de uso da logo: {"Aplique {{logo_ivas_fundo_claro}} no canto inferior direito, preservando as cores e as proporções."}</p>
      </div>

      <div>
        <label className="rotulo" htmlFor="art_direction">Art direction · Direção artística</label>
        <textarea id="art_direction" name="art_direction" rows={7} maxLength={6000} defaultValue={opcoes.art_direction} className="campo leading-relaxed" aria-describedby="art-direction-ajuda" placeholder="Ex.: Ilustração botânica celestial, contornos desenhados à mão, formas orgânicas e paleta de esmeralda, turquesa e dourado suave." />
        <p id="art-direction-ajuda" className="ajuda">Descreva o estilo visual, a paleta e a técnica. Esse texto será inserido no lugar de <code>{"{{art_direction}}"}</code> na estrutura do prompt. Tamanho e orientação são definidos nas configurações da imagem.</p>
      </div>

      <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
        <p className="font-semibold">Marcadores disponíveis no prompt</p>
        <ul className="mt-2 space-y-1">
          <li><code>{"{{art_direction}}"}</code> · texto do campo de direção artística</li>
          <li><code>{"{{logo_ivas_fundo_claro}}"}</code> · logo colorida do Instituto</li>
          <li><code>{"{{logo_ivas_fundo_escuro}}"}</code> · logo branca do Instituto</li>
          <li><code>{"{{titulo_ritual}}"}</code> · título preenchido</li>
          <li><code>{"{{data_ritual}}"}</code> · data em DD/MM/AAAA</li>
          <li><code>{"{{horario_ritual}}"}</code> · horário de início em HH:mm</li>
          <li><code>{"{{numero_ritual}}"}</code> · número geral do ritual</li>
          <li><code>{"{{local_ritual}}"}</code> · local e endereço</li>
        </ul>
        <p className="mt-3">Exemplo: {"Direção artística: {{art_direction}}. Escreva “{{titulo_ritual}}”, “Ritual nº {{numero_ritual}}” e “{{data_ritual}} às {{horario_ritual}} · {{local_ritual}}”. Aplique {{logo_ivas_fundo_escuro}} no canto inferior direito sobre o fundo roxo."}</p>
        <p className="ajuda">Os dados vêm do formulário do evento. Para usar o número em um novo ritual, salve o evento primeiro para que ele receba a numeração.</p>
      </div>

      <section className="space-y-4 border-t border-stone-100 pt-5">
        <div><h3 className="font-semibold text-stone-900">Configurações da imagem</h3><p className="ajuda">Usadas na geração da capa dos eventos.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="model" className="rotulo">Modelo</label><select id="model" name="model" defaultValue={opcoes.model} className="campo"><option value="gpt-image-2.5-flare">GPT Image 2.5 Flare</option><option value="gpt-image-2.5-sunburst">GPT Image 2.5 Sunburst</option><option value="gpt-image-2">GPT Image 2</option><option value="gpt-image-1.5">GPT Image 1.5</option><option value="gpt-image-1-mini">GPT Image 1 Mini</option><option value="chatgpt-image-latest">ChatGPT Image Latest</option></select></div>
          <div><label htmlFor="size" className="rotulo">Tamanho e orientação</label><select id="size" name="size" defaultValue={opcoes.size} className="campo"><option value="auto">Automático</option><option value="1024x1024">Quadrado · 1024 × 1024</option><option value="1536x1024">Horizontal · 1536 × 1024</option><option value="1024x1536">Vertical · 1024 × 1536</option></select></div>
          <div><label htmlFor="quality" className="rotulo">Qualidade</label><select id="quality" name="quality" defaultValue={opcoes.quality} className="campo"><option value="auto">Automática</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></div>
          <div><label htmlFor="output_format" className="rotulo">Formato de saída</label><select id="output_format" name="output_format" defaultValue={opcoes.output_format} className="campo"><option value="webp">WebP</option><option value="png">PNG</option><option value="jpeg">JPEG</option></select></div>
          <div><label htmlFor="background" className="rotulo">Fundo</label><select id="background" name="background" defaultValue={opcoes.background} className="campo"><option value="auto">Automático</option><option value="opaque">Opaco</option><option value="transparent">Transparente</option></select></div>
          <div><label htmlFor="moderation" className="rotulo">Moderação</label><select id="moderation" name="moderation" defaultValue={opcoes.moderation} className="campo"><option value="auto">Automática</option><option value="low">Baixa</option></select></div>
          <div><label htmlFor="quantidade-imagens" className="rotulo">Número de imagens</label><select id="quantidade-imagens" className="campo" disabled><option>1 imagem</option></select><p className="ajuda">O aplicativo usa uma capa por evento.</p></div>
          <div><label htmlFor="imagens-parciais" className="rotulo">Imagens parciais</label><select id="imagens-parciais" className="campo" disabled><option>Indisponível</option></select><p className="ajuda">Depende de geração em tempo real.</p></div>
          <div><label htmlFor="fidelidade-entrada" className="rotulo">Fidelidade da imagem de entrada</label><select id="fidelidade-entrada" className="campo" disabled><option>Indisponível</option></select><p className="ajuda">Utilizada na edição de imagens existentes.</p></div>
        </div>
      </section>

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar chaves API</BotaoEnviar>
      </div>
    </form>
  );
}
