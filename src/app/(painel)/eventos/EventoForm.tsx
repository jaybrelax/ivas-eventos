"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { Check, Flame, Hash, SquarePen, ImagePlus, Megaphone, RefreshCw, Shield, Star, Trash2, type LucideIcon } from "lucide-react";
import { IconeGenero } from "@/components/genero";
import { IconeTipo } from "@/components/IconeTipo";
import { InfoRitual } from "@/components/InfoRitual";
import { salvarEvento } from "./actions";
import { Aviso, Carregando } from "@/components/ui";
import { useImagem } from "@/components/useImagem";
import type { Endereco, Evento, Instituto, Pessoa, TipoEvento } from "@/lib/types";
import { EscolhaEquipe } from "./Equipe";
import { formatarIdRitual } from "@/lib/format";

type Props = {
  evento?: Partial<Evento> & { $id?: string };
  tipos: TipoEvento[];
  enderecos: Endereco[];
  equipe: Pessoa[];
  podeNumerar: boolean;
  /** Lista de guardiões do evento (incluir, retirar, espera), mostrada dentro do grupo Guarnição. */
  guarnicao?: React.ReactNode;
  /** Textos fixos de Configurações › Informações, que aparecem na página de todo ritual. */
  informacoes?: Pick<Instituto, "info_rituais" | "info_contribuicao">;
  podeConfigurar?: boolean;
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

export function EventoForm({ evento, tipos, enderecos, equipe, podeNumerar, guarnicao, informacoes, podeConfigurar = false }: Props) {
  const [estado, acao, pendente] = useActionState(salvarEvento, undefined);
  const padrao = enderecos.find((e) => e.padrao) ?? enderecos[0];
  const [endSel, setEndSel] = useState<string>(
    evento?.endereco_livre ? "__livre" : (evento?.endereco_id ?? padrao?.$id ?? "__livre"),
  );
  const [tipoId, setTipoId] = useState(evento?.tipo_id ?? tipos[0]?.$id ?? "");
  const tipo = tipos.find((t) => t.$id === tipoId);
  const idRitual = formatarIdRitual(evento?.ritual_numero_geral ?? null, evento?.ritual_ano ?? null, evento?.ritual_numero_ano ?? null);
  const [destaque, setDestaque] = useState(evento?.destaque ?? false);
  const [banner, setBanner] = useState(evento?.mostrar_banner ?? true);
  const { local: capaLocal, erro: erroCapa, otimizando, escolher, limpar } = useImagem("capa");
  const [removerCapa, setRemoverCapa] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const capaSalva = evento?.capa_file_id && !removerCapa ? `/api/arquivo/${evento.capa_file_id}` : null;
  const capaPreview = capaLocal ?? capaSalva;

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
                <div className="flex items-center justify-between">
                  <span className="rotulo mb-0">Imagem de capa</span>
                  {capaPreview && (
                    <div className="flex gap-1">
                      <label className="btn-icone h-8 w-8 cursor-pointer" title="Trocar imagem">
                        <RefreshCw size={15} />
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
                          const principal = e.currentTarget.form?.elements.namedItem("capa") as HTMLInputElement;
                          escolherCapa(principal, e.target.files?.[0]);
                        }} />
                      </label>
                      {(capaLocal || evento?.capa_file_id) && (
                        <button
                          type="button"
                          className="btn-icone h-8 w-8 hover:bg-red-50 hover:text-red-700"
                          title="Remover imagem"
                          onClick={(e) => {
                            const principal = e.currentTarget.form?.elements.namedItem("capa") as HTMLInputElement;
                            limpar(principal);
                            if (evento?.capa_file_id) setRemoverCapa(true);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <label
                  className={`group relative flex min-h-44 flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
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
                      <span className="absolute inset-0 grid place-items-center rounded-xl bg-mata-950/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-mata-950/40 group-hover:opacity-100">
                        Clique ou arraste para trocar
                      </span>
                    </>
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-mata-600 shadow-sm ring-1 ring-stone-200 transition group-hover:scale-105"><ImagePlus size={20} /></span>
                      <span className="text-sm font-medium text-stone-700">Arraste uma imagem ou clique</span>
                      <span className="text-xs text-stone-500">PNG, JPG ou WEBP · ideal 16:9 · reduzida automaticamente</span>
                    </span>
                  )}
                  <input
                    type="file"
                    name="capa"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => escolherCapa(e.currentTarget, e.target.files?.[0])}
                  />
                </label>
                {otimizando && <p className="text-xs text-stone-500">Otimizando a imagem…</p>}
                {erroCapa && <p className="text-xs text-red-700">{erroCapa}</p>}
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
              <textarea id="descricao" name="descricao" rows={5} defaultValue={evento?.descricao ?? ""} className="campo" placeholder="Orientações de dieta, o que levar…" />
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

          {tipo?.conta_como_ritual && (
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
          )}

          <Bloco titulo="Mestres" sub="Quem conduz o ritual. Toque nos nomes para escolher." icone={Flame} destaque>
            <EscolhaEquipe funcao="mestre" equipe={equipe} inicial={evento?.mestres ?? []} />
          </Bloco>

          {tipo?.conta_como_ritual && (
            <Bloco titulo="Guarnição" icone={Shield} sub="Os guardiões se candidatam na página do evento, por ordem de chegada. Defina quantas vagas há para cada gênero.">
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
            </Bloco>
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
                  <Link href="/configuracoes?secao=informacoes" className="btn-icone h-8 w-8 shrink-0" title="Editar em Configurações">
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
            <Link href="/eventos" className="btn-secundario flex-1 sm:flex-none">Cancelar</Link>
            <button type="submit" className="btn-primario flex-1 sm:flex-none sm:px-6" disabled={pendente}>
              {pendente ? <><Carregando /> Salvando…</> : <><Check size={17} /> Salvar evento</>}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
