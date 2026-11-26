import { CircleDollarSign, GlassWater, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ListaPresenca, type PessoaPresenca } from "./ListaPresenca";
import { totalDoses, type Dose } from "@/lib/doses";
import type { ItemParticipanteInscrito } from "../Participantes";
import { CentralEvento } from "./CentralEvento";
import type { DadosCentral } from "./central-dados";

type PessoaDose = { id: string; nome: string; foto: string | null; papel: PessoaPresenca["papel"]; doses: Dose[] };

const PAGAMENTO: Record<string, string> = {
  pendente: "Pendente", informado: "Informada", pago: "Confirmada", isento: "Isenta",
  na_hora: "Contribuirá no ritual", credito: "Pacote", aniversario: "Bônus de aniversário",
};

/** Página sem ações para guardiões autorizados apenas a consultar o ritual. */
export function LeituraGuardiaoRitual({
  eventoId, titulo, data, horario, local, mestres, guardioes, participantes, doses, verDosagens, financeiro, central,
}: {
  eventoId: string; titulo: string; data: string; horario: string; local: string;
  mestres: PessoaPresenca[]; guardioes: PessoaPresenca[]; participantes: ItemParticipanteInscrito[];
  doses: PessoaDose[]; verDosagens: boolean; financeiro: ItemParticipanteInscrito[] | null; central: DadosCentral;
}) {
  const presenca: PessoaPresenca[] = [
    ...mestres,
    ...guardioes.filter((g) => !mestres.some((m) => m.id === g.id)),
    ...participantes.filter((p) => !mestres.some((m) => m.id === p.id) && !guardioes.some((g) => g.id === p.id))
      .map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, papel: "participante" as const })),
  ];

  return (
    <div className="space-y-4">
      <header className="cartao overflow-hidden p-5 sm:p-6">
        <Link href="/eventos" className="mb-4 inline-flex min-h-9 items-center text-sm font-medium text-mata-700 hover:text-mata-900">← Voltar à agenda</Link>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700"><ShieldCheck size={20} aria-hidden /></span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-700 uppercase"><LockKeyhole size={13} aria-hidden /> Leitura do ritual</p>
            <h1 className="mt-1 font-display text-xl leading-tight font-semibold text-stone-900">{titulo}</h1>
            <p className="mt-2 text-sm text-stone-600">{data} · {horario} · {local}</p>
            <p className="mt-2 text-xs text-stone-500">Seu acesso permite consultar as informações e publicar na Central. As demais ações de gestão ficam indisponíveis.</p>
          </div>
        </div>
      </header>

      <ListaPresenca pessoas={presenca} espera={0} vagas={null} linkFicha={false} />

      {verDosagens && (
        <section className="cartao overflow-hidden p-0 sm:p-0">
          <header className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
            <GlassWater size={18} className="text-sky-700" aria-hidden />
            <h2 className="font-semibold text-stone-900">Dosagens registradas</h2>
          </header>
          <ul className="divide-y divide-stone-100">
            {doses.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar nome={p.nome} foto={p.foto} tamanho={38} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{p.nome}</span>
                <span className="text-right text-sm tabular-nums text-stone-600">{totalDoses(p.doses)} ml <span className="text-xs text-stone-400">· {p.doses.length} {p.doses.length === 1 ? "dose" : "doses"}</span></span>
              </li>
            ))}
          </ul>
          {!doses.length && <p className="px-5 py-4 text-sm text-stone-500">Nenhuma dosagem registrada.</p>}
        </section>
      )}

      {financeiro && (
        <section className="cartao overflow-hidden p-0 sm:p-0">
          <header className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
            <CircleDollarSign size={18} className="text-emerald-700" aria-hidden />
            <h2 className="font-semibold text-stone-900">Contribuições</h2>
            <span className="ml-auto text-xs text-stone-500">{financeiro.length} participantes</span>
          </header>
          <ul className="divide-y divide-stone-100">
            {financeiro.map((p) => (
              <li key={p.inscricaoId} className="flex items-center gap-3 px-5 py-3">
                <Avatar nome={p.nome} foto={p.foto} tamanho={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-800">{p.nome}</span>
                  <span className="text-xs text-stone-500">{PAGAMENTO[p.pagamento] ?? "Situação não informada"}</span>
                </span>
                {p.valor !== null && <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-800">{p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <CentralEvento eventoId={eventoId} dados={central} />
    </div>
  );
}
