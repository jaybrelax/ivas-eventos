import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, MapPin } from "lucide-react";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { dataPorExtenso, formatarIdRitual, hoje, partesData } from "@/lib/format";
import { inicioDe } from "@/lib/guarnicao";
import { srcsetImagem, urlImagem, urlPublicaEvento } from "@/lib/links";
import { inscricoesComEventos } from "@/lib/inscricoes";

/** Destaque do próximo ritual da agenda (o mais próximo que ainda não começou), com atalho para a página dele. */
export async function ProximoRitualCard({ usuarioId }: { usuarioId: string }) {
  const [{ tipos, enderecos }, futuros, minhas] = await Promise.all([
    getDadosInstituto(),
    listarEventos({ inicio: hoje() }),
    inscricoesComEventos(usuarioId),
  ]);
  const evento = futuros.find((e) => {
    const t = tipos.find((x) => x.$id === e.tipo_id);
    return !!t?.conta_como_ritual && inicioDe(e).getTime() > Date.now();
  });
  if (!evento) return null;

  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  const end = enderecos.find((e) => e.$id === evento.endereco_id);
  const local = end ? end.apelido : evento.endereco_livre;
  const d = partesData(evento.data);
  const capa = evento.capa_file_id;
  const minha = minhas.find((i) => i.eventoId === evento.$id && i.situacao !== "cancelada");
  const url = urlPublicaEvento(evento, tipo);

  return (
    <section aria-label="Próximo ritual" className="mb-6">
      <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-ouro-600 uppercase">Próximo ritual</p>
      <Link
        href={url}
        className="group flex overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-cartao transition hover:-translate-y-0.5 hover:shadow-elevado"
      >
        <div className="relative w-28 shrink-0 bg-mata-900 sm:w-44">
          {capa && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlImagem(capa, 320)} srcSet={srcsetImagem(capa, [320, 640])} sizes="(min-width: 640px) 176px, 112px" loading="lazy" decoding="async" alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          )}
          <div className="absolute top-2.5 left-2.5 rounded-xl bg-white/85 px-2.5 py-1 text-center shadow-sm backdrop-blur-md">
            <span className="block text-xl leading-none font-bold text-stone-900 tabular-nums">{d.dia}</span>
            <span className="block text-[10px] font-semibold tracking-wider text-stone-600 uppercase">{d.mesCurto}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-4 sm:p-5">
          <h2 className="truncate font-display text-lg font-bold text-stone-900 sm:text-xl">
            {evento.ritual_numero_geral ? `${formatarIdRitual(evento.ritual_numero_geral, null, null)} — ` : ""}{evento.titulo}
          </h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-stone-600">
            <span className="first-letter:uppercase">{dataPorExtenso(evento.data)}</span>
            <span className="inline-flex items-center gap-1"><Clock size={13} className="text-mata-600" /> {evento.hora_inicio}</span>
            {local && <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-mata-600" /> {local}</span>}
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            {minha ? <><CalendarCheck size={15} /> Você já está inscrito(a) · ver ritual</> : <>Ver ritual e participar <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></>}
          </span>
        </div>
      </Link>
    </section>
  );
}
