import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, FileImage, HandCoins, ShieldCheck, Wallet } from "lucide-react";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { dataCurta, hoje } from "@/lib/format";
import { pagamentosDoAno } from "@/lib/pagamentos";
import { Titulo } from "@/components/Titulo";
import { Avatar } from "@/components/Avatar";
import { FiltrosPagamentos } from "./FiltrosPagamentos";
import { ExportarCsv } from "./ExportarCsv";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAGAMENTO: Record<string, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-100 text-stone-600" },
  informado: { rotulo: "Informado", cor: "bg-amber-50 text-amber-700" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
};

export default async function Pagamentos({ searchParams }: PageProps<"/admin/pagamentos">) {
  await exigir(PODE.editarEventos);
  const sp = await searchParams;
  const hj = hoje();
  const anoAtual = Number(hj.slice(0, 4));
  const ano = Number(sp.ano) || anoAtual;
  const mes = sp.mes ? Number(sp.mes) : null;
  const eventoFiltro = typeof sp.evento === "string" ? sp.evento : "";
  const pagamentoFiltro = typeof sp.pagamento === "string" ? sp.pagamento : "";

  const todos = await pagamentosDoAno(ano);
  const itens = todos.filter(
    (i) =>
      (!mes || Number(i.data.slice(5, 7)) === mes) &&
      (!eventoFiltro || i.eventoId === eventoFiltro) &&
      (!pagamentoFiltro || i.pagamento === pagamentoFiltro),
  );

  const eventosUnicos = [...new Map(todos.map((i) => [i.eventoId, i.titulo])).entries()]
    .map(([id, titulo]) => ({ id, titulo }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo));

  const totalPago = itens.filter((i) => i.pagamento === "pago").reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalInformado = itens.filter((i) => i.pagamento === "informado").length;
  const totalPendente = itens.filter((i) => i.pagamento === "pendente").length;
  const totalIsento = itens.filter((i) => i.pagamento === "isento").length;

  const kpis = [
    { rotulo: "Recebido", valor: formatoReal(totalPago), Icone: Wallet, cor: "bg-emerald-50 text-emerald-600" },
    { rotulo: "Aguardando confirmação", valor: totalInformado, Icone: Clock, cor: "bg-amber-50 text-amber-600" },
    { rotulo: "Pendentes", valor: totalPendente, Icone: HandCoins, cor: "bg-stone-100 text-stone-600" },
    { rotulo: "Isentos", valor: totalIsento, Icone: ShieldCheck, cor: "bg-sky-50 text-sky-600" },
  ];

  return (
    <>
      <Titulo
        sobre="Relatório"
        titulo={`Pagamentos de ${ano}`}
        subtitulo="Contribuições dos participantes nos rituais, por evento e situação."
        acoes={
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            <Link href={`/admin/pagamentos?ano=${ano - 1}`} className="btn-fantasma h-8 px-2.5" aria-label={`Ano ${ano - 1}`}><ChevronLeft size={16} />{ano - 1}</Link>
            <span className="px-2 text-sm font-semibold tabular-nums">{ano}</span>
            {ano < anoAtual + 1 ? (
              <Link href={`/admin/pagamentos?ano=${ano + 1}`} className="btn-fantasma h-8 px-2.5" aria-label={`Ano ${ano + 1}`}>{ano + 1}<ChevronRight size={16} /></Link>
            ) : <span className="w-16" />}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <FiltrosPagamentos eventos={eventosUnicos} />
          <ExportarCsv itens={itens} nomeArquivo={`pagamentos-${ano}.csv`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Pessoa</th>
                <th className="px-3 py-3 font-medium">Evento</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Data</th>
                <th className="px-3 py-3 text-right font-medium">Valor</th>
                <th className="px-3 py-3 font-medium">Situação</th>
                <th className="px-5 py-3 font-medium sm:px-6" />
              </tr>
            </thead>
            <tbody>
              {itens.length ? (
                itens.map((i) => (
                  <tr key={i.inscricaoId} className="border-t border-stone-100 transition hover:bg-stone-50/70">
                    <td className="px-5 py-2.5 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <Avatar nome={i.nome} foto={i.foto} tamanho={26} className="ring-0" />
                        <span className="font-medium text-stone-800">{i.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-stone-600">
                      <Link href={`/admin/eventos/${i.eventoId}`} className="hover:text-mata-700 hover:underline">{i.titulo}</Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-stone-500 tabular-nums">{dataCurta(i.data)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{i.valor != null ? formatoReal(i.valor) : <span className="text-stone-300">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <span className={`chip ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right sm:px-6">
                      {i.comprovante && (
                        <a href={`/api/comprovante/${i.comprovante}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-mata-700 hover:underline">
                          <FileImage size={13} /> Comprovante
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">Nenhum pagamento encontrado para este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
