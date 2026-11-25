"use client";

import { useActionState, useRef, useState } from "react";
import { Clock, ImagePlus, Monitor, Smartphone, Trash2 } from "lucide-react";
import { salvarHeroAgenda } from "./actions";
import { Aviso, BotaoEnviar } from "@/components/ui";
import { fundoHeroAgenda, sobreposicaoHeroAgenda, type HeroAgenda } from "@/lib/hero-agenda";
import { urlImagem } from "@/lib/links";
import { useImagem } from "@/components/useImagem";

const CORES = [
  { nome: "corTopo", rotulo: "Cor superior" },
  { nome: "corMeio", rotulo: "Cor central" },
  { nome: "corBase", rotulo: "Cor inferior" },
] as const;

export function HeroAgendaForm({ inicial }: { inicial: HeroAgenda }) {
  const [estado, acao] = useActionState(salvarHeroAgenda, undefined);
  const [hero, setHero] = useState(inicial);
  const desktop = useImagem("hero");
  const mobile = useImagem("hero");
  const desktopInput = useRef<HTMLInputElement>(null);
  const mobileInput = useRef<HTMLInputElement>(null);
  const [removerDesktop, setRemoverDesktop] = useState(false);
  const [removerMobile, setRemoverMobile] = useState(false);
  const [previa, setPrevia] = useState<"desktop" | "mobile">("desktop");
  const atualizar = <K extends keyof HeroAgenda>(nome: K, valor: HeroAgenda[K]) => setHero((atual) => ({ ...atual, [nome]: valor }));
  const imagemDesktop = desktop.local ?? (!removerDesktop && inicial.fundoDesktopFileId ? urlImagem(inicial.fundoDesktopFileId, 960) : null);
  const imagemMobile = mobile.local ?? (!removerMobile && inicial.fundoMobileFileId ? urlImagem(inicial.fundoMobileFileId, 640) : null);
  const imagemPrevia = previa === "desktop" ? imagemDesktop ?? imagemMobile : imagemMobile ?? imagemDesktop;
  const uploads = [
    { nome: "fundo_desktop", rotulo: "Fundo desktop", dica: "Para telas largas. Prefira imagem horizontal.", imagem: imagemDesktop, fileId: inicial.fundoDesktopFileId, remover: removerDesktop, setRemover: setRemoverDesktop, controle: desktop, input: desktopInput, Icone: Monitor },
    { nome: "fundo_mobile", rotulo: "Fundo celular", dica: "Para smartphones. Prefira imagem vertical.", imagem: imagemMobile, fileId: inicial.fundoMobileFileId, remover: removerMobile, setRemover: setRemoverMobile, controle: mobile, input: mobileInput, Icone: Smartphone },
  ] as const;

  return (
    <form action={acao} className="cartao space-y-6">
      <div>
        <h2 className="cartao-titulo">Topo da agenda</h2>
        <p className="cartao-sub">Textos e fundo exibidos no início da página Eventos.</p>
      </div>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div>
        <label className="rotulo" htmlFor="hero-selo">Texto do selo</label>
        <input id="hero-selo" name="selo" value={hero.selo} onChange={(e) => atualizar("selo", e.target.value)} maxLength={60} required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="hero-titulo">Título</label>
        <input id="hero-titulo" name="titulo" value={hero.titulo} onChange={(e) => atualizar("titulo", e.target.value)} maxLength={120} required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="hero-descricao">Descrição</label>
        <textarea id="hero-descricao" name="descricao" value={hero.descricao} onChange={(e) => atualizar("descricao", e.target.value)} maxLength={500} required rows={3} className="campo min-h-24 resize-y" />
      </div>

      <div>
        <p className="rotulo">Fundo em gradiente</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {CORES.map(({ nome, rotulo }) => (
            <label key={nome} className="flex items-center gap-2 rounded-xl border border-stone-200 p-2.5 text-sm text-stone-700">
              <input type="color" name={nome} value={hero[nome]} onChange={(e) => atualizar(nome, e.target.value)} className="h-9 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={rotulo} />
              <span className="min-w-0"><span className="block text-xs font-medium">{rotulo}</span><span className="font-mono text-[11px] text-stone-500">{hero[nome].toUpperCase()}</span></span>
            </label>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-stone-700" htmlFor="hero-opacidade-gradiente">Opacidade sobre a imagem</label>
            <output className="min-w-12 text-right text-sm font-semibold tabular-nums text-mata-800" htmlFor="hero-opacidade-gradiente">{hero.opacidadeGradiente}%</output>
          </div>
          <input id="hero-opacidade-gradiente" name="opacidadeGradiente" type="range" min="0" max="100" step="1" value={hero.opacidadeGradiente} onChange={(e) => atualizar("opacidadeGradiente", Number(e.target.value))} className="mt-3 w-full cursor-pointer accent-mata-700" />
          <p className="ajuda mt-1">Ajusta o gradiente sobre as fotos de fundo, sem alterar as cores do fundo.</p>
        </div>
      </div>

      <div>
        <p className="rotulo">Imagens de fundo</p>
        <p className="ajuda mt-0">Envie uma versão para desktop e outra para celular. Se uma ficar vazia, a outra será usada nos dois tamanhos. O gradiente escurece a imagem para manter os textos legíveis.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {uploads.map(({ nome, rotulo, dica, imagem, fileId, remover, setRemover, controle, input, Icone }) => (
            <div key={nome} className="rounded-xl border border-stone-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-800"><Icone size={15} />{rotulo}</span>
                {(imagem || fileId) && (
                  <button type="button" onClick={() => {
                    if (controle.local) { controle.limpar(input.current); setRemover(false); }
                    else setRemover(!remover);
                  }} className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-700">
                    <Trash2 size={13} />{remover ? "Desfazer" : "Remover"}
                  </button>
                )}
              </div>
              <label className="relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50 hover:border-mata-400">
                {imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagem} alt={`Prévia do ${rotulo.toLowerCase()}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-xs text-stone-500"><ImagePlus size={20} />Selecionar imagem</span>
                )}
                <input ref={input} type="file" name={nome} accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  controle.escolher(e.currentTarget, arquivo);
                  if (arquivo) setRemover(false);
                }} />
              </label>
              {remover && <input type="hidden" name={`remover_${nome}`} value="on" />}
              <p className={`ajuda ${controle.erro ? "text-red-700" : ""}`}>{controle.erro || (controle.otimizando ? "Otimizando imagem…" : dica)}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="rotulo mb-0">Prévia do hero</p>
          <div className="inline-flex rounded-lg bg-stone-100 p-1 text-xs font-medium" role="group" aria-label="Tamanho da prévia">
            <button type="button" onClick={() => setPrevia("desktop")} aria-pressed={previa === "desktop"} className={`rounded-md px-3 py-1.5 ${previa === "desktop" ? "bg-white text-mata-800 shadow-sm" : "text-stone-500"}`}>Desktop</button>
            <button type="button" onClick={() => setPrevia("mobile")} aria-pressed={previa === "mobile"} className={`rounded-md px-3 py-1.5 ${previa === "mobile" ? "bg-white text-mata-800 shadow-sm" : "text-stone-500"}`}>Celular</button>
          </div>
        </div>
        <div className={`relative mx-auto flex min-h-64 items-center justify-center overflow-hidden rounded-2xl px-5 py-9 text-center text-white sm:px-8 ${previa === "mobile" ? "max-w-80 min-h-96" : "w-full"}`} style={{ background: fundoHeroAgenda(hero) }}>
          {imagemPrevia && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagemPrevia} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: sobreposicaoHeroAgenda(hero) }} />
            </>
          )}
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ouro-400/30 bg-ouro-400/10 px-3 py-1 text-xs font-semibold text-ouro-300"><Clock size={13} />{hero.selo || "Texto do selo"}</span>
            <p className="mt-4 font-display text-2xl font-bold leading-tight sm:text-3xl">{hero.titulo || "Título da agenda"}</p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-300">{hero.descricao || "Descrição da agenda"}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar topo da agenda</BotaoEnviar>
      </div>
    </form>
  );
}
