import Link from "next/link";
import { CalendarPlus, ChevronLeft, Clock, Crown, MapPin } from "lucide-react";
import { dataPorExtenso } from "@/lib/format";
import { urlImagem } from "@/lib/links";
import { Avatar } from "@/components/Avatar";
import type { Endereco, Evento, Pessoa } from "@/lib/types";

/** Capa, data, local e mestres: o topo da página de um ritual ou de uma reunião. */
export function Topo({ evento, end, mestres, agenda }: { evento: Evento; end: Endereco | undefined; mestres: Pessoa[]; /** Mostra o atalho para a agenda do celular. */ agenda: boolean }) {
  return (
    <>
      {/* Capa */}
      <div className="relative -mb-px h-64 overflow-hidden bg-stone-50">
        {evento.capa_file_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagem(evento.capa_file_id, 960)} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-stone-50 from-0% to-transparent to-50%" />
        <Link href="/guarnicao" aria-label="Voltar" className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-4 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/30 backdrop-blur-md active:scale-90">
          <ChevronLeft size={22} />
        </Link>
        {/* Guardião presente: levar para a agenda do celular (ícone, canto superior direito da capa) */}
        {agenda && (
          <a href={`/guarnicao/ritual/${evento.$id}/agenda`} aria-label="Adicionar à minha agenda" title="Adicionar à minha agenda" className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-4 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/30 backdrop-blur-md active:scale-90">
            <CalendarPlus size={19} />
          </a>
        )}
        {/* Sobe o título para ficar acima do card que flutua sobre a capa */}
        <div className="absolute inset-x-0 bottom-12 px-5 pt-5 pb-3 text-stone-950">
          <h1 className="text-xl leading-tight font-bold">{evento.titulo}</h1>
        </div>
      </div>

      {/* Quando e onde */}
      <section className="relative z-10 -mt-12 px-4">
        <div className="grid grid-cols-1 gap-3 rounded-3xl bg-white/60 p-5 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] ring-1 ring-white/70 backdrop-blur-xl backdrop-saturate-150">
          <p className="flex items-center gap-2.5 text-sm text-stone-700">
            <Clock size={17} className="shrink-0 text-emerald-700" />
            <span className="first-letter:uppercase">{dataPorExtenso(evento.data)}</span> · {evento.hora_inicio}
          </p>
          <p className="flex min-w-0 items-center gap-2.5 text-sm text-stone-700">
            <MapPin size={17} className="shrink-0 text-emerald-700" />
            <span className="min-w-0 flex-1 truncate">{end ? `${end.apelido} — ${end.endereco}` : evento.endereco_livre}</span>
          </p>
          {mestres.length > 0 && (
            <div className="border-t border-stone-200/70 pt-3">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
                <Crown size={14} className="text-emerald-700" /> {mestres.length > 1 ? "Mestres" : "Mestre"}
              </p>
              {/* Todos na mesma linha: foto em cima, nome embaixo */}
              <div className="mt-2.5 flex flex-nowrap gap-2 overflow-x-auto pb-0.5">
                {mestres.map((m) => (
                  <div key={m.$id} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                    <Avatar nome={m.nome} foto={m.foto} tamanho={44} className="ring-2 ring-ouro-300" />
                    <span className="w-full truncate text-xs font-medium text-stone-700">{m.nome.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
