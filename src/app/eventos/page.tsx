import { TipografiaPublica } from "@/components/publico/TipografiaPublica";
import { srcsetImagem, urlImagem, urlPublicaEvento } from "@/lib/links";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Clock,
  Compass,
  Flame,
  MapPin,
  Star,
} from "lucide-react";
import { descricaoComTags, getDadosInstituto, listarEventos } from "@/lib/data";
import { dataCurta, hoje, partesData } from "@/lib/format";
import { IconeTipo } from "@/components/IconeTipo";
import { CabecalhoPublico } from "@/components/publico/CabecalhoPublico";
import { RodapePublico } from "@/components/publico/RodapePublico";
import { Paginacao } from "@/components/publico/Paginacao";

// Filtros do topo: pílulas de vidro; a ativa fica branca e o número vira um selo
const FILTRO = "inline-flex h-10 items-center gap-2 rounded-full pr-1.5 pl-4 text-[13px] font-semibold transition duration-200 active:scale-[0.97]";
const FILTRO_ATIVO = "bg-white text-mata-900 shadow-[0_10px_28px_-10px_rgb(255_255_255/0.6)]";
const FILTRO_INATIVO = "bg-white/[0.07] text-white/85 ring-1 ring-white/15 ring-inset backdrop-blur-md hover:bg-white/[0.14] hover:text-white hover:ring-white/30";
const CONTADOR = "grid h-7 min-w-7 place-items-center rounded-full px-2 text-[11px] font-bold tabular-nums";
const CONTADOR_ATIVO = "bg-mata-700 text-white";
const CONTADOR_INATIVO = "bg-white/10 text-white/80";

/** Quantos eventos aparecem por página na agenda. */
const POR_PAGINA = 12;

export async function generateMetadata(): Promise<Metadata> {
  const { instituto } = await getDadosInstituto();
  const titulo = "Agenda de Rituais e Encontros — Instituto IVAS";
  const desc = "Programação de rituais, encontros espirituais e cerimônias do Instituto das Virtudes da Ayahuasca e do Sol.";
  const imagem = instituto.logo_file_id ? `/api/og/${instituto.logo_file_id}?logo=1` : null;
  return {
    title: titulo,
    description: desc,
    alternates: { canonical: "/eventos" },
    openGraph: {
      title: titulo,
      description: desc,
      url: "/eventos",
      siteName: instituto.nome,
      locale: "pt_BR",
      type: "website",
      ...(imagem ? { images: [{ url: imagem, width: 1200, height: 630, type: "image/jpeg", alt: instituto.nome }] } : {}),
    },
    twitter: { card: imagem ? "summary_large_image" : "summary", title: titulo, description: desc, ...(imagem ? { images: [imagem] } : {}) },
  };
}

type Props = {
  searchParams: Promise<{ tipo?: string; pagina?: string }>;
};

export default async function AgendaPublica({ searchParams }: Props) {
  const sp = await searchParams;
  const tipoFiltro = sp.tipo;

  const [{ tipos, tags, enderecos, telefones, redes, instituto }, eventosFuturos] = await Promise.all([
    getDadosInstituto(),
    listarEventos({ inicio: hoje() }),
  ]);

  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(enderecos.map((e) => [e.$id, e]));

  const eventosFiltrados = tipoFiltro
    ? eventosFuturos.filter((e) => e.tipo_id === tipoFiltro)
    : eventosFuturos;

  // Paginação: 12 por página; página fora do intervalo cai na mais próxima
  const totalPaginas = Math.max(1, Math.ceil(eventosFiltrados.length / POR_PAGINA));
  const pagina = Math.min(totalPaginas, Math.max(1, Math.trunc(Number(sp.pagina)) || 1));
  const eventosDaPagina = eventosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hrefPagina = (n: number) => {
    const q = new URLSearchParams();
    if (tipoFiltro) q.set("tipo", tipoFiltro);
    if (n > 1) q.set("pagina", String(n));
    const texto = q.toString();
    return texto ? `/eventos?${texto}` : "/eventos";
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 selection:bg-ouro-200 selection:text-mata-950">
      <TipografiaPublica instituto={instituto} />
      <CabecalhoPublico instituto={instituto} mostrarAgenda={false} />

      {/* Hero da Agenda */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mata-950 via-mata-900 to-stone-900 py-12 text-white sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-0 h-80 w-full -translate-x-1/2 rounded-full bg-gradient-to-tr from-ouro-500/20 via-mata-500/25 to-purple-600/10 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ouro-400/30 bg-ouro-400/10 px-3.5 py-1 text-xs font-semibold text-ouro-300">
            <Clock size={13} />
            Programação Oficial
          </span>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Rituais & Encontros Sagrados
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-stone-300 sm:text-base">
            Participe de nossos encontros de consagração da Ayahuasca, autoconhecimento e conexão com a espiritualidade divina no {instituto.nome_curto || "Instituto IVAS"}.
          </p>

          {/* Filtros por Tipo de Encontro */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/eventos"
              className={`${FILTRO} ${!tipoFiltro ? FILTRO_ATIVO : FILTRO_INATIVO}`}
            >
              <CalendarDays size={14} className="shrink-0" />
              Todos os encontros
              <span className={`${CONTADOR} ${!tipoFiltro ? CONTADOR_ATIVO : CONTADOR_INATIVO}`}>{eventosFuturos.length}</span>
            </Link>

            {tipos.map((t) => {
              const cont = eventosFuturos.filter((e) => e.tipo_id === t.$id).length;
              if (cont === 0) return null;
              const ativo = tipoFiltro === t.$id;

              return (
                <Link
                  key={t.$id}
                  href={`/eventos?tipo=${t.$id}`}
                  className={`${FILTRO} ${ativo ? FILTRO_ATIVO : FILTRO_INATIVO}`}
                >
                  <IconeTipo nome={t.icone} size={14} className="shrink-0" />
                  {t.nome}
                  <span className={`${CONTADOR} ${ativo ? CONTADOR_ATIVO : CONTADOR_INATIVO}`}>{cont}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid de Eventos */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {eventosFiltrados.length === 0 ? (
          <div className="cartao py-16 text-center">
            <p className="font-display text-xl font-bold text-stone-900">Nenhum encontro agendado no momento</p>
            <p className="mt-2 text-sm text-stone-500">
              Novas datas de rituais e encontros são publicadas periodicamente. Acompanhe também nosso WhatsApp e redes sociais!
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {eventosDaPagina.map((e, i) => {
              const tipo = tipoPorId.get(e.tipo_id);
              const end = endPorId.get(e.endereco_id ?? "");
              const d = partesData(e.data);
              const descricao = descricaoComTags(e.descricao, e.tags, tags);

              return (
                <Link
                  key={e.$id}
                  href={urlPublicaEvento(e, tipo)}
                  className={`group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-cartao ${e.destaque ? "border-ouro-300/70" : "border-stone-200/90"} transition-all duration-300 hover:-translate-y-1.5 hover:border-ouro-300 hover:shadow-elevado`}
                >
                  {/* Capa com proporção destacada */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-mata-950">
                    {e.capa_file_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlImagem(e.capa_file_id, 640)}
                        srcSet={srcsetImagem(e.capa_file_id)}
                        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                        width={640}
                        height={400}
                        loading={i < 3 ? "eager" : "lazy"}
                        decoding="async"
                        alt={e.titulo}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mata-900 via-mata-800 to-mata-950 p-6 text-center">
                        <span className="font-display text-xl font-bold text-ouro-200/90">
                          {e.titulo}
                        </span>
                      </div>
                    )}

                    {/* Sombra suave embaixo para o tipo do evento ficar legível sobre qualquer capa */}
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                    {/* Data em vidro fosco, sem contorno: dia, mês (3 letras) e ano, no canto superior esquerdo */}
                    <time
                      dateTime={e.data}
                      className="absolute top-3.5 left-3.5 flex min-w-[3.4rem] flex-col items-center overflow-hidden rounded-[0.4rem] rounded-tl-[1.15rem] bg-gradient-to-b from-white/30 via-white/15 to-black/20 px-3 py-2 text-center text-white shadow-[0_12px_32px_-8px_rgb(0_0_0/0.5)] backdrop-blur-sm backdrop-saturate-[1.8]"
                    >
                      {/* Reflexo de luz suave no topo */}
                      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                      <span className="relative font-sans text-[1.85rem] leading-[0.95] font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgb(0_0_0/0.55)]">{d.dia}</span>
                      <span className="relative mt-0.5 text-[0.7rem] leading-none font-bold tracking-[0.24em] [text-shadow:0_1px_6px_rgb(0_0_0/0.55)]">{d.mesCurto}</span>
                      <span className="relative mt-0.5 text-[0.6rem] leading-none font-medium tracking-[0.16em] text-white/75 tabular-nums [text-shadow:0_1px_4px_rgb(0_0_0/0.5)]">{d.ano}</span>
                    </time>

                    {/* Tipo do evento, no canto inferior esquerdo */}
                    {tipo && (
                      <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/35 ring-inset backdrop-blur-md backdrop-saturate-150 [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">
                        <IconeTipo nome={tipo.icone} size={13} strokeWidth={2.4} className="drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]" />
                        {tipo.nome}
                        {tipo.conta_como_ritual && e.ritual_numero_geral ? ` N° ${e.ritual_numero_geral}` : ""}
                      </span>
                    )}

                    {/* Destaque: marcador de página pendurado no topo da capa */}
                    {e.destaque && (
                      <span
                        title="Evento em destaque"
                        className="absolute top-0 right-5 flex h-[3.4rem] w-9 items-start justify-center bg-gradient-to-b from-ouro-300 via-ouro-400 to-ouro-600 pt-2.5 text-mata-950 shadow-[0_6px_14px_-4px_rgb(0_0_0/0.55)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]"
                      >
                        <Star size={15} className="fill-mata-950" aria-label="Destaque" />
                      </span>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className={`flex flex-1 flex-col justify-between p-6 ${e.destaque ? "bg-gradient-to-b from-ouro-50/90 via-white to-white" : ""}`}>
                    <div>
                      {/* Data e Hora */}
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-mata-700">
                        <Calendar size={14} />
                        <span className="capitalize">{d.diaSemana}, {d.dia} de {d.mesNome}</span>
                        <span>•</span>
                        <Clock size={14} />
                        <span>{e.hora_inicio}</span>
                      </div>

                      {/* Título */}
                      <h3 className="line-clamp-2 font-display text-lg font-bold text-stone-900 transition group-hover:text-mata-700 sm:text-xl">
                        {e.titulo}
                      </h3>

                      {/* Descrição resumida */}
                      {descricao && (
                        <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-stone-600">
                          {descricao.replace(/\r?\n+/g, " ")}
                        </p>
                      )}
                    </div>

                    {/* Rodapé do Card com Local e Botão */}
                    <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-stone-500 min-w-0 truncate">
                        <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden className="shrink-0 text-[#ee4b2b]">
                          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill="currentColor" />
                          <circle cx="12" cy="10" r="3" fill="#fff" />
                        </svg>
                        <span className="truncate">{end ? end.apelido : e.endereco_livre || "Londrina - PR"}</span>
                      </span>

                      {/* Botão sutil: contorno fino que ganha cor quando o cartão recebe o mouse */}
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-1.5 font-semibold text-stone-700 transition group-hover:border-ouro-300 group-hover:bg-ouro-50 group-hover:text-ouro-800">
                        Mais informações <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Paginacao atual={pagina} total={totalPaginas} href={hrefPagina} />
      </main>

      <RodapePublico
        instituto={instituto}
        enderecos={enderecos}
        telefones={telefones}
        redes={redes}
      />
    </div>
  );
}
