import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { diasDesde, historicoDe } from "@/lib/guarnicao-estatisticas";
import { createAdminClient } from "@/lib/appwrite";
import { prefsDe } from "@/lib/usuarios";
import { formatarIdRitual, partesData } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { GraficoMeses } from "../../estatisticas/blocos";
import { suspensaoAtiva } from "@/lib/suspensao-guarnicao";
import { AcoesGuardiao } from "./AcoesGuardiao";

export const metadata = { title: "Guardião" };

function dataDaParticipacao(iso: string) {
  const { dia, mes, ano } = partesData(iso);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${String(ano).slice(-2)}`;
}

/** Perfil de um guardião (visível a guardiões e coordenação), com números e o histórico de rituais servidos. */
export default async function PerfilGuardiao({ params }: PageProps<"/guarnicao/guardioes/[id]">) {
  const { id } = await params;
  const { u, visao } = (await contextoGuarnicao(`/guarnicao/guardioes/${id}`))!;
  const { users } = createAdminClient();
  const pessoa = await users.get({ userId: id }).catch(() => null);
  if (!pessoa) notFound();
  const p = prefsDe(pessoa.prefs);
  // Só perfis de guardiões ativos (nunca de participantes ou de outras contas)
  if (p.funcao_ritual !== "guardiao" || !pessoa.status) notFound();
  const suspensoAte = suspensaoAtiva(p.guarnicao_suspenso_ate) ? p.guarnicao_suspenso_ate : null;
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
      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/guarnicao/guardioes" aria-label="Voltar" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-cartao ring-1 ring-stone-200 active:scale-90">
          <ChevronLeft size={22} />
        </Link>
        {visao === "coordenador" && id !== u.id && <AcoesGuardiao id={id} nome={pessoa.name || pessoa.email} suspensoAte={suspensoAte} />}
      </div>
      <section className="mt-2 flex flex-col items-center px-5 text-center">
        <Avatar nome={pessoa.name || pessoa.email} foto={p.foto_file_id} tamanho={96} />
        <h1 className="mt-3 text-2xl font-bold text-stone-900">{pessoa.name}</h1>
        <p className="text-sm text-emerald-700">{p.sexo === "feminino" ? "Guardiã" : "Guardião"}</p>
        {suspensoAte && visao === "coordenador" && <p className="mt-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Candidaturas suspensas</p>}
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
        <GraficoMeses porMes={h.porMes} titulo={`Rituais em ${new Date().getFullYear()}`} compacto />
        <section className="rounded-3xl bg-white px-3 py-4 shadow-cartao ring-1 ring-stone-200/70">
          <h2 className="px-1 text-sm font-semibold text-stone-900">Histórico de Participações</h2>
          {h.rituais.length === 0 ? (
            <p className="px-1 py-3 text-sm text-stone-500">Ainda não serviu em nenhum ritual.</p>
          ) : (
            <div className="relative mt-4">
              <span aria-hidden className="absolute top-2 bottom-3 left-20 w-0.5 bg-stone-300" />
              <ol className="relative">
                {h.rituais.slice(0, 50).map((e) => {
                  const numeroRitual = formatarIdRitual(e.ritual_numero_geral, null, null);
                  return (
                    <li key={e.$id} className="grid grid-cols-[4rem_1rem_minmax(0,1fr)] gap-x-2 pb-5 last:pb-0">
                      <div className="min-w-0 text-right">
                        {numeroRitual && (
                          <span className="inline-flex rounded-md bg-mata-50 px-2 py-0.5 text-[10px] font-semibold text-mata-700">
                            {numeroRitual}
                          </span>
                        )}
                        <time dateTime={e.data} className="mt-1 block text-[11px] font-medium text-stone-500 tabular-nums">
                          {dataDaParticipacao(e.data)}
                        </time>
                      </div>
                      <span aria-hidden className="relative z-10 mx-auto mt-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-600 ring-1 ring-emerald-200" />
                      <p className="min-w-0 pt-0.5 text-sm leading-snug font-medium text-stone-800 [overflow-wrap:anywhere]">{e.titulo}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
