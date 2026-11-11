import { CircleCheck, Crown, FileText, UserX, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { DadosReuniao, PessoaReuniao } from "@/lib/reuniao";

/** Presença na reunião (painel): confirmados com mestres e guardiões separados, quem justificou e quem não respondeu. */
export function PresencaReuniao({ dados }: { dados: DadosReuniao }) {
  return (
    <section className="cartao space-y-5">
      <div>
        <h2 className="cartao-titulo">Presença na reunião</h2>
        <p className="cartao-sub">Os mestres escalados já entram como confirmados. A coordenação ajusta a lista pelo app da Guarnição.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Coluna icone={<CircleCheck size={16} className="text-emerald-600" />} titulo="Confirmados" total={dados.confirmados.length} vazio="Ninguém confirmou ainda.">
          <Divisao pessoas={dados.confirmados} />
        </Coluna>
        <Coluna icone={<FileText size={16} className="text-amber-600" />} titulo="Justificaram" total={dados.justificados.length} vazio="Ninguém justificou.">
          <Divisao pessoas={dados.justificados} detalhe={(p) => <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs whitespace-pre-line text-amber-950">{p.texto}{p.por && <span className="block text-[11px] text-amber-700/80">registrada por {p.por}</span>}</p>} />
        </Coluna>
        <Coluna icone={<UserX size={16} className="text-stone-500" />} titulo="Sem resposta" total={dados.semResposta.length} vazio="Todos responderam.">
          <Divisao pessoas={dados.semResposta} />
        </Coluna>
      </div>
    </section>
  );
}

function Coluna({ icone, titulo, total, vazio, children }: { icone: React.ReactNode; titulo: string; total: number; vazio: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3.5 ring-1 ring-stone-100">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
        {icone} {titulo} <span className="font-medium text-stone-500 tabular-nums">· {total}</span>
      </h3>
      {total === 0 ? <p className="mt-2 text-sm text-stone-400">{vazio}</p> : children}
    </div>
  );
}

/** Mestres primeiro e, separados, os guardiões do dia e os demais guardiões. */
function Divisao<T extends PessoaReuniao>({ pessoas, detalhe }: { pessoas: T[]; detalhe?: (p: T) => React.ReactNode }) {
  const grupos = [
    { rotulo: "Mestres", lista: pessoas.filter((p) => p.mestre) },
    { rotulo: "Guardiões do dia", lista: pessoas.filter((p) => !p.mestre && p.guardiaoDoDia) },
    { rotulo: "Guardiões Participantes", lista: pessoas.filter((p) => !p.mestre && !p.guardiaoDoDia) },
  ].filter((g) => g.lista.length);
  return (
    <div className="mt-3 space-y-4">
      {grupos.map((g) => (
        <div key={g.rotulo}>
          <div className="flex items-center gap-2.5" role="separator" aria-label={g.rotulo}>
          <span aria-hidden className="h-px flex-1 bg-stone-200" />
          <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-stone-500 uppercase">
            {g.rotulo === "Mestres" && <Crown size={12} className="text-emerald-700" />}{g.rotulo === "Guardiões do dia" && <ShieldCheck size={12} className="text-amber-600" />} {g.rotulo} · {g.lista.length}
          </span>
          <span aria-hidden className="h-px flex-1 bg-stone-200" />
        </div>
          <ul className="mt-2 space-y-1.5">
            {g.lista.map((p) => (
              <li key={p.id}>
                <div className="flex items-center gap-2.5">
                  <Avatar nome={p.nome} foto={p.foto} tamanho={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-800">
                    {p.nome}
                    {p.mestre && <span className="ml-1 text-xs font-semibold text-emerald-700">({p.sexo === "feminino" ? "Mestra" : "Mestre"})</span>}
                  </span>
                </div>
                {detalhe?.(p)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
