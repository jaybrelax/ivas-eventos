import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Flame, Info, MapPin, Navigation, Star } from "lucide-react";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { urlPublicaEvento } from "@/lib/links";
import { listarEquipe } from "@/lib/usuarios";
import { dataPorExtenso, hoje, partesData } from "@/lib/format";
import type { Evento, Pessoa } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { IconeTipo } from "@/components/IconeTipo";
import { MarcaInstituto } from "@/components/Marca";
import { CabecalhoPublico } from "@/components/publico/CabecalhoPublico";
import { TipografiaPublica } from "@/components/publico/TipografiaPublica";
import { RodapePublico } from "@/components/publico/RodapePublico";
import { BotaoParticipar } from "@/components/publico/BotaoParticipar";
import { BarraParticipar } from "@/components/publico/BarraParticipar";
import { BotoesCompartilhar } from "@/components/publico/BotoesCompartilhar";
import { CardContribuicaoPix } from "@/components/publico/CardContribuicaoPix";
import { OutrosEventos } from "@/components/publico/OutrosEventos";

/** Corta no limite sem partir palavra; só põe "…" quando o texto foi cortado. */
function resumo(texto: string, max = 160) {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** Título, descrição, imagem (JPEG) e endereço para compartilhar no WhatsApp e redes. */
export async function metadadosEvento(evento: Evento | null): Promise<Metadata> {
  if (!evento) return { title: "Evento não encontrado — Instituto IVAS" };
  const { tipos, instituto } = await getDadosInstituto();
  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  const site = instituto.nome || "Instituto IVAS";

  const d = partesData(evento.data);
  const semana = d.diaSemana.charAt(0).toUpperCase() + d.diaSemana.slice(1);
  const quando = `${semana}, ${d.dia} de ${d.mesNome} de ${d.ano} às ${evento.hora_inicio}`;
  const texto = evento.descricao?.trim() || tipo?.descricao?.trim();
  const desc = texto ? resumo(`${quando} · ${texto}`) : `${quando} · ${tipo?.nome ?? "Encontro"} no ${site}.`;

  const titulo = `${evento.titulo} — ${instituto.nome_curto || "IVAS"}`;
  const imagem = evento.capa_file_id
    ? { url: `/api/og/${evento.capa_file_id}`, alt: evento.titulo }
    : instituto.logo_file_id
      ? { url: `/api/og/${instituto.logo_file_id}?logo=1`, width: 1200, height: 630, alt: site }
      : null;
  const url = urlPublicaEvento(evento, tipo);

  return {
    title: titulo,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: titulo,
      description: desc,
      url,
      siteName: site,
      locale: "pt_BR",
      type: "website",
      ...(imagem ? { images: [{ ...imagem, type: "image/jpeg" }] } : {}),
    },
    twitter: { card: imagem ? "summary_large_image" : "summary", title: titulo, description: desc, ...(imagem ? { images: [imagem.url] } : {}) },
  };
}

/** Quantos dias faltam, para o selo do topo. Eventos passados não oferecem "Participar". */
function situacao(dataEvento: string, dataHoje: string) {
  const diff = Math.round((Date.parse(`${dataEvento}T12:00:00Z`) - Date.parse(`${dataHoje}T12:00:00Z`)) / 86_400_000);
  if (diff === 0) return { texto: "Acontece hoje", cor: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30", ponto: "bg-emerald-400", passou: false };
  if (diff === 1) return { texto: "É amanhã", cor: "bg-ouro-400/15 text-ouro-200 ring-ouro-300/30", ponto: "bg-ouro-400", passou: false };
  if (diff > 1) return { texto: `Faltam ${diff} dias`, cor: "bg-white/10 text-white/80 ring-white/15", ponto: "bg-white/60", passou: false };
  return { texto: "Já realizado", cor: "bg-white/5 text-white/50 ring-white/10", ponto: "bg-white/30", passou: true };
}

/** Título de seção do conteúdo: sobrelinha dourada + título. */
function TituloSecao({ sobre, titulo, icone: Icone }: { sobre: string; titulo: string; icone: typeof Flame }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mata-50 text-mata-600 ring-1 ring-mata-100">
        <Icone size={19} />
      </span>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-ouro-600 uppercase">{sobre}</p>
        <h2 className="titulo-card text-xl sm:text-[22px]">{titulo}</h2>
      </div>
    </div>
  );
}

/** Página pública de um evento. Usada por /ritual/[numero] e /evento/[id]. */
export async function PaginaEvento({ evento }: { evento: Evento }) {
  const [{ tipos, enderecos, telefones, redes, pix, instituto }, equipe] = await Promise.all([getDadosInstituto(), listarEquipe()]);

  const hj = hoje();
  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  const end = enderecos.find((e) => e.$id === evento.endereco_id);
  const sit = situacao(evento.data, hj);
  const ritual = !!tipo?.conta_como_ritual;

  const mestres = (evento.mestres ?? []).map((mId) => equipe.find((p) => p.$id === mId)).filter(Boolean) as Pessoa[];

  // Outros eventos futuros para recomendação
  const todosFuturos = await listarEventos({ inicio: hj });
  const outrosEventos = todosFuturos.filter((e) => e.$id !== evento.$id).slice(0, 3);

  const d = partesData(evento.data);
  const dataExtenso = dataPorExtenso(evento.data);
  const telWhatsapp = telefones.find((t) => t.whatsapp && t.padrao) ?? telefones.find((t) => t.whatsapp);
  const capa = evento.capa_file_id ? `/api/arquivo/${evento.capa_file_id}` : null;
  const local = end ? end.apelido : evento.endereco_livre || "Londrina - PR";
  const endereco = end ? [end.endereco, end.cidade].filter(Boolean).join(" — ") : null;
  const participar = {
    ehRitual: ritual,
    chavePix: ritual ? (pix.find((c) => c.padrao) ?? pix[0] ?? null) : null,
    tituloEvento: evento.titulo,
    dataEvento: dataExtenso,
    horaEvento: evento.hora_inicio,
    localEvento: end ? `${end.apelido} — ${end.endereco}` : evento.endereco_livre,
    telefoneWhatsapp: telWhatsapp?.numero,
  };
  const temContribuicao = ritual && !!instituto.info_contribuicao?.trim();

  return (
    <div className="min-h-screen bg-fundo text-stone-900 selection:bg-ouro-200 selection:text-mata-950">
      <TipografiaPublica instituto={instituto} />
      <CabecalhoPublico instituto={instituto} />

      {/* ───────── Hero: capa + título + dados essenciais ───────── */}
      <section
        className={`relative isolate overflow-hidden text-white ${evento.cor_capa ? "" : "bg-gradient-to-br from-mata-900 via-mata-950 to-[#120a1c]"}`}
        // Degradê da cor predominante da capa (calculada ao salvar) até o preto
        style={evento.cor_capa ? { background: `linear-gradient(135deg, ${evento.cor_capa} 0%, color-mix(in oklab, ${evento.cor_capa} 45%, #000) 55%, #050307 100%)` } : undefined}
      >
        {/* Fundo: a própria capa desfocada sobre o degradê (a 15% ela sumia no roxo escuro) */}
        {capa && (
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capa} alt="" className="h-full w-full scale-105 object-cover opacity-30 blur-md" />
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[34rem] w-[34rem] rounded-full bg-ouro-500/10 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-12 sm:pb-16 lg:px-8 lg:pt-16 lg:pb-20">
          <div className="grid items-center gap-7 sm:gap-10 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-14">
            {/* Capa */}
            <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
              <div aria-hidden className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-ouro-400/25 via-transparent to-mata-400/20 blur-2xl" />
              <div className="aspect-square overflow-hidden rounded-[1.75rem] bg-mata-900 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
                {capa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capa} alt={evento.titulo} className="h-full w-full object-cover" />
                ) : (
                  <div className="relative flex h-full w-full flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_50%_35%,var(--color-mata-700),var(--color-mata-950)_70%)] p-8 text-center">
                    <div aria-hidden className="absolute inset-6 rounded-[1.25rem] border border-ouro-300/20" />
                    <MarcaInstituto instituto={instituto} altura={72} />
                    <p className="font-display text-lg leading-snug text-balance text-ouro-200/90">{evento.titulo}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Título e dados */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {tipo && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15 ring-inset backdrop-blur">
                    <span style={{ color: tipo.cor }} className="brightness-150"><IconeTipo nome={tipo.icone} size={13} strokeWidth={2.4} /></span>
                    {tipo.nome}
                  </span>
                )}
                {evento.destaque && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ouro-400/15 px-3 py-1 text-xs font-semibold text-ouro-200 ring-1 ring-ouro-300/30 ring-inset">
                    <Star size={12} className="fill-ouro-300 text-ouro-300" /> Destaque
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${sit.cor}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sit.ponto}`} />
                  {sit.texto}
                </span>
              </div>

              <h1 className="mt-4 font-display text-[32px] leading-[1.08] font-bold tracking-tight text-balance text-white sm:mt-5 sm:text-5xl lg:text-[3.4rem]">
                {evento.titulo}
              </h1>
              {evento.ritual_numero_geral && (
                <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-normal tracking-wide text-ouro-200/90 sm:text-base">
                  <span>Ritual N° {evento.ritual_numero_geral} do {instituto.nome_curto || "IVAS"}</span>
                  {evento.ritual_numero_ano && evento.ritual_ano && (
                    <>
                      <span aria-hidden className="h-1 w-1 rounded-full bg-ouro-300/70" />
                      <span>N° {evento.ritual_numero_ano} de {evento.ritual_ano}</span>
                    </>
                  )}
                </p>
              )}

              {/* Dados essenciais em uma faixa */}
              <dl className="mt-6 grid overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/12 backdrop-blur-md grid-cols-[2fr_3fr] sm:mt-8 sm:grid-cols-[1.45fr_0.8fr_1fr]">
                {[
                  { Icone: CalendarDays, rotulo: "Data", valor: dataExtenso },
                  { Icone: Clock, rotulo: "Início", valor: `${evento.hora_inicio.replace(":", "h")}` },
                  { Icone: MapPin, rotulo: "Local", valor: local },
                ].map(({ Icone, rotulo, valor }, i) => (
                  <div
                    key={rotulo}
                    className={`flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4 ${
                      // celular: data na linha toda, início e local lado a lado
                      ["col-span-2 border-b border-white/10 sm:col-span-1 sm:border-b-0", "border-r border-white/10 sm:border-x", ""][i]
                    }`}
                  >
                    <Icone size={18} className="shrink-0 text-ouro-300" />
                    <div className="min-w-0">
                      <dt className="text-[11px] font-medium tracking-wider text-white/50 uppercase">{rotulo}</dt>
                      <dd className="text-[15px] leading-snug font-semibold text-white first-letter:uppercase">{valor}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
                {sit.passou ? (
                  <Link href="#proximos" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15">
                    Ver próximos encontros <ArrowRight size={16} />
                  </Link>
                ) : (
                  // no celular o botão fica só na barra fixa, que surge depois de rolar
                  <div className="hidden sm:block"><BotaoParticipar {...participar} variante="hero" /></div>
                )}
                <BotoesCompartilhar titulo={evento.titulo} data={dataExtenso} hora={evento.hora_inicio} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Conteúdo + coluna lateral ───────── */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-12">
          <div className="min-w-0 space-y-8 sm:space-y-10">
            <article className="cartao p-6 sm:p-9">
              <TituloSecao sobre="O encontro" titulo="Sobre este encontro" icone={Flame} />
              {/* Tipos que não são ritual (ex.: comemorativo) mostram aqui o texto definido no próprio tipo */}
              {!ritual && tipo?.descricao?.trim() && (
                <div className="mb-5 max-w-[68ch] text-[16px] leading-[1.8] whitespace-pre-line text-stone-700 sm:text-[17px]">{tipo.descricao}</div>
              )}
              {evento.descricao ? (
                <div className="max-w-[68ch] text-[16px] leading-[1.8] whitespace-pre-line text-stone-700 sm:text-[17px]">{evento.descricao}</div>
              ) : (
                (ritual || !tipo?.descricao?.trim()) && (
                  <p className="text-[15px] text-stone-500 italic">Informações e temática específica serão compartilhadas pela coordenação do Instituto.</p>
                )
              )}
            </article>

            {ritual && instituto.info_rituais?.trim() && (
              <section className="cartao relative overflow-hidden p-6 sm:p-9">
                <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-mata-400 via-mata-600 to-ouro-500" />
                <TituloSecao sobre="Antes de vir" titulo="Orientações aos participantes" icone={Info} />
                <div className="max-w-[68ch] text-[15px] leading-[1.85] whitespace-pre-line text-stone-700 sm:text-base">{instituto.info_rituais}</div>
              </section>
            )}

            {temContribuicao && <CardContribuicaoPix infoContribuicao={instituto.info_contribuicao} />}
          </div>

          {/* Coluna lateral curta: fixa no desktop enquanto se lê; no celular vem antes do conteúdo */}
          <aside className="order-first space-y-5 lg:sticky lg:top-28 lg:order-none">
            <section className="cartao overflow-hidden p-0 sm:p-0">
              {/* no celular a data já está no topo; aqui fica só o endereço */}
              <div className="hidden items-center gap-4 border-b border-stone-100 p-5 sm:flex">
                <div className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl bg-white text-center shadow-sm ring-1 ring-stone-200">
                  <span className="w-full bg-mata-700 py-1 text-[10px] font-bold tracking-widest text-white uppercase">{d.mesCurto}</span>
                  <span className="pt-1 text-[26px] leading-none font-bold text-stone-900 tabular-nums">{d.dia}</span>
                  <span className="pb-1.5 text-[10px] font-medium text-stone-500 capitalize">{d.diaSemana.slice(0, 3)}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 first-letter:uppercase">{dataExtenso}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-600">
                    <Clock size={14} className="text-mata-600" /> Início às {evento.hora_inicio}
                  </p>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-ouro-600 uppercase">
                    <MapPin size={15} className="shrink-0 text-mata-600" /> Localização
                  </p>
                  <p className="mt-2 font-semibold text-stone-900">{local}</p>
                  {endereco && <p className="text-sm leading-snug text-stone-600">{endereco}</p>}
                </div>
                {end?.link_maps && (
                  <a
                    href={end.link_maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-100 text-sm font-semibold text-stone-800 transition hover:bg-stone-200/80"
                  >
                    <Navigation size={15} className="text-mata-600" /> Como chegar
                  </a>
                )}
              </div>
              {mestres.length > 0 && (
                <div className="border-t border-stone-100 p-5">
                  <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-ouro-600 uppercase">Dirigentes do Ritual</p>
                  <ul className="space-y-2.5">
                    {mestres.map((m) => (
                      <li key={m.$id} className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-ouro-50 to-white p-2.5 pr-3 ring-1 ring-ouro-200/60">
                        <Avatar nome={m.nome} foto={m.foto} perfil="admin" tamanho={42} className="shadow-sm ring-2 ring-white" />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-stone-900">{m.nome}</p>
                          <p className="flex items-center gap-1 text-xs font-medium text-ouro-700">
                            {m.sexo && <IconeGenero genero={m.sexo} size={12} />}
                            {m.sexo === "feminino" ? "Mestra" : "Mestre"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!sit.passou && (
                <div className="hidden border-t border-stone-100 p-5 lg:block">
                  <BotaoParticipar {...participar} variante="sidebar" />
                </div>
              )}
            </section>
          </aside>
        </div>

        <div id="proximos" className="scroll-mt-24">
          <OutrosEventos eventos={outrosEventos} tipos={tipos} enderecos={enderecos} />
        </div>
      </main>

      {/* Barra fixa no celular: aparece depois de rolar a página */}
      {!sit.passou && (
        <BarraParticipar
          titulo={evento.titulo}
          quando={`${d.diaSemana.slice(0, 3)}, ${d.dia} ${d.mesCurto.toLowerCase()} · ${evento.hora_inicio}`}
          participar={{ ...participar, localEvento: local }}
        />
      )}

      <RodapePublico instituto={instituto} enderecos={enderecos} telefones={telefones} redes={redes} />
      {/* espaço para a barra fixa do celular não cobrir o fim do rodapé */}
      {!sit.passou && <div className="h-20 bg-mata-950 sm:hidden" />}
    </div>
  );
}
