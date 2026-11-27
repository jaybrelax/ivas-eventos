import { Fragment } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Crown, ListChecks, Shield, Ticket, UserRound, Users, Wallet } from "lucide-react";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import {
  historicoCreditos, listarPacotes, listarPlanos, PAGINA_HISTORICO, resumoGeral, saldosDeTodos, saldosEDebitos, type PacoteResumo,
} from "@/lib/creditos";
import { consomeCredito } from "@/lib/creditos-regras";
import { ROTULO_ACAO, ROTULO_PACOTE } from "@/lib/creditos-rotulos";
import { listarEventos, listarTipos } from "@/lib/data";
import { dataCurta } from "@/lib/format";
import { casaBusca } from "@/lib/busca-texto";
import { listarTodasAsPessoas, mapaUsuarios } from "@/lib/usuarios";
import { Titulo } from "@/components/Titulo";
import { Avatar } from "@/components/Avatar";
import { AbasCreditos, NavbarCreditos } from "./AbasCreditos";
import { BuscaCreditos } from "./BuscaCreditos";
import { AcoesPacote, CabecalhoComFiltros, ExportarHistoricoCsv, FiltrosHistorico, LancarPacote, PacoteClicavel, QuitarDebito } from "./Cliente";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso)).replace(",", " às");

const CHAVES_ABAS = ["pacotes", "saldos", "debitos", "historico"] as const;
type Aba = (typeof CHAVES_ABAS)[number];

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Painel dos pacotes de créditos: compras, saldo de cada pessoa, débitos (participou sem crédito) e histórico auditável. */
export default async function Creditos({ searchParams }: PageProps<"/admin/creditos">) {
  await exigir(PODE.editarEventos);
  const sp = await searchParams;
  const aba: Aba = ((CHAVES_ABAS as readonly string[]).includes(str(sp.aba)) ? str(sp.aba) : "pacotes") as Aba;
  // Busca de pessoa: vale para as quatro abas
  const q = str(sp.q).trim().slice(0, 80);

  return (
    <div className="admin-creditos-page pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <Titulo sobre="Relatório" titulo="Pacotes" subtitulo="Pacotes vendidos, saldo de cada pessoa, participações sem crédito e histórico de uso." />
      <NavbarCreditos aba={aba} q={q} />
      {aba === "pacotes" && <AbaPacotes q={q} />}
      {aba === "saldos" && <AbaSaldos negativos={str(sp.negativos) === "1"} agrupar={str(sp.agrupar) === "1"} q={q} />}
      {aba === "debitos" && <AbaDebitos q={q} />}
      {aba === "historico" && <AbaHistorico q={q} filtros={{ usuario: str(sp.usuario), evento: str(sp.evento), pacote: str(sp.pacote), de: str(sp.de), ate: str(sp.ate) }} paginas={Math.min(10, Math.max(1, Number(str(sp.paginas)) || 1))} />}
    </div>
  );
}

function Pessoa({ id, usuarios, semLink = false }: { id: string; usuarios: Awaited<ReturnType<typeof mapaUsuarios>>; semLink?: boolean }) {
  const u = usuarios.get(id);
  if (semLink) {
    return (
      <span className="flex items-center gap-2.5">
        <Avatar nome={u?.nome ?? "Usuário removido"} foto={u?.foto ?? null} tamanho={32} className="creditos-avatar ring-0" />
        <span className="font-medium text-[#1c1e21]">{u?.nome ?? "Usuário removido"}</span>
      </span>
    );
  }
  return (
    <Link href={`/admin/participantes/${id}`} className="flex min-w-0 items-center gap-2.5 rounded-lg hover:underline">
      <Avatar nome={u?.nome ?? "Usuário removido"} foto={u?.foto ?? null} tamanho={26} className="creditos-avatar ring-0" />
      <span className="min-w-0 break-words font-medium text-stone-800">{u?.nome ?? "Usuário removido"}</span>
    </Link>
  );
}

/* Aba Pacotes no padrão Meta (Ads Manager): superfícies brancas planas, borda de 1 px, cabeçalho cinza claro,
   situação com ponto + texto, barra fina de progresso e azul Meta só nas ações principais. */
const SITUACAO_PACOTE_DOT: Record<string, string> = { pago: "bg-[#31a24c]", informado: "bg-[#f7b928]", pendente: "bg-[#f7b928]", cancelado: "bg-[#8a8d91]" };

function KpiMeta({ rotulo, valor, detalhe, Icone }: { rotulo: string; valor: string | number; detalhe?: string; Icone: typeof Wallet }) {
  return (
    <div className="rounded-lg border border-[#dadde1] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs leading-relaxed font-medium text-[#65676b] sm:text-[13px]">{rotulo}</p>
        <Icone size={16} className="shrink-0 text-[#8a8d91]" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[#1c1e21] tabular-nums">{valor}</p>
      {detalhe && <p className="mt-1 text-xs leading-relaxed text-[#65676b]">{detalhe}</p>}
    </div>
  );
}

function SituacaoPacote({ p }: { p: PacoteResumo }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-[#1c1e21]">
      <span className={"h-2 w-2 shrink-0 rounded-full " + (SITUACAO_PACOTE_DOT[p.situacao] ?? "bg-[#8a8d91]")} aria-hidden />
      {ROTULO_PACOTE[p.situacao].rotulo}
    </span>
  );
}

function NomePacote({ p }: { p: PacoteResumo }) {
  return (
    <p className="text-sm font-semibold text-[#1c1e21]">
      {p.nome ?? "Pacote"} <span className="font-normal text-[#65676b]">· {p.quantidade} {p.quantidade === 1 ? "crédito" : "créditos"}</span>
    </p>
  );
}

/** Os 4 cards de números do topo das abas Pacotes e Saldos. */
function CartoesResumo({ dados }: { dados: Awaited<ReturnType<typeof resumoGeral>> }) {
  const { pacotes, saldos, debitos } = dados;
  const pagos = pacotes.filter((p) => p.situacao === "pago");
  const aguardando = pacotes.filter((p) => p.situacao === "informado" || p.situacao === "pendente");
  const disponiveis = [...saldos.values()].reduce((s, x) => s + x.disponiveis, 0);
  return (
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiMeta rotulo="Recebido em pacotes" valor={formatoReal(pagos.reduce((s, p) => s + (p.valor ?? 0), 0))} detalhe="pagamentos confirmados" Icone={Wallet} />
        <KpiMeta rotulo="Aguardando confirmação" valor={aguardando.length} detalhe={formatoReal(aguardando.reduce((s, p) => s + (p.valor ?? 0), 0))} Icone={Clock} />
        <KpiMeta rotulo="Créditos disponíveis" valor={disponiveis} detalhe="para uso em rituais" Icone={Ticket} />
        <KpiMeta rotulo="Participações sem crédito" valor={debitos.length} detalhe={debitos.length ? "precisam de quitação" : "nada em aberto"} Icone={AlertTriangle} />
      </div>
  );
}

/** Props do modal do pacote: dados editáveis e as informações que só aparecem lá dentro. */
function propsModal(p: PacoteResumo, usuarios: Awaited<ReturnType<typeof mapaUsuarios>>) {
  return {
    pacoteId: p.$id, situacao: p.situacao, quantidade: p.quantidade,
    dados: { nome: p.nome ?? "Pacote", valor: p.valor, observacao: p.observacao, comprovante: p.comprovante_file_id },
    detalhes: { pessoa: { id: usuarios.has(p.usuario_id) ? p.usuario_id : null, nome: usuarios.get(p.usuario_id)?.nome ?? "Usuário removido", foto: usuarios.get(p.usuario_id)?.foto ?? null }, criadoEm: dataHora(p.$createdAt), lancadoPor: p.origem === "equipe" ? ((p.criado_por && usuarios.get(p.criado_por)?.nome) || "a equipe") : null },
  };
}

async function AbaPacotes({ q }: { q: string }) {
  // Uma leitura só da tabela de créditos para pacotes, saldos e débitos
  const [dados, planos, pessoas, usuarios] = await Promise.all([
    resumoGeral(), listarPlanos(true), listarTodasAsPessoas(), mapaUsuarios(),
  ]);
  // Com busca, só os pacotes da pessoa procurada (os cards do topo continuam com os totais gerais)
  const pacotes = q ? dados.pacotes.filter((p) => casaBusca(q, usuarios.get(p.usuario_id)?.nome ?? "")) : dados.pacotes;
  const pagos = pacotes.filter((p) => p.situacao === "pago");

  const botaoLancar = (
    <LancarPacote
      planos={planos.map((p) => ({ id: p.$id, nome: p.nome, quantidade: p.quantidade, valor: p.valor }))}
      pessoas={pessoas.filter((p) => !usuarios.get(p.id)?.mock).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
    />
  );
  return (
    <>
      <CartoesResumo dados={dados} />

      {/* Busca de pessoa e Lançar pacote na mesma linha, entre os cards e a tabela */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <BuscaCreditos className="min-w-0 flex-1 sm:max-w-sm" />
        {botaoLancar}
      </div>
      {/* Celular: sem cabeçalho de tabela, a contagem de pacotes ativos fica aqui */}
      <p className="mb-3 text-sm text-[#65676b] lg:hidden"><strong className="font-semibold text-[#1c1e21]">{pagos.length}</strong> {pagos.length === 1 ? "pacote ativo" : "pacotes ativos"}</p>

      <section className="overflow-hidden rounded-lg border border-[#dadde1] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 md:border-b border-[#dadde1] px-4">
          <AbasCreditos aba="pacotes" q={q} />
        </div>

        {/* Celular e tablet: um cartão por pacote (sem rolagem lateral) */}
        <ul className="divide-y divide-[#dadde1] lg:hidden">
          {pacotes.length ? pacotes.map((p) => (
            <PacoteClicavel key={p.$id} as="li" className="space-y-3 px-4 py-3.5 transition active:bg-[#f5f6f7]" {...propsModal(p, usuarios)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm"><Pessoa id={p.usuario_id} usuarios={usuarios} semLink /></div>
                <span className="shrink-0 text-sm font-semibold text-[#1c1e21] tabular-nums">{p.valor != null ? formatoReal(p.valor) : "—"}</span>
              </div>
              <NomePacote p={p} />
              <IndicadorCreditos p={p} />
              <div className="flex items-end justify-between gap-3">
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <SituacaoPacote p={p} />
                  <AcoesPacote pacoteId={p.$id} situacao={p.situacao} />
                </div>
                <time dateTime={p.$createdAt} className="shrink-0 text-xs text-[#65676b] tabular-nums">{dataCurta(p.$createdAt.slice(0, 10))}</time>
              </div>
            </PacoteClicavel>
          )) : (
            <li className="px-4 py-10 text-center text-sm text-[#65676b]">{q ? "Nenhum pacote encontrado para “" + q + "”." : "Nenhum pacote ainda."}</li>
          )}
        </ul>

        {/* Desktop (a partir de 1024 px): tabela */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead className="border-b border-[#dadde1] bg-[#f5f6f7] text-left text-xs font-semibold text-[#65676b]">
              <tr>
                <th className="px-4 py-3.5">Pessoa</th>
                <th className="px-3 py-3.5">{pagos.length} {pagos.length === 1 ? "pacote ativo" : "pacotes ativos"}</th>
                <th className="px-3 py-3.5 text-right">Valor</th>
                <th className="px-3 py-3.5">Créditos</th>
                <th className="px-3 py-3.5">Situação</th>
                <th className="px-4 py-3.5"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {pacotes.length ? pacotes.map((p) => (
                <PacoteClicavel key={p.$id} as="tr" className="border-b border-[#dadde1] align-middle transition last:border-0 hover:bg-[#f5f6f7] focus-visible:bg-[#f5f6f7]" {...propsModal(p, usuarios)}>
                  <td className="px-4 py-3"><Pessoa id={p.usuario_id} usuarios={usuarios} semLink /></td>
                  <td className="px-3 py-3"><NomePacote p={p} /></td>
                  <td className="px-3 py-3 text-right font-medium text-[#1c1e21] tabular-nums">{p.valor != null ? formatoReal(p.valor) : <span className="text-[#8a8d91]">—</span>}</td>
                  <td className="px-3 py-3"><IndicadorCreditos p={p} /></td>
                  <td className="px-3 py-3"><SituacaoPacote p={p} /></td>
                  <td className="px-4 py-3"><AcoesPacote pacoteId={p.$id} situacao={p.situacao} /></td>
                </PacoteClicavel>
              )) : (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#65676b]">{q ? "Nenhum pacote encontrado para “" + q + "”." : "Nenhum pacote ainda."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

async function AbaSaldos({ negativos, agrupar, q }: { negativos: boolean; agrupar: boolean; q: string }) {
  const [saldos, usuarios, resumo] = await Promise.all([saldosDeTodos(), mapaUsuarios(), resumoGeral()]);
  const linhas = [...saldos.entries()]
    .filter(([, s]) => s.disponiveis || s.bloqueados || s.utilizados || s.debitos)
    .filter(([, s]) => !negativos || s.saldo < 0)
    .filter(([id]) => !q || casaBusca(q, usuarios.get(id)?.nome ?? ""))
    .sort((a, b) => a[1].saldo - b[1].saldo || (usuarios.get(a[0])?.nome ?? "").localeCompare(usuarios.get(b[0])?.nome ?? "", "pt-BR"));

  const hrefSaldos = (neg: boolean, agr: boolean) => "/admin/creditos?aba=saldos" + (neg ? "&negativos=1" : "") + (agr ? "&agrupar=1" : "") + (q ? "&q=" + encodeURIComponent(q) : "");

  // Linha de cada pessoa (igual com ou sem agrupamento)
  const linhaPessoa = ([id, sd]: (typeof linhas)[number]) => (
    <tr key={id} className="border-t border-stone-100 transition hover:bg-stone-50/70">
      <td className="px-5 py-2.5 sm:px-6"><Pessoa id={id} usuarios={usuarios} /></td>
      <td className="px-3 py-2.5 text-right tabular-nums">{sd.disponiveis}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{sd.bloqueados || "—"}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{sd.utilizados || "—"}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{sd.debitos || "—"}</td>
      <td className={`px-5 py-2.5 text-right text-base font-semibold tabular-nums sm:px-6 ${sd.saldo < 0 ? "text-red-700" : "text-mata-800"}`}>{sd.saldo}</td>
    </tr>
  );
  // Agrupado: mestres, guardiões e participantes, nessa ordem
  const GRUPOS = [
    { chave: "mestre", rotulo: "Mestres", Icone: Crown },
    { chave: "guardiao", rotulo: "Guardiões", Icone: Shield },
    { chave: "nenhuma", rotulo: "Participantes", Icone: UserRound },
  ] as const;
  const grupos = GRUPOS.map((g) => ({ ...g, itens: linhas.filter(([id]) => (usuarios.get(id)?.funcao ?? "nenhuma") === g.chave) })).filter((g) => g.itens.length);
  const cardSaldo = ([id, sd]: (typeof linhas)[number]) => (
    <li key={id} className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm"><Pessoa id={id} usuarios={usuarios} /></div>
        <div className="flex shrink-0 items-center gap-1.5">
        {agrupar && <div className="flex items-center gap-2 rounded-lg bg-stone-100 px-2.5 py-1.5 text-stone-700"><span className="text-xs font-medium">Usados</span><span className="text-lg leading-none font-semibold tabular-nums">{sd.utilizados}</span></div>}
        <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${sd.saldo < 0 ? "bg-red-50 text-red-700" : "bg-mata-50 text-mata-800"}`}>
          <span className="text-xs font-medium">Saldo</span><span className="text-lg leading-none font-semibold tabular-nums">{sd.saldo}</span>
        </div>
        </div>
      </div>
      {!agrupar && <dl className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-1.5 rounded-lg bg-stone-50 px-3 py-2 text-xs">
        {[{ titulo: "Disponíveis", valor: sd.disponiveis }, { titulo: "Aguardando", valor: sd.bloqueados }, { titulo: "Usados", valor: sd.utilizados }, { titulo: "Em débito", valor: sd.debitos }].map(({ titulo, valor }) => (
          <div key={titulo} className="flex items-center justify-between gap-2"><dt className="text-stone-500">{titulo}</dt><dd className="font-semibold text-stone-800 tabular-nums">{valor}</dd></div>
        ))}
      </dl>}
    </li>
  );

  return (
    <>
    <CartoesResumo dados={resumo} />
    <div className="mb-3"><BuscaCreditos className="w-full sm:max-w-sm" /></div>
    <section className="cartao overflow-hidden p-0 sm:p-0">
      <div className="md:border-b border-[#dadde1] px-4"><AbasCreditos aba="saldos" q={q} /></div>
      <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-stone-500">{linhas.length} {linhas.length === 1 ? "pessoa" : "pessoas"}</p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link
            href={hrefSaldos(negativos, !agrupar)}
            aria-pressed={agrupar}
            className={"filtro-saldos-dark btn-secundario min-h-11 px-2 text-xs sm:text-sm " + (agrupar ? "border-mata-300! bg-mata-50! text-mata-700!" : "")}
          >
            <Users size={15} aria-hidden /> {agrupar ? "Desagrupar" : "Agrupar por função"}
          </Link>
          <Link href={hrefSaldos(!negativos, agrupar)} aria-pressed={negativos} className={`filtro-saldos-dark btn-secundario min-h-11 px-2 text-xs sm:text-sm ${negativos ? "border-red-200! bg-red-50! text-red-700!" : ""}`}>
            {negativos ? "Mostrar todos" : "Só saldo negativo"}
          </Link>
        </div>
      </div>
      <ul className="divide-y divide-stone-300/80 lg:hidden" aria-label="Saldos por pessoa">
        {linhas.length ? (agrupar ? grupos.map((g) => <li key={g.chave}><h2 className="flex items-center gap-2 border-y border-mata-200/50 bg-mata-100/60 px-4 py-2.5 text-base font-semibold text-mata-800"><g.Icone size={18} aria-hidden />{g.rotulo} <span className="font-medium tabular-nums">({g.itens.length})</span></h2><ul className="divide-y divide-stone-300/80">{g.itens.map(cardSaldo)}</ul></li>) : linhas.map(cardSaldo)) : <li className="px-4 py-10 text-center text-sm text-stone-500">{q ? "Nenhuma pessoa encontrada." : negativos ? "Ninguém com saldo negativo." : "Nenhum saldo registrado ainda."}</li>}
      </ul>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium sm:px-6">Pessoa</th>
              <th className="px-3 py-3 text-right font-medium">Disponíveis</th>
              <th className="px-3 py-3 text-right font-medium">Aguardando</th>
              <th className="px-3 py-3 text-right font-medium">Usados</th>
              <th className="px-3 py-3 text-right font-medium">Em débito</th>
              <th className="px-5 py-3 text-right font-medium sm:px-6">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length ? (agrupar ? grupos.map((g) => (
              <Fragment key={g.chave}>
                <tr className="border-y border-mata-200/50 bg-mata-100/60">
                  <th colSpan={6} scope="colgroup" className="px-5 py-2.5 text-left text-base font-semibold text-mata-800 sm:px-6">
                    <span className="flex items-center gap-2"><g.Icone size={18} aria-hidden />{g.rotulo} <span className="font-medium tabular-nums">({g.itens.length})</span></span>
                  </th>
                </tr>
                {g.itens.map(linhaPessoa)}
              </Fragment>
            )) : linhas.map(linhaPessoa)) : (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">{q ? "Ninguém encontrado para “" + q + "”." : negativos ? "Ninguém com saldo negativo." : "Nenhum saldo registrado ainda."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
    </>
  );
}

async function AbaDebitos({ q }: { q: string }) {
  const [{ debitos: todosDebitos, saldos }, usuarios] = await Promise.all([saldosEDebitos(), mapaUsuarios()]);
  const debitos = q ? todosDebitos.filter((d) => casaBusca(q, usuarios.get(d.usuarioId)?.nome ?? "")) : todosDebitos;
  return (
    <>
      <p className="mb-4 max-w-3xl text-sm leading-relaxed text-stone-500">
        Participações sem crédito ou contribuição resolvida em rituais já iniciados. Use um crédito disponível ou abra o ritual para resolver a contribuição.
      </p>
      <div className="mb-3"><BuscaCreditos className="w-full sm:max-w-sm" /></div>
      <section className="cartao overflow-hidden p-0 sm:p-0">
        <div className="md:border-b border-[#dadde1] px-4"><AbasCreditos aba="debitos" q={q} /></div>
        <div className="border-b border-stone-100 px-4 py-3 lg:hidden"><h2 className="text-sm font-semibold text-stone-800">Débitos <span className="ml-1 font-normal text-stone-500">· {debitos.length}</span></h2></div>
        <ul className="divide-y divide-stone-300/80 lg:hidden" aria-label="Participações em débito">
          {debitos.length ? debitos.map((d) => {
            const disp = saldos.get(d.usuarioId)?.disponiveis ?? 0;
            return <li key={d.inscricaoId} className="space-y-2.5 px-4 py-3">
              <div className="text-sm"><Pessoa id={d.usuarioId} usuarios={usuarios} /></div>
              <Link href={`/admin/eventos/${d.eventoId}`} className="block rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium leading-snug text-stone-800 hover:bg-stone-100">Ritual{d.ritualNumero != null ? ` Nº ${d.ritualNumero}` : ""} · {d.titulo}<span className="mt-0.5 block text-xs font-normal text-stone-500">{dataCurta(d.data)} · Ver ritual →</span></Link>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1 text-xs leading-snug"><p className="font-medium text-amber-800">{d.pagamento === "na_hora" ? "Contribuição na hora" : "Contribuição pendente"}</p><p className="text-stone-600">{disp} {disp === 1 ? "crédito disponível" : "créditos disponíveis"}</p></div>
                <div className="shrink-0 [&>button]:min-h-11 [&>button]:px-3.5 [&>button]:text-xs"><QuitarDebito inscricaoId={d.inscricaoId} temCredito={disp > 0} /></div>
              </div>
            </li>;
          }) : <li className="px-4 py-10 text-center text-sm text-stone-500">{q ? "Nenhum débito encontrado." : "Nenhuma participação em débito."}</li>}
        </ul>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Pessoa</th>
                <th className="px-3 py-3 font-medium">Ritual</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Contribuição</th>
                <th className="px-3 py-3 text-right font-medium">Créditos dela</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">Ação</th>
              </tr>
            </thead>
            <tbody>
              {debitos.length ? debitos.map((d) => {
                const disp = saldos.get(d.usuarioId)?.disponiveis ?? 0;
                return (
                  <tr key={d.inscricaoId} className="border-t border-stone-100 transition hover:bg-stone-50/70">
                    <td className="px-5 py-2.5 sm:px-6"><Pessoa id={d.usuarioId} usuarios={usuarios} /></td>
                    <td className="px-3 py-2.5"><Link href={`/admin/eventos/${d.eventoId}`} className="text-stone-700 hover:text-mata-700 hover:underline">{d.titulo}</Link></td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-stone-500 tabular-nums">{dataCurta(d.data)}</td>
                    <td className="px-3 py-2.5 text-stone-500">{d.pagamento === "na_hora" ? "Na hora" : "Pendente"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{disp}</td>
                    <td className="px-5 py-2.5 text-right sm:px-6"><QuitarDebito inscricaoId={d.inscricaoId} temCredito={disp > 0} /></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">{q ? "Nenhum débito encontrado para “" + q + "”." : "Nenhuma participação sem crédito. 🎉"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

async function AbaHistorico({ filtros, paginas, q }: { filtros: { usuario: string; evento: string; pacote: string; de: string; ate: string }; paginas: number; q: string }) {
  const limite = PAGINA_HISTORICO * paginas;
  // Leituras leves: só os eventos de ritual (os únicos que usam crédito) e os pacotes sem a contagem de créditos
  const tiposRitual = (await listarTipos()).filter((t) => consomeCredito(t)).map((t) => t.$id);
  // Busca por nome: uma pessoa só vira filtro no banco; várias são filtradas depois, na lista carregada
  const idsBusca = q ? [...(await mapaUsuarios()).values()].filter((u) => casaBusca(q, u.nome)).map((u) => u.id) : null;
  const [movimentosBrutos, pessoas, usuarios, pacotesLista, rituais] = await Promise.all([
    historicoCreditos({ usuarioId: filtros.usuario || (idsBusca?.length === 1 ? idsBusca[0] : undefined), eventoId: filtros.evento || undefined, pacoteId: filtros.pacote || undefined, de: filtros.de || undefined, ate: filtros.ate || undefined, limite }),
    listarTodasAsPessoas(), mapaUsuarios(), listarPacotes(), tiposRitual.length ? listarEventos({ tipos: tiposRitual }) : Promise.resolve([]),
  ]);
  const movimentos = idsBusca ? movimentosBrutos.filter((m) => idsBusca.includes(m.usuario_id) || (!!m.para_usuario && idsBusca.includes(m.para_usuario))) : movimentosBrutos;
  const eventos = new Map(rituais.map((e) => [e.$id, e]));
  // Evento citado que não é (mais) ritual: busca só ele, pelo ID
  const faltam = [...new Set(movimentos.flatMap((m) => (m.evento_id && !eventos.has(m.evento_id) ? [m.evento_id] : [])))].slice(0, 100);
  if (faltam.length) for (const e of await listarEventos({ ids: faltam })) eventos.set(e.$id, e);
  const pacotes = new Map(pacotesLista.map((p) => [p.$id, p]));
  const maisUrl = (() => {
    const p = new URLSearchParams({ aba: "historico", paginas: String(paginas + 1) });
    for (const [k, v] of Object.entries(filtros)) if (v) p.set(k, v);
    if (q) p.set("q", q);
    return `/admin/creditos?${p}`;
  })();
  const temMais = movimentosBrutos.length >= limite && paginas < 10;

  const nome = (id: string | null) => (id ? (usuarios.get(id)?.nome ?? "Usuário removido") : "");
  const linhas = movimentos.map((m) => {
    const e = m.evento_id ? eventos.get(m.evento_id) : undefined;
    const p = m.pacote_id ? pacotes.get(m.pacote_id) : undefined;
    return {
      m, evento: e ? `${e.titulo} (${dataCurta(e.data)})` : "", pacote: p ? `${p.nome ?? "Pacote"} (${p.quantidade})` : "",
      detalhe: [m.acao === "cessao" ? `${nome(m.de_usuario)} → ${nome(m.para_usuario)}` : "", m.observacao ?? ""].filter(Boolean).join(" · "),
    };
  });

  return (
    <>
      {/* Busca à esquerda e Exportar CSV à direita, fora e acima do cartão */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <BuscaCreditos className="w-full sm:max-w-sm sm:flex-1" />
        <div className="max-lg:w-full max-lg:[&>button]:w-full">
        <ExportarHistoricoCsv
          nomeArquivo="historico-creditos.csv"
          cabecalho={["Data", "Ação", "Pessoa", "Ritual", "Pacote", "Feito por", "Detalhe"]}
          linhas={linhas.map(({ m, evento, pacote, detalhe }) => [dataHora(m.$createdAt), ROTULO_ACAO[m.acao], nome(m.usuario_id), evento, pacote, nome(m.por), detalhe])}
        />
        </div>
      </div>
    <section className="cartao overflow-hidden p-0 sm:p-0">
      <CabecalhoComFiltros
        abas={<AbasCreditos aba="historico" q={q} />}
        filtros={
          <FiltrosHistorico
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
            eventos={rituais.map((e) => ({ id: e.$id, titulo: `${e.titulo} (${dataCurta(e.data)})` })).reverse()}
            pacotes={pacotesLista.slice(0, 200).map((p) => ({ id: p.$id, titulo: `${nome(p.usuario_id)} · ${p.nome ?? "Pacote"}` }))}
          />
        }
      />

      {/* Celular: um cartão por movimentação (sem rolagem lateral) */}
      <ul className="divide-y divide-stone-300/80 lg:hidden">
        {linhas.length ? linhas.map(({ m, evento, pacote, detalhe }) => (
          <li key={m.$id} className="space-y-2 px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-semibold text-stone-900">{ROTULO_ACAO[m.acao]}</p>
              <time dateTime={m.$createdAt} className="text-xs text-stone-500 tabular-nums">{dataHora(m.$createdAt)}</time>
            </div>
            <div className="text-sm"><Pessoa id={m.usuario_id} usuarios={usuarios} /></div>
            {detalhe && <p className="text-xs break-words text-stone-500">{detalhe}</p>}
            {(m.evento_id || pacote || m.por) && (
              <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-snug [&>dt]:text-stone-500">
                {m.evento_id && (<><dt className="text-stone-400">Ritual</dt><dd className="min-w-0 break-words text-stone-700"><Link href={`/admin/eventos/${m.evento_id}`} className="hover:text-mata-700 hover:underline">{evento || "Evento removido"}</Link></dd></>)}
                {pacote && (<><dt className="text-stone-400">Pacote</dt><dd className="min-w-0 break-words text-stone-700">{pacote}</dd></>)}
                {m.por && (<><dt className="text-stone-400">Feito por</dt><dd className="min-w-0 break-words text-stone-700">{nome(m.por)}</dd></>)}
              </dl>
            )}
          </li>
        )) : (
          <li className="px-4 py-10 text-center text-sm text-stone-400"><ListChecks size={16} className="mr-1 inline" aria-hidden />Nenhuma movimentação para este filtro.</li>
        )}
      </ul>

      {/* Desktop (a partir de 1024 px): tabela (rolagem lateral só se faltar espaço) */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium sm:px-6">Pessoa</th>
              <th className="px-3 py-3 font-medium">Ação</th>
              <th className="px-3 py-3 font-medium">Ritual</th>
              <th className="px-3 py-3 font-medium">Pacote</th>
              <th className="px-3 py-3 font-medium">Feito por</th>
              <th className="px-5 py-3 font-medium whitespace-nowrap sm:px-6">Data</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length ? linhas.map(({ m, evento, pacote, detalhe }) => (
              <tr key={m.$id} className="border-t border-stone-100 align-top transition hover:bg-stone-50/70">
                <td className="px-5 py-2.5 whitespace-nowrap sm:px-6"><Pessoa id={m.usuario_id} usuarios={usuarios} /></td>
                <td className="px-3 py-2.5 font-medium text-stone-800">{ROTULO_ACAO[m.acao]}{detalhe && <span className="block text-xs font-normal text-stone-500">{detalhe}</span>}</td>
                <td className="px-3 py-2.5 text-stone-600">{m.evento_id ? <Link href={`/admin/eventos/${m.evento_id}`} className="hover:text-mata-700 hover:underline">{evento || "Evento removido"}</Link> : <span className="text-stone-300">—</span>}</td>
                <td className="px-3 py-2.5 text-stone-600">{pacote || <span className="text-stone-300">—</span>}</td>
                <td className="px-3 py-2.5 text-stone-500">{nome(m.por)}</td>
                <td className="px-5 py-2.5 whitespace-nowrap tabular-nums sm:px-6">
                  <span className="block text-stone-600">{dataHora(m.$createdAt).split(" às ")[0]}</span>
                  <span className="block text-xs text-stone-400">{dataHora(m.$createdAt).split(" às ")[1]}</span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6"><ListChecks size={16} className="mr-1 inline" aria-hidden />Nenhuma movimentação para este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {temMais && (
        <div className="flex justify-center border-t border-stone-100 px-4 py-4">
          <Link href={maisUrl} scroll={false} className="btn-secundario h-10 text-sm">Mostrar mais {PAGINA_HISTORICO}</Link>
        </div>
      )}
    </section>
    </>
  );
}

/**
 * Créditos de um pacote: barra fina segmentada (usado azul, disponível verde, aguardando pagamento âmbar) e a
 * contagem em texto, sem depender só da cor.
 */
function IndicadorCreditos({ p }: { p: PacoteResumo }) {
  if (p.situacao === "cancelado") return <span className="text-[#8a8d91]">—</span>;
  const total = Math.max(p.quantidade, p.disponiveis + p.utilizados + p.bloqueados) || 1;
  // Um segmento por crédito: usados, disponíveis, aguardando pagamento e, se sobrar, vazios
  const estados = [
    ...Array.from({ length: p.utilizados }, () => ({ rotulo: "Usado", cor: "bg-mata-600" })),
    ...Array.from({ length: p.disponiveis }, () => ({ rotulo: "Disponível", cor: "bg-[#31a24c]" })),
    ...Array.from({ length: p.bloqueados }, () => ({ rotulo: "Aguardando pagamento", cor: "bg-[#f7b928]" })),
  ];
  const segmentos = Array.from({ length: total }, (_, i) => estados[i] ?? { rotulo: "Sem estado", cor: "bg-[#e4e6eb]" });
  const resumo = [
    p.disponiveis + " de " + total + (p.disponiveis === 1 ? " disponível" : " disponíveis"),
    p.utilizados + (p.utilizados === 1 ? " usado" : " usados"),
    p.bloqueados ? p.bloqueados + " aguardando" : "",
    p.cedidos ? p.cedidos + (p.cedidos === 1 ? " cedido" : " cedidos") : "",
  ].filter(Boolean);
  return (
    <div className="min-w-36" role="img" aria-label={resumo.join(", ")}>
      <div className={"flex h-2 w-full " + (total > 30 ? "gap-px" : "gap-0.5")}>
        {segmentos.map((g, i) => <span key={i} title={"Crédito " + (i + 1) + ": " + g.rotulo} className={(total < 5 ? "h-full w-1/5 shrink-0 " : "h-full min-w-0 flex-1 ") + "rounded-full " + g.cor} />)}
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#65676b] tabular-nums">
        <span className="whitespace-nowrap"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#31a24c]" aria-hidden /><strong className="font-semibold text-[#1c1e21]">{p.disponiveis}</strong> de {total}</span>
        <span className="whitespace-nowrap"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-mata-600" aria-hidden /><strong className="font-semibold text-[#1c1e21]">{p.utilizados}</strong> {p.utilizados === 1 ? "usado" : "usados"}</span>
        {p.bloqueados > 0 && <span className="whitespace-nowrap"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f7b928]" aria-hidden /><strong className="font-semibold text-[#1c1e21]">{p.bloqueados}</strong> aguardando</span>}
        {p.cedidos > 0 && <span className="whitespace-nowrap">{p.cedidos} {p.cedidos === 1 ? "cedido" : "cedidos"}</span>}
      </p>
    </div>
  );
}
