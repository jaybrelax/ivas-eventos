import { srcsetImagem, urlImagem } from "@/lib/links";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import type { Endereco, Evento, TipoEvento } from "@/lib/types";
import { dataCurta, partesData } from "@/lib/format";
import { urlPublicaEvento } from "@/lib/links";
import { IconeTipo } from "@/components/IconeTipo";

export function OutrosEventos({
  eventos,
  tipos,
  enderecos,
}: {
  eventos: Evento[];
  tipos: TipoEvento[];
  enderecos: Endereco[];
}) {
  if (!eventos.length) return null;

  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(enderecos.map((e) => [e.$id, e]));

  return (
    <section className="mt-16 border-t border-stone-200/80 pt-12 sm:mt-24 sm:pt-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-ouro-600 uppercase">Programação IVAS</span>
          <h2 className="titulo-card text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Próximos Rituais & Encontros
          </h2>
        </div>
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-mata-700 transition hover:text-ouro-600"
        >
          <span>Ver agenda completa</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {eventos.map((e) => {
          const tipo = tipoPorId.get(e.tipo_id);
          const end = endPorId.get(e.endereco_id ?? "");
          const d = partesData(e.data);
          const cor = tipo?.cor ?? "#6a449c";

          return (
            <Link
              key={e.$id}
              href={urlPublicaEvento(e, tipo)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-cartao transition-all duration-300 hover:-translate-y-1 hover:border-ouro-300 hover:shadow-elevado"
            >
              {/* Capa ou Placeholder elegante */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-mata-950">
                {e.capa_file_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlImagem(e.capa_file_id, 640)}
                    srcSet={srcsetImagem(e.capa_file_id)}
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                    width={640}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    alt={e.titulo}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mata-900 via-mata-800 to-mata-950 p-6 text-center">
                    <span className="font-display text-lg font-bold text-ouro-200/80">
                      {e.titulo}
                    </span>
                  </div>
                )}
                {tipo && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/30 ring-inset backdrop-blur-md">
                    <IconeTipo nome={tipo.icone} size={12} strokeWidth={2.4} />
                    {tipo.nome}
                  </span>
                )}
              </div>

              {/* Informações */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-stone-500">
                    <span className="inline-flex items-center gap-1 text-mata-700 font-semibold">
                      <Calendar size={13} />
                      <span className="first-letter:uppercase">{d.diaSemana.slice(0, 3)}, {d.dia} de {d.mesCurto.toLowerCase()}</span>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} />
                      {e.hora_inicio}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 titulo-card text-base font-bold text-stone-900 transition group-hover:text-mata-700">
                    {e.titulo}
                  </h3>

                  {e.descricao && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-600">
                      {e.descricao.replace(/\r?\n+/g, " ")}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin size={12} className="shrink-0 text-stone-400" />
                    <span className="truncate">{end ? end.apelido : e.endereco_livre || "Londrina - PR"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-ouro-700 transition group-hover:translate-x-0.5">
                    Detalhes <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
