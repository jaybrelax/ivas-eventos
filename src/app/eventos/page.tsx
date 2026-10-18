import { TipografiaPublica } from "@/components/publico/TipografiaPublica";
import { urlPublicaEvento } from "@/lib/links";
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
  Sparkles,
  Star,
} from "lucide-react";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { dataCurta, hoje, partesData } from "@/lib/format";
import { BadgeDestaque, BadgeRitual, BadgeTipo } from "@/components/Titulo";
import { CabecalhoPublico } from "@/components/publico/CabecalhoPublico";
import { RodapePublico } from "@/components/publico/RodapePublico";

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
  searchParams: Promise<{ tipo?: string }>;
};

export default async function AgendaPublica({ searchParams }: Props) {
  const sp = await searchParams;
  const tipoFiltro = sp.tipo;

  const [{ tipos, enderecos, telefones, redes, instituto }, eventosFuturos] = await Promise.all([
    getDadosInstituto(),
    listarEventos({ inicio: hoje() }),
  ]);

  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(enderecos.map((e) => [e.$id, e]));

  const eventosFiltrados = tipoFiltro
    ? eventosFuturos.filter((e) => e.tipo_id === tipoFiltro)
    : eventosFuturos;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 selection:bg-ouro-200 selection:text-mata-950">
      <TipografiaPublica instituto={instituto} />
      <CabecalhoPublico instituto={instituto} />

      {/* Hero da Agenda */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mata-950 via-mata-900 to-stone-900 py-12 text-white sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-0 h-80 w-full -translate-x-1/2 rounded-full bg-gradient-to-tr from-ouro-500/20 via-mata-500/25 to-purple-600/10 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ouro-400/30 bg-ouro-400/10 px-3.5 py-1 text-xs font-semibold text-ouro-300">
            <Sparkles size={13} />
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
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                !tipoFiltro
                  ? "bg-gradient-to-r from-ouro-400 to-ouro-600 text-mata-950 shadow-md"
                  : "border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10"
              }`}
            >
              Todos os Encontros ({eventosFuturos.length})
            </Link>

            {tipos.map((t) => {
              const cont = eventosFuturos.filter((e) => e.tipo_id === t.$id).length;
              if (cont === 0) return null;
              const ativo = tipoFiltro === t.$id;

              return (
                <Link
                  key={t.$id}
                  href={`/eventos?tipo=${t.$id}`}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    ativo
                      ? "bg-white text-stone-900 shadow-md"
                      : "border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10"
                  }`}
                >
                  {t.nome} ({cont})
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
            {eventosFiltrados.map((e) => {
              const tipo = tipoPorId.get(e.tipo_id);
              const end = endPorId.get(e.endereco_id ?? "");
              const d = partesData(e.data);

              return (
                <Link
                  key={e.$id}
                  href={urlPublicaEvento(e, tipo)}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-cartao transition-all duration-300 hover:-translate-y-1.5 hover:border-ouro-300 hover:shadow-elevado"
                >
                  {/* Capa com proporção destacada */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-mata-950">
                    {e.capa_file_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/arquivo/${e.capa_file_id}`}
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

                    {/* Badges sobre a capa */}
                    <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5">
                      {tipo && <BadgeTipo nome={tipo.nome} cor={tipo.cor} icone={tipo.icone} />}
                    </div>

                    {e.destaque && (
                      <div className="absolute top-3.5 right-3.5">
                        <BadgeDestaque />
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex flex-1 flex-col justify-between p-6">
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
                      {e.descricao && (
                        <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-stone-600">
                          {e.descricao.replace(/\r?\n+/g, " ")}
                        </p>
                      )}
                    </div>

                    {/* Rodapé do Card com Local e Botão */}
                    <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-stone-500 truncate max-w-[55%]">
                        <MapPin size={13} className="shrink-0 text-stone-400" />
                        <span className="truncate">{end ? end.apelido : e.endereco_livre || "Londrina - PR"}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 font-bold text-ouro-700 transition group-hover:translate-x-0.5">
                        Ver Encontro <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
