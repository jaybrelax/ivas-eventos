import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, History, Receipt } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { urlImagem } from "@/lib/links";
import { getDadosInstituto } from "@/lib/data";
import { dataCurta, dataPorExtenso, formatarIdRitual } from "@/lib/format";
import { inscricoesComEventos, type ItemInscricao } from "@/lib/inscricoes";
import { CabecalhoPublico } from "@/components/publico/CabecalhoPublico";
import { RodapePublico } from "@/components/publico/RodapePublico";
import { ProximoRitualCard } from "@/components/publico/ProximoRitualCard";
import { BotaoComprovante } from "./BotaoComprovante";

export const metadata: Metadata = { title: "Minha conta" };

const PAGAMENTO: Record<ItemInscricao["pagamento"], { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-100 text-stone-600" },
  informado: { rotulo: "Informado", cor: "bg-amber-50 text-amber-700" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
};

const SITUACAO: Record<ItemInscricao["situacao"], { rotulo: string; cor: string }> = {
  confirmada: { rotulo: "Confirmado", cor: "bg-mata-100 text-mata-800" },
  espera: { rotulo: "Lista de espera", cor: "bg-amber-50 text-amber-700" },
  cancelada: { rotulo: "Cancelado", cor: "bg-stone-100 text-stone-500" },
};

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ABAS = [
  { chave: "proximos", rotulo: "Próximos", Icone: CalendarCheck },
  { chave: "historico", rotulo: "Histórico", Icone: History },
  { chave: "pagamentos", rotulo: "Pagamentos", Icone: Receipt },
] as const;
type Aba = (typeof ABAS)[number]["chave"];

export default async function MinhaContaPage({ searchParams }: PageProps<"/minha-conta">) {
  const u = await exigirSessao("/minha-conta");
  const sp = await searchParams;
  const abaBruta = String(sp?.aba ?? "proximos");
  const aba: Aba = (ABAS.some((a) => a.chave === abaBruta) ? abaBruta : "proximos") as Aba;

  const [{ instituto, enderecos, telefones, redes }, itens] = await Promise.all([
    getDadosInstituto(),
    inscricoesComEventos(u.id),
  ]);

  const proximos = itens.filter((i) => !i.passado && i.situacao !== "cancelada");
  const historico = itens.filter((i) => i.passado && i.situacao === "confirmada");
  const pagamentos = itens.filter((i) => i.temContribuicao);
  const totalPago = pagamentos.filter((i) => i.pagamento === "pago").reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalPendente = pagamentos.filter((i) => i.pagamento === "pendente" || i.pagamento === "informado").length;

  return (
    <div className="min-h-screen bg-fundo text-stone-900">
      <CabecalhoPublico instituto={instituto} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-ouro-600 uppercase">Minha conta</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Olá, {u.nome.split(" ")[0]}</h1>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2 border-b border-stone-200/80 pb-3">
          {ABAS.map(({ chave, rotulo, Icone }) => (
            <Link
              key={chave}
              href={`/minha-conta?aba=${chave}`}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                aba === chave ? "bg-mata-800 text-white shadow-cartao" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Icone size={15} /> {rotulo}
            </Link>
          ))}
        </nav>

        {aba === "proximos" && <ProximoRitualCard usuarioId={u.id} />}

        {aba === "proximos" && (
          <Lista
            vazio="Você ainda não confirmou participação em nenhum ritual futuro."
            itens={proximos}
            mostrarPagamento
          />
        )}

        {aba === "historico" && (
          <Lista vazio="Nenhum ritual no seu histórico ainda." itens={historico} mostrarPagamento={false} />
        )}

        {aba === "pagamentos" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="cartao !p-4">
                <p className="text-xs font-medium text-stone-500">Total contribuído</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">{formatoReal(totalPago)}</p>
              </div>
              <div className="cartao !p-4">
                <p className="text-xs font-medium text-stone-500">Aguardando confirmação</p>
                <p className="mt-1 text-xl font-semibold text-amber-700">{totalPendente}</p>
              </div>
            </div>
            <Lista vazio="Nenhum pagamento registrado ainda." itens={pagamentos} mostrarPagamento />
          </div>
        )}
      </main>
      <RodapePublico instituto={instituto} enderecos={enderecos} telefones={telefones} redes={redes} />
    </div>
  );
}

function Lista({ itens, vazio, mostrarPagamento }: { itens: ItemInscricao[]; vazio: string; mostrarPagamento: boolean }) {
  if (!itens.length) return <p className="cartao text-center text-sm text-stone-400">{vazio}</p>;
  return (
    <ul className="space-y-2.5">
      {itens.map((i) => (
        <li key={i.inscricaoId} className="cartao !p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={i.url} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mata-900 ring-1 ring-stone-200" aria-hidden tabIndex={-1}>
                {i.capa && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagem(i.capa, 160)} width={64} height={64} loading="lazy" decoding="async" alt="" className="h-full w-full object-cover" />
                )}
              </Link>
              <div className="min-w-0">
                <Link href={i.url} className="font-semibold text-stone-900 hover:text-mata-700 hover:underline">
                  {i.ritualNumero ? `Ritual ${formatarIdRitual(i.ritualNumero, null, null)}: ` : ""}{i.titulo}
                </Link>
                <p className="mt-0.5 text-sm text-stone-500">{dataPorExtenso(i.data)} · {dataCurta(i.data)} às {i.hora}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`chip ${SITUACAO[i.situacao].cor}`}>{SITUACAO[i.situacao].rotulo}</span>
              {mostrarPagamento && i.temContribuicao && (
                <span className={`chip ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>
              )}
            </div>
          </div>
          {mostrarPagamento && i.temContribuicao && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-500">
              {i.valor != null && <span>Contribuição: {formatoReal(i.valor)}</span>}
              {i.comprovante && <BotaoComprovante id={i.comprovante} />}
              {i.pagamento === "pendente" && (
                <Link
                  href={`${i.url}?pagar=1`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                  <Receipt size={16} /> Avisar pagamento
                </Link>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
