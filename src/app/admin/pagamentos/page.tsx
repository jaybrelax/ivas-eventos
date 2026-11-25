import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, FileImage, HandCoins, ShieldCheck, Wallet } from "lucide-react";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { dataCurta, hoje } from "@/lib/format";
import { pagamentosDoAno, type ItemPagamento } from "@/lib/pagamentos";
import type { SituacaoPagamento } from "@/lib/types";
import { Titulo } from "@/components/Titulo";
import { Avatar } from "@/components/Avatar";
import { FiltrosPagamentos } from "./FiltrosPagamentos";
import { ExportarCsv } from "./ExportarCsv";
import { LinhaPagamento, type DadosPagamento } from "./LinhaPagamento";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAGAMENTO: Record<SituacaoPagamento, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-100 text-stone-600" },
  informado: { rotulo: "Informado", cor: "bg-amber-50 text-amber-700" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
  credito: { rotulo: "Crédito de pacote", cor: "bg-violet-50 text-violet-700" },
  aniversario: { rotulo: "Bônus de aniversário", cor: "bg-fuchsia-50 text-fuchsia-800" },
};

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso)).replace(",", " às");

const SITUACAO_INSCRICAO: Record<ItemPagamento["situacao"], string> = { confirmada: "Confirmada", espera: "Lista de espera", cancelada: "Cancelada" };

/** O que o modal do pagamento mostra, já formatado. */
function dadosModal(i: ItemPagamento): DadosPagamento {
  return {
    usuarioId: i.usuarioId, nome: i.nome, foto: i.foto, eventoId: i.eventoId, evento: i.titulo, dataEvento: dataCurta(i.data), tipoNome: i.tipoNome,
    situacaoInscricao: SITUACAO_INSCRICAO[i.situacao] ?? i.situacao,
    pagamentoRotulo: PAGAMENTO[i.pagamento].rotulo, pagamentoCor: PAGAMENTO[i.pagamento].cor,
    valor: i.valor != null ? formatoReal(i.valor) : null,
    informadoEm: i.informadoEm ? dataHora(i.informadoEm) : null, pagoEm: i.pagoEm ? dataHora(i.pagoEm) : null,
    comprovante: i.comprovante,
  };
}

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

        {/* Celular e tablet: um cartão por pagamento (sem rolagem lateral) */}
        <ul className="divide-y divide-stone-100 lg:hidden">
          {itens.length ? itens.map((i) => (
            <LinhaPagamento key={i.inscricaoId} as="li" className="space-y-2 px-4 py-3.5 transition active:bg-stone-50" dados={dadosModal(i)}>
              <div className="flex items-start justify-between gap-3">
                <Link href={`/admin/participantes/${i.usuarioId}`} className="flex min-w-0 items-center gap-2.5 py-1 hover:underline">
                  <Avatar nome={i.nome} foto={i.foto} tamanho={32} className="ring-0" />
                  <span className="min-w-0 truncate text-sm font-medium text-stone-800">{i.nome}</span>
                </Link>
                <span className="shrink-0 text-sm font-semibold text-stone-900 tabular-nums">{i.valor != null ? formatoReal(i.valor) : <span className="text-stone-300">—</span>}</span>
              </div>
              <p className="text-sm text-stone-600">
                <Link href={`/admin/eventos/${i.eventoId}`} className="hover:text-mata-700 hover:underline">{i.titulo}</Link>
                <span className="text-stone-400"> · {dataCurta(i.data)}</span>
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className={`chip ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>
                {i.comprovante && (
                  <a href={`/api/comprovante/${i.comprovante}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir o comprovante de ${i.nome}`} className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-mata-700 hover:bg-mata-50">
                    <FileImage size={15} aria-hidden /> Comprovante
                  </a>
                )}
              </div>
            </LinhaPagamento>
          )) : (
            <li className="px-4 py-10 text-center text-sm text-stone-400">Nenhum pagamento encontrado para este filtro.</li>
          )}
        </ul>

        {/* Desktop (a partir de 1024 px): tabela de colunas fixas, sem rolagem lateral */}
        <div className="hidden lg:block">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[26%]" />
              <col />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-48" />
            </colgroup>
            <thead className="border-b border-stone-100 bg-stone-50/80 text-left text-xs text-stone-500">
              <tr>
                <th className="px-5 py-3.5 font-medium">Pessoa</th>
                <th className="px-3 py-3.5 font-medium">Evento</th>
                <th className="px-3 py-3.5 font-medium whitespace-nowrap">Data</th>
                <th className="px-3 py-3.5 text-right font-medium">Valor</th>
                <th className="px-3 py-3.5 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {itens.length ? itens.map((i) => (
                <LinhaPagamento key={i.inscricaoId} as="tr" className="border-b border-stone-100 align-middle transition last:border-0 hover:bg-stone-50/70 focus-visible:bg-stone-50" dados={dadosModal(i)}>
                  <td className="px-5 py-3">
                    <Link href={`/admin/participantes/${i.usuarioId}`} title={`Ver o perfil de ${i.nome}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                      <Avatar nome={i.nome} foto={i.foto} tamanho={32} className="ring-0" />
                      <span className="min-w-0 truncate font-medium text-stone-800">{i.nome}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    <Link href={`/admin/eventos/${i.eventoId}`} title={i.titulo} className="line-clamp-2 leading-snug hover:text-mata-700 hover:underline">{i.titulo}</Link>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-stone-500 tabular-nums">{dataCurta(i.data)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{i.valor != null ? formatoReal(i.valor) : <span className="text-stone-300">—</span>}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`chip whitespace-nowrap ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>
                      {i.comprovante && (
                        <a href={`/api/comprovante/${i.comprovante}`} target="_blank" rel="noopener noreferrer" title="Abrir o comprovante" aria-label={`Abrir o comprovante de ${i.nome}`} className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mata-700 transition hover:bg-mata-50">
                          <FileImage size={16} aria-hidden />
                        </a>
                      )}
                    </div>
                  </td>
                </LinhaPagamento>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-stone-400">Nenhum pagamento encontrado para este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
