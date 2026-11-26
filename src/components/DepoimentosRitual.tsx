import { ASPECTOS } from "@/lib/depoimentos-regras";
import type { resumoDepoimentos } from "@/lib/depoimentos";

type Resumo = Awaited<ReturnType<typeof resumoDepoimentos>>;

export function DepoimentosRitual({ resumo }: { resumo: Resumo }) {
  return <section className="mx-2 mb-4 rounded-2xl border border-stone-200 bg-white p-4 sm:mx-4" aria-labelledby="titulo-depoimentos">
    <div className="flex items-baseline justify-between gap-2"><h2 id="titulo-depoimentos" className="text-base font-semibold text-stone-900">Depoimentos após o ritual</h2><span className="text-xs text-stone-500">{resumo.quantidade} {resumo.quantidade === 1 ? "avaliação" : "avaliações"}</span></div>
    {resumo.quantidade > 0 && <dl className="mt-4 grid gap-2 sm:grid-cols-2">{ASPECTOS.map(([chave, titulo]) => <div key={chave} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm"><dt className="text-stone-600">{titulo}</dt><dd className="shrink-0 font-bold tabular-nums text-mata-800">{resumo.medias[chave]?.toFixed(1).replace(".", ",")}/10</dd></div>)}</dl>}
    {resumo.depoimentos.length ? <ul className="mt-4 space-y-2">{resumo.depoimentos.map((d) => <li key={d.$id} className="rounded-xl border border-stone-100 bg-stone-50/70 p-3"><div className="flex flex-wrap justify-between gap-1 text-xs"><strong className="text-stone-800">{d.autor}</strong><time className="text-stone-500">{new Date(d.$createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{d.texto}</p></li>)}</ul> : <p className="mt-4 text-sm text-stone-500">Nenhum depoimento recebido ainda.</p>}
    {resumo.temMais && <p className="mt-3 text-xs text-stone-500">Exibindo os 100 depoimentos mais recentes.</p>}
  </section>;
}
