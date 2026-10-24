import Link from "next/link";
import { Clock, Search, UserRound } from "lucide-react";
import { exigir } from "@/lib/auth";
import { PERFIS, PODE, type Perfil } from "@/lib/config";
import { hoje, dataCurta } from "@/lib/format";
import { listarEventos } from "@/lib/data";
import { todasInscricoesAtivas } from "@/lib/inscricoes";
import { listarTodasAsPessoas } from "@/lib/usuarios";
import { Titulo } from "@/components/Titulo";
import { Avatar } from "@/components/Avatar";
import { MenuParticipante } from "./MenuParticipante";

const COR_PERFIL: Record<Perfil, string> = {
  admin: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  coordenador: "bg-orange-50 text-orange-700 ring-orange-200",
  normal: "bg-stone-100 text-stone-600 ring-stone-200",
};
const COR_FUNCAO = { mestre: "bg-mata-50 text-mata-700 ring-mata-200", guardiao: "bg-sky-50 text-sky-700 ring-sky-200" } as const;
const ROTULO_FUNCAO = { mestre: "Mestre", guardiao: "Guardião" } as const;

/** Todas as pessoas com conta: quem só participa dos rituais e também a equipe (mestres, guardiões, coordenação). */
export default async function Participantes({ searchParams }: PageProps<"/admin/participantes">) {
  const eu = await exigir(PODE.editarEventos);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [participantes, inscricoes, eventos] = await Promise.all([listarTodasAsPessoas(), todasInscricoesAtivas(), listarEventos()]);
  const dataDoEvento = new Map(eventos.map((e) => [e.$id, e.data]));
  const hj = hoje();

  const resumo = new Map<string, { participou: number; proximos: number; pendentes: number; pago: number }>();
  for (const i of inscricoes) {
    const data = dataDoEvento.get(i.evento_id);
    if (!data) continue;
    const r = resumo.get(i.usuario_id) ?? { participou: 0, proximos: 0, pendentes: 0, pago: 0 };
    if (data < hj) {
      if (i.situacao === "confirmada") r.participou++;
    } else r.proximos++;
    if (i.pagamento === "pendente" || i.pagamento === "informado" || i.pagamento === "na_hora") r.pendentes++;
    if (i.pagamento === "pago") r.pago += i.valor ?? 0;
    resumo.set(i.usuario_id, r);
  }

  const termo = q.toLowerCase();
  const lista = termo
    ? participantes.filter((p) => p.nome.toLowerCase().includes(termo) || p.email.toLowerCase().includes(termo) || (p.telefone ?? "").includes(q))
    : participantes;

  const comPendencia = participantes.filter((p) => (resumo.get(p.id)?.pendentes ?? 0) > 0).length;

  const kpis = [
    { rotulo: "Pessoas", valor: participantes.length, Icone: UserRound, cor: "bg-mata-50 text-mata-600" },
    { rotulo: "Com pagamento em aberto", valor: comPendencia, Icone: Clock, cor: "bg-amber-50 text-amber-600" },
  ];

  return (
    <>
      <Titulo sobre="Administração" titulo="Participantes" subtitulo="Todas as pessoas com conta: participantes e equipe, com o histórico de rituais e pagamentos." />

      <div className="mb-6 grid grid-cols-2 gap-3">
        {kpis.map(({ rotulo, valor, Icone, cor }) => (
          <div key={rotulo} className="cartao flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cor}`}><Icone size={20} /></span>
            <div className="min-w-0">
              <p className="truncate text-[13px] text-stone-500">{rotulo}</p>
              <p className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="cartao overflow-hidden p-0 sm:p-0">
        <form className="flex items-center gap-2 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
            <input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou telefone" className="campo h-10 pl-9 text-sm" />
          </div>
          <button className="btn-secundario h-10 px-4 text-sm">Buscar</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Pessoa</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 text-right font-medium">Rituais</th>
                <th className="px-3 py-3 text-right font-medium">Próximos</th>
                <th className="px-3 py-3 font-medium">Pagamentos</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Cadastro</th>
                <th className="px-5 py-3 sm:px-6" />
              </tr>
            </thead>
            <tbody>
              {lista.length ? (
                lista.map((p) => {
                  const r = resumo.get(p.id);
                  return (
                    <tr key={p.id} className="border-t border-stone-100 transition hover:bg-stone-50/70">
                      <td className="px-5 py-2.5 sm:px-6">
                        <Link href={`/admin/participantes/${p.id}`} className="flex items-center gap-2.5">
                          <Avatar nome={p.nome} foto={p.foto} tamanho={30} className="ring-0" />
                          <span className="min-w-0">
                            <span className="block font-medium text-stone-800 hover:text-mata-700">{p.nome}</span>
                            <span className="block truncate text-xs text-stone-500">{p.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        {/* Uma etiqueta só: Mestre ou Guardião; senão o perfil de acesso da equipe; senão Participante */}
                        {p.funcao !== "nenhuma" ? (
                          <span className={`chip whitespace-nowrap ring-1 ring-inset ${COR_FUNCAO[p.funcao]}`}>{ROTULO_FUNCAO[p.funcao]}</span>
                        ) : p.perfil ? (
                          <span className={`chip whitespace-nowrap ring-1 ring-inset ${COR_PERFIL[p.perfil]}`}>{PERFIS.find((x) => x.id === p.perfil)?.nome}</span>
                        ) : (
                          <span className="chip whitespace-nowrap bg-stone-100 text-stone-500">Participante</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r?.participou ?? 0}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r?.proximos ?? 0}</td>
                      <td className="px-3 py-2.5">
                        {r?.pendentes ? (
                          <span className="chip whitespace-nowrap bg-amber-50 text-amber-700">{r.pendentes} em aberto</span>
                        ) : (
                          <span className="chip whitespace-nowrap bg-stone-100 text-stone-500">Em dia</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-stone-500 tabular-nums">{dataCurta(p.criadoEm.slice(0, 10))}</td>
                      <td className="px-5 py-2.5 text-right sm:px-6">
                        <MenuParticipante userId={p.id} nome={p.nome} admin={eu.perfil === "admin"} equipe={!!p.perfil} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">
                    {q ? "Ninguém encontrado para essa busca." : "Nenhuma pessoa cadastrada ainda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
