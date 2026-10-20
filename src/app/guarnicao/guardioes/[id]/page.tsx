import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { diasDesde, historicoDe } from "@/lib/guarnicao-estatisticas";
import { createAdminClient } from "@/lib/appwrite";
import { prefsDe } from "@/lib/usuarios";
import { dataCurta, formatarIdRitual } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { GraficoMeses } from "../../estatisticas/blocos";

export const metadata = { title: "Guardião" };

/** Perfil de um guardião (visível a guardiões e coordenação), com números e o histórico de rituais servidos. */
export default async function PerfilGuardiao({ params }: PageProps<"/guarnicao/guardioes/[id]">) {
  const { id } = await params;
  const { visao } = (await contextoGuarnicao(`/guarnicao/guardioes/${id}`))!;
  const { users } = createAdminClient();
  const pessoa = await users.get({ userId: id }).catch(() => null);
  if (!pessoa) notFound();
  const p = prefsDe(pessoa.prefs);
  // Só perfis de guardiões ativos (nunca de participantes ou de outras contas)
  if (p.funcao_ritual !== "guardiao" || !pessoa.status) notFound();
  const h = await historicoDe(id);
  const numero = p.telefone ? p.telefone.replace(/\D/g, "") : "";
  // O WhatsApp é dado de contato: só a coordenação vê; guardiões veem apenas nome, foto e estatísticas
  const whats = visao === "coordenador" && numero ? `https://wa.me/${numero.startsWith("55") ? numero : `55${numero}`}` : null;
  const numeros = [
    { v: h.total, r: "rituais" },
    { v: h.ano, r: "neste ano" },
    { v: h.ultimo ? diasDesde(h.ultimo) : "—", r: "dias desde o último" },
  ];

  return (
    <div className="pb-6">
      <div className="px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/guarnicao/guardioes" aria-label="Voltar" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-cartao ring-1 ring-stone-200 active:scale-90">
          <ChevronLeft size={22} />
        </Link>
      </div>
      <section className="mt-2 flex flex-col items-center px-5 text-center">
        <Avatar nome={pessoa.name || pessoa.email} foto={p.foto_file_id} tamanho={96} />
        <h1 className="mt-3 text-2xl font-bold text-stone-900">{pessoa.name}</h1>
        <p className="text-sm text-emerald-700">{p.sexo === "feminino" ? "Guardiã" : "Guardião"}</p>
        {whats && (
          <a href={whats} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white active:scale-95">
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
      </section>

      <div className="mt-5 grid grid-cols-3 gap-2 px-4 text-center">
        {numeros.map((k) => (
          <div key={k.r} className="rounded-3xl bg-white p-3 shadow-cartao ring-1 ring-stone-200/70">
            <p className="text-2xl font-bold text-stone-900 tabular-nums">{k.v}</p>
            <p className="text-[11px] text-stone-500">{k.r}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-4 px-4">
        <GraficoMeses porMes={h.porMes} titulo={`Rituais em ${new Date().getFullYear()}`} />
        <section className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
          <h2 className="mb-2 px-1 text-sm font-semibold text-stone-900">Histórico</h2>
          {h.rituais.length === 0 ? (
            <p className="px-1 py-3 text-sm text-stone-500">Ainda não serviu em nenhum ritual.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {h.rituais.slice(0, 50).map((e) => (
                <li key={e.$id} className="flex items-center gap-3 px-1 py-2.5">
                  <span className="w-12 shrink-0 text-xs font-semibold text-stone-500 tabular-nums">{dataCurta(e.data)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-800">{e.titulo}</span>
                  <span className="font-mono text-[11px] text-emerald-700">{formatarIdRitual(e.ritual_numero_geral, null, null)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
