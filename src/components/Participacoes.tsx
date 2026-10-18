import Link from "next/link";
import { CalendarCheck, Shield } from "lucide-react";
import { partesData } from "@/lib/format";
import type { ItemParticipacao } from "@/lib/types";

/** Histórico de participações do guardião na guarnição (mais recentes primeiro). */
export function Participacoes({ itens, vazio = "Ainda não participou de nenhum evento." }: { itens: ItemParticipacao[]; vazio?: string }) {
  const servidos = itens.filter((i) => i.passado && i.situacao === "confirmada").length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-stone-700">
          <Shield size={14} className="text-stone-400" aria-hidden /> Participações na guarnição
        </p>
        <span className="chip bg-mata-50 text-mata-700 tabular-nums">{servidos} servido{servidos === 1 ? "" : "s"}</span>
      </div>
      {itens.length ? (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200/80">
          {itens.map((i) => {
            const d = partesData(i.data);
            return (
              <li key={i.eventoId}>
                <Link href={`/admin/eventos/${i.eventoId}`} className="flex items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-stone-50">
                  <span className="w-12 shrink-0 text-center text-xs font-semibold text-stone-500 tabular-nums">
                    {String(d.dia).padStart(2, "0")}/{String(d.mes).padStart(2, "0")}
                    <span className="block text-[10px] font-normal text-stone-400">{d.ano}</span>
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-stone-800">{i.titulo}</span>
                  <Situacao i={i} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-3 text-sm text-stone-500">
          <CalendarCheck size={15} className="text-stone-400" /> {vazio}
        </p>
      )}
    </div>
  );
}

function Situacao({ i }: { i: ItemParticipacao }) {
  if (i.situacao === "espera") return <span className="chip shrink-0 bg-amber-50 text-amber-700">Lista de espera</span>;
  if (i.passado) return <span className="chip shrink-0 bg-stone-100 text-stone-600">Participou</span>;
  return <span className="chip shrink-0 bg-emerald-50 text-emerald-700">Confirmado</span>;
}
