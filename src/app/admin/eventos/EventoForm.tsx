"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Flame, Hash, Maximize2, Sparkles, SquarePen, X, ImagePlus, Megaphone, Shield, Star, Trash2, Users, type LucideIcon } from "lucide-react";
import { IconeGenero } from "@/components/genero";
import { IconeTipo } from "@/components/IconeTipo";
import { InfoRitual } from "@/components/InfoRitual";
import { salvarEvento } from "./actions";
import { gerarCapaComIA } from "./ia-actions";
import { Aviso, Carregando } from "@/components/ui";
import { useImagem } from "@/components/useImagem";
import type { Endereco, Evento, Instituto, Pessoa, TagEvento, TipoEvento } from "@/lib/types";
import { EscolhaEquipe } from "./Equipe";
import { formatarIdRitual } from "@/lib/format";

type Props = {
  evento?: Partial<Evento> & { $id?: string };
  tipos: TipoEvento[];
  /** Tags de evento: o texto de cada uma complementa a descrição do evento. */
  tags?: TagEvento[];
  enderecos: Endereco[];
  equipe: Pessoa[];
  podeNumerar: boolean;
  /** Lista de guardiões do evento (incluir, retirar, espera), mostrada dentro do grupo Guarnição. */
  guarnicao?: React.ReactNode;
  /** Lista de participantes (incluir, retirar, pagamento), mostrada dentro do grupo Participantes. */
  participantes?: React.ReactNode;
  /** Textos fixos de Configurações › Informações, que aparecem na página de todo ritual. */
  informacoes?: Pick<Instituto, "info_rituais" | "info_contribuicao">;
  podeConfigurar?: boolean;
  /** Há chave da OpenAI cadastrada: libera o botão “Gerar com IA” da capa. */
  iaPronta?: boolean;
  /** Bloco de renumeração dos próximos rituais, exibido logo abaixo do grupo Numeração. */
  renumerar?: React.ReactNode;
};

function Bloco({
  titulo,
  sub,
  icone: Icone,
  destaque = false,
  children,
}: {
  titulo: string;
  sub?: string;
  icone?: LucideIcon;
  /** Moldura dourada para o grupo ganhar destaque na página. */
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`cartao space-y-5 ${destaque ? "border-ouro-300 bg-gradient-to-br from-ouro-50 via-white to-white ring-1 ring-ouro-200/70" : ""}`}>
      <div className={Icone ? "flex items-start gap-3" : ""}>
        {Icone && (
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${destaque ? "bg-gradient-to-br from-ouro-300 to-ouro-600 text-white shadow-sm" : "bg-mata-50 text-mata-600"}`}>
            <Icone size={19} />
          </span>
        )}
        <div>
          <h2 className={`cartao-titulo ${destaque ? "text-lg" : ""}`}>{titulo}</h2>
          {sub && <p className="cartao-sub">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Grupo que se recolhe (cascata): o cabeçalho fica sempre à vista e o conteúdo abre e fecha.
 * Os campos dentro continuam no formulário e são enviados mesmo com o grupo fechado (só ficam escondidos).
 * `visivel` fica fora da parte recolhida, para campos que precisam estar sempre à mostra.
 */
function BlocoRecolhivel({
  titulo,
  sub,
  icone: Icone,
  visivel,
  children,
}: {
  titulo: string;
  sub?: string;
  icone: LucideIcon;
  visivel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="cartao">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full cursor-pointer items-start gap-3 text-left select-none"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mata-50 text-mata-600"><Icone size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="cartao-titulo block">{titulo}</span>
          {sub && <span className="cartao-sub block">{sub}</span>}
        </span>
        <ChevronDown size={18} className={`mt-2.5 shrink-0 text-stone-400 transition ${aberto ? "rotate-180" : ""}`} />
      </button>
      {/* Sempre à vista, mesmo com o grupo fechado */}
      {visivel && <div className="mt-5">{visivel}</div>}
      {/* Fechado só esconde: os campos continuam no formulário e são enviados */}
      <div className={`mt-5 space-y-5 ${aberto ? "" : "hidden"}`}>{children}</div>
    </section>
  );
}

export function EventoForm({ evento, tipos, tags, enderecos, equipe, podeNumerar, guarnicao, participantes, informacoes, podeConfigurar = false, iaPronta = false, renumerar }: Props) {
  const [estado, acao, pendente] = useActionState(salvarEvento, undefined);
  const padrao = enderecos.find((e) => e.padrao) ?? enderecos[0];
  const [endSel, setEndSel] = useState<string>(
    evento?.endereco_livre ? "__livre" : (evento?.endereco_id ?? padrao?.$id ?? "__livre"),
  );
  const [tipoId, setTipoId] = useState(evento?.tipo_id ?? tipos[0]?.$id ?? "");
  const [tagsSel, setTagsSel] = useState<string[]>(evento?.tags ?? []);
  const tipo = tipos.find((t) => t.$id === tipoId);
  const idRitual = formatarIdRitual(evento?.ritual_numero_geral ?? null, evento?.ritual_ano ?? null, evento?.ritual_numero_ano ?? null);
  const [destaque, setDestaque] = useState(evento?.destaque ?? false);
  const [banner, setBanner] = useState(evento?.mostrar_banner ?? true);
  const { local: capaLocal, erro: erroCapa, otimizando, escolher, limpar } = useImagem("capa");
  const [removerCapa, setRemoverCapa] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const capaSalva = evento?.capa_file_id && !removerCapa ? `/api/arquivo/${evento.capa_file_id}` : null;
  const capaPreview = capaLocal ?? capaSalva;

  const [lightbox, setLightbox] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const [okIA, setOkIA] = useState(false);

  /** Gera a capa com a OpenAI a partir do título e da descrição digitados e a coloca no campo da capa. */
  const gerarComIA = async (form: HTMLFormElement) => {
    const valor = (nome: string) => (form.elements.namedItem(nome) as HTMLInputElement | null)?.value ?? "";
    setErroIA(null);
    setOkIA(false);
    setGerando(true);
    try {
      const r = await gerarCapaComIA({ titulo: valor("titulo"), descricao: valor("descricao"), tipoId });
      if (!r.ok) {
        setErroIA(r.erro);
        return;
      }
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const arquivo = new File([bytes], r.nome, { type: r.tipo, lastModified: Date.now() });
      setOkIA(true);
      escolherCapa(form.elements.namedItem("capa") as HTMLInputElement, arquivo);
    } catch {
      setErroIA("Não foi possível gerar a imagem agora. Tente de novo.");
    } finally {
      setGerando(false);
    }
  };

  const escolherCapa = (input: HTMLInputElement, f?: File | null) => {
    escolher(input, f);
    if (f) setRemoverCapa(false);
  };

  return (
    <form
      className="pb-6"
      onSubmit={(e) => {
        // Envia sem limpar o formulário: se der erro, nada do que foi digitado se perde
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
    >
      {evento?.$id && <input type="hidden" name="id" value={evento.$id} />}
      {estado?.erro && <div className="mb-5"><Aviso>{estado.erro}</Aviso></div>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Coluna principal */}
        <div className="space-y-6">
          <Bloco titulo="Informações" sub="O essencial que aparece na agenda e nos banners.">
            <div className="grid gap-5 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
              {/* Capa à esquerda de título, data e endereço */}
              <div className="flex flex-col gap-2">
                <span className="rotulo mb-0">Imagem de capa</span>
                <label
                  className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
                    arrastando ? "border-mata-400 bg-mata-50" : capaPreview ? "border-transparent" : "border-stone-200 bg-stone-50 hover:border-mata-300 hover:bg-mata-50/40"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastando(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f?.type.startsWith("image/")) escolherCapa(e.currentTarget.querySelector("input")!, f);
                  }}
                >
                  {capaPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={capaPreview} alt="Capa do evento" className="absolute inset-0 h-full w-full rounded-xl object-cover" />
                      {/* Ao passar o mouse: ampliar (lightbox) e excluir; clicar no resto da imagem troca */}
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-mata-950/0 text-white opacity-0 transition group-hover:bg-mata-950/55 group-hover:opacity-100 pointer-coarse:bg-mata-950/35 pointer-coarse:opacity-100">
                        <span className="flex gap-3">
                          <button
                            type="button"
                            title="Ver imagem ampliada"
                            aria-label="Ver imagem ampliada"
                            className="grid h-11 w-11 place-items-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur-md transition hover:bg-white/30"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightbox(true); }}
                          >
                            <Maximize2 size={18} />
                          </button>
                          <button
                            type="button"
                            title="Excluir imagem"
                            aria-label="Excluir imagem"
                            className="grid h-11 w-11 place-items-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur-md transition hover:bg-red-500/80"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const principal = e.currentTarget.closest("label")?.querySelector<HTMLInputElement>("input[type=file]");
                              limpar(principal);
                              if (evento?.capa_file_id) setRemoverCapa(true);
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </span>
                        <span className="text-xs font-medium">Clique ou arraste para trocar</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-mata-600 shadow-sm ring-1 ring-stone-200 transition group-hover:scale-105"><ImagePlus size={20} /></span>
                      <span className="text-sm font-medium text-stone-700">Arraste uma imagem ou clique</span>
                      <span className="text-xs text-stone-500">PNG, JPG ou WEBP · formato quadrado · reduzida automaticamente</span>
                    </span>
                  )}
                  <input
                    type="file"
                    name="capa"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => escolherCapa(e.currentTarget, e.target.files?.[0])}
                  />
                  <ProgressoIA ativo={gerando} ok={okIA} />
                </label>
                {/* Geração por IA: usa o prompt das Configurações + título e descrição deste evento */}
                <button
                  type="button"
                  disabled={!iaPronta || gerando}
                  onClick={(e) => e.currentTarget.form && gerarComIA(e.currentTarget.form)}
                  className="btn-secundario w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {gerando ? <><Carregando /> Gerando a imagem…</> : <><Sparkles size={16} className="text-mata-600" /> Gerar com IA</>}
                </button>
                {gerando && <p className="text-xs text-stone-500">Se a OpenAI estiver lenta, pode levar um pouco mais. Não feche a página.</p>}
                {!iaPronta && (
                  <p className="text-xs text-stone-500">
                    Para gerar com IA, {podeConfigurar ? <Link href="/admin/configuracoes?secao=chaves" className="font-medium text-mata-700 underline-offset-2 hover:underline">cadastre a chave da OpenAI</Link> : "peça a um admin para cadastrar a chave da OpenAI"} em Configurações.
                  </p>
                )}
                {erroIA && <p className="text-xs text-red-700">{erroIA}</p>}
                {capaLocal && !gerando && !erroIA && <p className="text-xs text-stone-500">A imagem é salva como capa quando você salvar o evento.</p>}
                {otimizando && <p className="text-xs text-stone-500">Otimizando a imagem…</p>}
                {erroCapa && <p className="text-xs text-red-700">{erroCapa}</p>}
                {lightbox && capaPreview && <LightboxCapa src={capaPreview} alt={evento?.titulo ?? "Capa do evento"} onFechar={() => setLightbox(false)} />}
                {removerCapa && <input type="hidden" name="remover_capa" value="on" />}
                {removerCapa && <p className="text-xs text-red-700">A capa atual será removida ao salvar.</p>}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="rotulo" htmlFor="titulo">Título do evento</label>
                  <input id="titulo" name="titulo" required maxLength={80} defaultValue={evento?.titulo} className="campo h-11 text-base" placeholder="Ex.: Ritual de Lua Cheia" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="rotulo" htmlFor="data">Data</label>
                    <input id="data" name="data" type="date" required defaultValue={evento?.data} className="campo" />
                  </div>
                  <div>
                    <label className="rotulo" htmlFor="hora_inicio">Horário de início</label>
                    <input id="hora_inicio" name="hora_inicio" type="time" required defaultValue={evento?.hora_inicio ?? "19:00"} className="campo" />
                  </div>
                </div>
                <div>
                  <label className="rotulo" htmlFor="endereco_id">Endereço</label>
                  <select id="endereco_id" name="endereco_id" value={endSel} onChange={(e) => setEndSel(e.target.value)} className="campo">
                    {enderecos.map((e) => (
                      <option key={e.$id} value={e.$id}>{e.apelido} — {e.endereco}</option>
                    ))}
                    <option value="__livre">Outro endereço…</option>
                  </select>
                  {endSel === "__livre" && (
                    <input name="endereco_livre" defaultValue={evento?.endereco_livre ?? ""} className="campo mt-2" placeholder="Rua, número, bairro, cidade" autoFocus />
                  )}
                  {!enderecos.length && <p className="ajuda">Dica: cadastre endereços fixos em Configurações.</p>}
                </div>
              </div>
            </div>
            <div>
              <label className="rotulo" htmlFor="descricao">Descrição e observações</label>
              <textarea id="descricao" name="descricao" rows={5} defaultValue={evento?.descricao ?? ""} className="campo" placeholder="Informações específicas sobre este evento" />
            </div>
          </Bloco>

          <Bloco titulo="Tipo do evento" sub="Tipos marcados como ritual recebem numeração automática.">
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
              {tipos.filter((t) => t.ativo || t.$id === tipoId).map((t) => {
                const on = tipoId === t.$id;
                return (
                  <label
                    key={t.$id}
                    className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${on ? "shadow-sm" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"}`}
                    style={on ? { borderColor: t.cor, background: `${t.cor}0d`, boxShadow: `0 0 0 3px ${t.cor}1f` } : undefined}
                  >
                    <input type="radio" name="tipo_id" value={t.$id} checked={on} onChange={() => setTipoId(t.$id)} className="sr-only" />
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${t.cor}1a`, color: t.cor }}>
                      <IconeTipo nome={t.icone} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-stone-900">{t.nome}</span>
                      <span className="block text-xs text-stone-500">{t.conta_como_ritual ? "Conta como ritual" : "Evento"}</span>
                    </span>
                    {on && <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: t.cor }}><Check size={12} strokeWidth={3} /></span>}
                  </label>
                );
              })}
            </div>
            {tipo?.descricao && (
              <p className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line text-stone-700 ring-1 ring-inset" style={{ background: `${tipo.cor}0d`, ["--tw-ring-color" as string]: `${tipo.cor}26` }}>
                {tipo.descricao}
              </p>
            )}
          </Bloco>

          {(tags?.length ?? 0) > 0 && (
            <Bloco titulo="Tags do evento" sub="O texto de cada tag marcada é somado à descrição na página do evento.">
              <div className="flex flex-wrap gap-2">
                {tags!.filter((t) => t.ativo || tagsSel.includes(t.$id)).map((t) => {
                  const on = tagsSel.includes(t.$id);
                  const cor = t.cor || "#57534e";
                  return (
                    <label
                      key={t.$id}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "" : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"}`}
                      style={on ? { borderColor: cor, background: `${cor}14`, color: cor } : undefined}
                    >
                      <input
                        type="checkbox"
                        name="tags"
                        value={t.$id}
                        checked={on}
                        onChange={(e) => setTagsSel((atual) => (e.target.checked ? [...atual, t.$id] : atual.filter((x) => x !== t.$id)))}
                        className="sr-only"
                      />
                      <IconeTipo nome={t.icone || "hash"} size={14} strokeWidth={on ? 2.6 : 2} />
                      {t.nome}
                      {!t.ativo && <span className="text-xs opacity-70">(inativa)</span>}
                    </label>
                  );
                })}
              </div>
              {tags!.filter((t) => tagsSel.includes(t.$id) && t.ativo && t.descricao?.trim()).map((t) => (
                <p key={t.$id} className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line text-stone-700 ring-1 ring-inset" style={{ background: `${t.cor || "#57534e"}0d`, ["--tw-ring-color" as string]: `${t.cor || "#57534e"}26` }}>
                  <strong className="mb-0.5 block text-xs tracking-wide uppercase" style={{ color: t.cor || "#57534e" }}>{t.nome}</strong>
                  {t.descricao}
                </p>
              ))}
            </Bloco>
          )}

          {tipo?.conta_como_ritual && (
            <>
            <Bloco titulo="Numeração" sub={podeNumerar ? "Automática ao salvar. Você pode ajustar se precisar." : "Gerada automaticamente ao salvar."}>
              <div className="flex items-center gap-2.5 rounded-xl bg-mata-50 px-3.5 py-2.5 text-sm text-mata-800 ring-1 ring-mata-100">
                <Hash size={16} className="shrink-0" />
                {idRitual ? <span>Numeração atual: <strong className="font-mono">{idRitual}</strong></span> : "O número geral e o do ano serão gerados ao salvar."}
              </div>
              {podeNumerar && evento?.ritual_numero_geral && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="rotulo" htmlFor="rng">Nº geral</label>
                    <input id="rng" name="ritual_numero_geral" type="number" min={1} defaultValue={evento.ritual_numero_geral ?? ""} className="campo" />
                  </div>
                  <div>
                    <label className="rotulo" htmlFor="rna">Nº no ano {evento.ritual_ano}</label>
                    <input id="rna" name="ritual_numero_ano" type="number" min={1} defaultValue={evento.ritual_numero_ano ?? ""} className="campo" />
                  </div>
                </div>
              )}
            </Bloco>
            {renumerar}
            </>
          )}

          <Bloco titulo="Mestres" sub="Quem conduz o ritual. Toque nos nomes para escolher." icone={Flame} destaque>
            <EscolhaEquipe funcao="mestre" equipe={equipe} inicial={evento?.mestres ?? []} />
          </Bloco>

          {tipo?.conta_como_ritual && (
            <BlocoRecolhivel titulo="Guarnição" icone={Shield} sub="Os guardiões se candidatam na página do evento, por ordem de chegada. Defina quantas vagas há para cada gênero.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="rotulo flex items-center gap-1.5" htmlFor="vagas_guardioes"><IconeGenero genero="masculino" size={14} /> Vagas de guardiões</label>
                  <input id="vagas_guardioes" name="vagas_guardioes" type="number" min={0} max={50} defaultValue={evento?.vagas_guardioes ?? 2} className="campo" />
                </div>
                <div>
                  <label className="rotulo flex items-center gap-1.5" htmlFor="vagas_guardias"><IconeGenero genero="feminino" size={14} /> Vagas de guardiãs</label>
                  <input id="vagas_guardias" name="vagas_guardias" type="number" min={0} max={50} defaultValue={evento?.vagas_guardias ?? 2} className="campo" />
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition hover:border-stone-300">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mata-50 text-mata-600"><Shield size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-900">Aceitar candidaturas</span>
                  <span className="block text-xs text-stone-500">Desligue para fechar as inscrições deste evento. Quem já está inscrito continua.</span>
                </span>
                <input type="checkbox" name="candidaturas_abertas" defaultChecked={evento?.candidaturas_abertas ?? true} className="interruptor mt-1.5" />
              </label>
              {guarnicao && <div className="border-t border-stone-100 pt-5">{guarnicao}</div>}
            </BlocoRecolhivel>
          )}

          {tipo && tipo.aberto_publico && !tipo.fechado_guardioes && (
            <BlocoRecolhivel
              titulo="Participantes"
              icone={Users}
              sub="Qualquer pessoa pode se inscrever pela página pública, por ordem de chegada."
              visivel={
                <div className="max-w-xs">
                  <label className="rotulo" htmlFor="vagas_participantes">Vagas de participantes</label>
                  <input id="vagas_participantes" name="vagas_participantes" type="number" min={0} max={1000} defaultValue={evento?.vagas_participantes ?? 30} className="campo" />
                </div>
              }
            >
              {tipo.conta_como_ritual ? (
                <p className="text-xs text-stone-500">Segue a mesma configuração de candidaturas do grupo Guarnição acima.</p>
              ) : (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition hover:border-stone-300">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mata-50 text-mata-600"><Users size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-900">Aceitar inscrições</span>
                    <span className="block text-xs text-stone-500">Desligue para fechar as inscrições deste evento. Quem já está inscrito continua.</span>
                  </span>
                  <input type="checkbox" name="candidaturas_abertas" defaultChecked={evento?.candidaturas_abertas ?? true} className="interruptor mt-1.5" />
                </label>
              )}
              {participantes && <div className="border-t border-stone-100 pt-5">{participantes}</div>}
            </BlocoRecolhivel>
          )}
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-6 xl:sticky xl:top-8">
          <section className="cartao space-y-3 p-4 sm:p-4">
            <h2 className="cartao-titulo">Visibilidade</h2>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                destaque ? "border-ouro-300 bg-gradient-to-br from-ouro-50 to-white ring-2 ring-ouro-200/60" : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${destaque ? "bg-ouro-500 text-white shadow-sm" : "bg-stone-100 text-stone-400"}`}>
                <Star size={18} className={destaque ? "fill-white" : ""} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-900">Evento em destaque</span>
                <span className="block text-xs text-stone-500">Realçado com estrela na agenda.</span>
              </span>
              <input type="checkbox" name="destaque" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} className="interruptor mt-1.5 checked:bg-ouro-500" />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-3.5 transition hover:border-stone-300">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${banner ? "bg-mata-50 text-mata-600" : "bg-stone-100 text-stone-400"}`}>
                <Megaphone size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-900">Mostrar no banner</span>
                <span className="block text-xs text-stone-500">Entra nos banners de divulgação.</span>
              </span>
              <input type="checkbox" name="mostrar_banner" checked={banner} onChange={(e) => setBanner(e.target.checked)} className="interruptor mt-1.5" />
            </label>
          </section>
          {tipo?.conta_como_ritual && informacoes && (
            <section className="cartao space-y-4 p-4 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="cartao-titulo">Na página do ritual</h2>
                  <p className="cartao-sub">Textos fixos, iguais em todos os rituais.</p>
                </div>
                {podeConfigurar && (
                  <Link href="/admin/configuracoes?secao=informacoes" className="btn-icone h-8 w-8 shrink-0" title="Editar em Configurações">
                    <SquarePen size={15} />
                  </Link>
                )}
              </div>
              {informacoes.info_rituais?.trim() || informacoes.info_contribuicao?.trim() ? (
                <div className="max-h-96 overflow-y-auto pr-1"><InfoRitual instituto={informacoes} compacto /></div>
              ) : (
                <p className="text-[13px] text-stone-500">Nenhum texto definido ainda{podeConfigurar ? " — preencha em Configurações › Informações." : "."}</p>
              )}
            </section>
          )}
        </aside>
      </div>

      {/* Barra de ações fixa */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200/80 bg-white/85 backdrop-blur-md md:left-64 xl:left-72">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <p className="hidden truncate text-sm text-stone-500 sm:block">
            {evento?.$id ? "Editando evento" : "Novo evento"}{tipo && <> · <span className="font-medium" style={{ color: tipo.cor }}>{tipo.nome}</span></>}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Link href="/admin/eventos" className="btn-secundario flex-1 sm:flex-none">Cancelar</Link>
            <button type="submit" className="btn-primario flex-1 sm:flex-none sm:px-6" disabled={pendente}>
              {pendente ? <><Carregando /> Salvando…</> : <><Check size={17} /> Salvar evento</>}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** Imagem ampliada sobre a página. Fecha com Esc, clique fora ou no X. */
function LightboxCapa({ src, alt, onFechar }: { src: string; alt: string; onFechar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [onFechar]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Imagem de capa ampliada" className="fixed inset-0 z-[100] grid place-items-center bg-stone-950/85 p-4 backdrop-blur-sm animate-aparecer" onClick={onFechar}>
      <button type="button" aria-label="Fechar" className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white/20" onClick={onFechar}>
        <X size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-[88vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/15" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body,
  );
}

/** Segundos até o anel chegar perto do fim: é o tempo médio que a OpenAI leva para devolver a imagem. */
const SEGUNDOS_IA = 15;

/**
 * Anel de progresso sobre a capa enquanto a IA gera a imagem. Vai a ~92% em 15 s; se a
 * geração demorar mais, segue devagar até 99%. Quando termina, completa os 100% e some.
 */
function ProgressoIA({ ativo, ok }: { ativo: boolean; ok: boolean }) {
  const [visivel, setVisivel] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (ativo) {
      const inicio = Date.now();
      setPct(0);
      setVisivel(true);
      const t = setInterval(() => {
        const seg = (Date.now() - inicio) / 1000;
        // suave no começo, quase linear até 15 s; depois só se aproxima de 99%
        const p = seg <= SEGUNDOS_IA ? 92 * (1 - Math.pow(1 - seg / SEGUNDOS_IA, 1.6)) : 92 + 7 * (1 - Math.exp(-(seg - SEGUNDOS_IA) / 20));
        setPct(Math.min(99, p));
      }, 100);
      return () => clearInterval(t);
    }
    if (visivel && !ok) {
      setVisivel(false); // falhou: some na hora, a mensagem de erro aparece abaixo
    } else if (visivel) {
      setPct(100);
      const t = setTimeout(() => setVisivel(false), 650);
      return () => clearTimeout(t);
    }
  }, [ativo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visivel) return null;
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div
      role="progressbar"
      aria-label="Gerando a imagem com IA"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="absolute inset-0 z-10 flex cursor-default flex-col items-center justify-center gap-3 rounded-xl bg-mata-950/80 text-white backdrop-blur-md animate-aparecer"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="relative grid h-36 w-36 place-items-center">
        {/* brilho girando atrás do anel */}
        <span aria-hidden className="absolute inset-0 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(214,176,86,0.55)_90deg,transparent_180deg)] opacity-60 blur-md [animation-duration:2.4s]" />
        <svg viewBox="0 0 128 128" className="relative h-full w-full -rotate-90">
          <defs>
            <linearGradient id="anel-ia" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e8c872" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
          <circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke="url(#anel-ia)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.12s linear" }}
          />
        </svg>
        <span className="absolute text-3xl font-semibold tabular-nums">{Math.round(pct)}<span className="text-base font-medium text-white/60">%</span></span>
      </div>
      <p className="flex items-center gap-1.5 text-sm font-medium"><Sparkles size={15} className="text-ouro-300" /> {pct >= 100 ? "Imagem pronta!" : "Criando sua imagem…"}</p>
      <p className="px-6 text-center text-xs text-white/55">Leva cerca de {SEGUNDOS_IA} segundos</p>
    </div>
  );
}
