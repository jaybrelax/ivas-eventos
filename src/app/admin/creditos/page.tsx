import Link from "next/link";
import { AlertTriangle, CalendarDays, Clock, FileImage, History, ListChecks, Package, Ticket, Users, Wallet } from "lucide-react";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import {
  historicoCreditos, listarPacotes, listarPlanos, PAGINA_HISTORICO, resumoGeral, saldosDeTodos, saldosEDebitos, type PacoteResumo,
} from "@/lib/creditos";
import { consomeCredito } from "@/lib/creditos-regras";
import { ROTULO_ACAO, ROTULO_PACOTE } from "@/lib/creditos-rotulos";
import { listarEventos, listarTipos } from "@/lib/data";
import { dataCurta } from "@/lib/format";
import { listarTodasAsPessoas, mapaUsuarios } from "@/lib/usuarios";
import { Titulo } from "@/components/Titulo";
import { Avatar } from "@/components/Avatar";
import { AcoesPacote, ExportarHistoricoCsv, FiltrosHistorico, LancarPacote, QuitarDebito } from "./Cliente";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso)).replace(",", " às");

const ABAS = [
  { chave: "pacotes", rotulo: "Pacotes", Icone: Package },
  { chave: "saldos", rotulo: "Saldos", Icone: Users },
  { chave: "debitos", rotulo: "Débitos", Icone: AlertTriangle },
  { chave: "historico", rotulo: "Histórico", Icone: History },
] as const;
type Aba = (typeof ABAS)[number]["chave"];

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Painel dos pacotes de créditos: compras, saldo de cada pessoa, débitos (participou sem crédito) e histórico auditável. */
export default async function Creditos({ searchParams }: PageProps<"/admin/creditos">) {
  await exigir(PODE.editarEventos);
  const sp = await searchParams;
  const aba: Aba = (ABAS.some((a) => a.chave === str(sp.aba)) ? str(sp.aba) : "pacotes") as Aba;

  return (
    <>
      <Titulo sobre="Relatório" titulo="Créditos" subtitulo="Pacotes vendidos, saldo de cada pessoa, participações sem crédito e histórico de uso." />
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-stone-200/80 pb-3" aria-label="Seções dos créditos">
        {ABAS.map(({ chave, rotulo, Icone }) => (
          <Link
            key={chave}
            href={`/admin/creditos?aba=${chave}`}
            aria-current={aba === chave ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${aba === chave ? "bg-mata-800 text-white shadow-cartao" : "text-stone-600 hover:bg-stone-100"}`}
          >
            <Icone size={15} aria-hidden /> {rotulo}
          </Link>
        ))}
      </nav>
      {aba === "pacotes" && <AbaPacotes />}
      {aba === "saldos" && <AbaSaldos negativos={str(sp.negativos) === "1"} />}
      {aba === "debitos" && <AbaDebitos />}
      {aba === "historico" && <AbaHistorico filtros={{ usuario: str(sp.usuario), evento: str(sp.evento), pacote: str(sp.pacote), de: str(sp.de), ate: str(sp.ate) }} paginas={Math.min(10, Math.max(1, Number(str(sp.paginas)) || 1))} />}
    </>
  );
}

function Kpi({ rotulo, valor, Icone, cor }: { rotulo: string; valor: string | number; Icone: typeof Wallet; cor: string }) {
  return (
    <div className="cartao flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cor}`}><Icone size={20} /></span>
      <div className="min-w-0">
        <p className="truncate text-[13px] text-stone-500">{rotulo}</p>
        <p className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</p>
      </div>
    </div>
  );
}

function Pessoa({ id, usuarios }: { id: string; usuarios: Awaited<ReturnType<typeof mapaUsuarios>> }) {
  const u = usuarios.get(id);
  return (
    <Link href={`/admin/participantes/${id}`} className="flex items-center gap-2.5 hover:underline">
      <Avatar nome={u?.nome ?? "Usuário removido"} foto={u?.foto ?? null} tamanho={26} className="ring-0" />
      <span className="font-medium text-stone-800">{u?.nome ?? "Usuário removido"}</span>
    </Link>
  );
}

async function AbaPacotes() {
  // Uma leitura só da tabela de créditos para pacotes, saldos e débitos
  const [{ pacotes, saldos, debitos }, planos, pessoas, usuarios] = await Promise.all([
    resumoGeral(), listarPlanos(true), listarTodasAsPessoas(), mapaUsuarios(),
  ]);
  const pagos = pacotes.filter((p) => p.situacao === "pago");
  const aguardando = pacotes.filter((p) => p.situacao === "informado" || p.situacao === "pendente");
  const disponiveis = [...saldos.values()].reduce((s, x) => s + x.disponiveis, 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi rotulo="Recebido em pacotes" valor={formatoReal(pagos.reduce((s, p) => s + (p.valor ?? 0), 0))} Icone={Wallet} cor="bg-emerald-50 text-emerald-600" />
        <Kpi rotulo="Aguardando confirmação" valor={`${aguardando.length} · ${formatoReal(aguardando.reduce((s, p) => s + (p.valor ?? 0), 0))}`} Icone={Clock} cor="bg-amber-50 text-amber-600" />
        <Kpi rotulo="Créditos disponíveis" valor={disponiveis} Icone={Ticket} cor="bg-violet-50 text-violet-600" />
        <Kpi rotulo="Participações sem crédito" valor={debitos.length} Icone={AlertTriangle} cor="bg-red-50 text-red-600" />
      </div>

      <div className="mb-4 flex justify-end">
        <LancarPacote
          planos={planos.map((p) => ({ id: p.$id, nome: p.nome, quantidade: p.quantidade, valor: p.valor }))}
          pessoas={pessoas.filter((p) => !usuarios.get(p.id)?.mock).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
        />
      </div>

      <section className="cartao overflow-hidden p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Pessoa</th>
                <th className="px-3 py-3 font-medium">Pacote</th>
                <th className="px-3 py-3 text-right font-medium">Valor</th>
                <th className="px-3 py-3 font-medium">Créditos</th>
                <th className="px-3 py-3 font-medium">Situação</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacotes.length ? pacotes.map((p) => (
                <tr key={p.$id} className="border-t border-stone-100 align-top transition hover:bg-stone-50/70">
                  <td className="px-5 py-2.5 sm:px-6"><Pessoa id={p.usuario_id} usuarios={usuarios} /></td>
                  <td className="px-3 py-2.5 text-stone-700">
                    <span className="flex items-center gap-1.5">
                      <Ticket size={15} className="shrink-0 text-violet-600" aria-hidden />
                      <span>{p.nome ?? "Pacote"} <span className="text-stone-400">· {p.quantidade}</span></span>
                    </span>
                    {p.observacao && <p className="text-xs text-stone-500">{p.observacao}</p>}
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                      <CalendarDays size={12} className="shrink-0" aria-hidden />
                      <span>{dataHora(p.$createdAt)}{p.origem === "equipe" ? ` · lançado por ${(p.criado_por && usuarios.get(p.criado_por)?.nome) || "a equipe"}` : ""}</span>
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.valor != null ? formatoReal(p.valor) : <span className="text-stone-300">—</span>}</td>
                  <td className="px-3 py-2.5"><IndicadorCreditos p={p} /></td>
                  <td className="px-3 py-2.5">
                    <span className={`chip ${ROTULO_PACOTE[p.situacao].cor}`}>{ROTULO_PACOTE[p.situacao].rotulo}</span>
                    {p.comprovante_file_id && (
                      <a href={`/api/comprovante/${p.comprovante_file_id}`} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs text-mata-700 hover:underline">
                        <FileImage size={13} aria-hidden /> Comprovante
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-2.5 sm:px-6"><AcoesPacote pacoteId={p.$id} situacao={p.situacao} quantidade={p.quantidade} dados={{ nome: p.nome ?? "Pacote", valor: p.valor, observacao: p.observacao, comprovante: p.comprovante_file_id }} /></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">Nenhum pacote ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

async function AbaSaldos({ negativos }: { negativos: boolean }) {
  const [saldos, usuarios] = await Promise.all([saldosDeTodos(), mapaUsuarios()]);
  const linhas = [...saldos.entries()]
    .filter(([, s]) => s.disponiveis || s.bloqueados || s.utilizados || s.debitos)
    .filter(([, s]) => !negativos || s.saldo < 0)
    .sort((a, b) => a[1].saldo - b[1].saldo || (usuarios.get(a[0])?.nome ?? "").localeCompare(usuarios.get(b[0])?.nome ?? "", "pt-BR"));

  return (
    <section className="cartao overflow-hidden p-0 sm:p-0">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3 sm:px-6">
        <p className="text-sm text-stone-500">{linhas.length} {linhas.length === 1 ? "pessoa" : "pessoas"}</p>
        <Link href={negativos ? "/admin/creditos?aba=saldos" : "/admin/creditos?aba=saldos&negativos=1"} className="btn-secundario h-9 px-3 text-sm">
          {negativos ? "Mostrar todos" : "Só saldo negativo"}
        </Link>
      </div>
      <div className="overflow-x-auto">
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
            {linhas.length ? linhas.map(([id, s]) => (
              <tr key={id} className="border-t border-stone-100 transition hover:bg-stone-50/70">
                <td className="px-5 py-2.5 sm:px-6"><Pessoa id={id} usuarios={usuarios} /></td>
                <td className="px-3 py-2.5 text-right tabular-nums">{s.disponiveis}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{s.bloqueados || "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{s.utilizados || "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{s.debitos || "—"}</td>
                <td className={`px-5 py-2.5 text-right text-base font-semibold tabular-nums sm:px-6 ${s.saldo < 0 ? "text-red-700" : "text-mata-800"}`}>{s.saldo}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">{negativos ? "Ninguém com saldo negativo." : "Nenhum saldo registrado ainda."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function AbaDebitos() {
  const [{ debitos, saldos }, usuarios] = await Promise.all([saldosEDebitos(), mapaUsuarios()]);
  return (
    <>
      <p className="mb-4 max-w-3xl text-sm text-stone-500">
        Pessoas inscritas (vaga confirmada) em rituais que já começaram, sem crédito e sem contribuição resolvida. Quite com um crédito da pessoa, ou abra o evento para confirmar ou isentar a contribuição avulsa — o débito some sozinho.
      </p>
      <section className="cartao overflow-hidden p-0 sm:p-0">
        <div className="overflow-x-auto">
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
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">Nenhuma participação sem crédito. 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

async function AbaHistorico({ filtros, paginas }: { filtros: { usuario: string; evento: string; pacote: string; de: string; ate: string }; paginas: number }) {
  const limite = PAGINA_HISTORICO * paginas;
  // Leituras leves: só os eventos de ritual (os únicos que usam crédito) e os pacotes sem a contagem de créditos
  const tiposRitual = (await listarTipos()).filter((t) => consomeCredito(t)).map((t) => t.$id);
  const [movimentos, pessoas, usuarios, pacotesLista, rituais] = await Promise.all([
    historicoCreditos({ usuarioId: filtros.usuario || undefined, eventoId: filtros.evento || undefined, pacoteId: filtros.pacote || undefined, de: filtros.de || undefined, ate: filtros.ate || undefined, limite }),
    listarTodasAsPessoas(), mapaUsuarios(), listarPacotes(), tiposRitual.length ? listarEventos({ tipos: tiposRitual }) : Promise.resolve([]),
  ]);
  const eventos = new Map(rituais.map((e) => [e.$id, e]));
  // Evento citado que não é (mais) ritual: busca só ele, pelo ID
  const faltam = [...new Set(movimentos.flatMap((m) => (m.evento_id && !eventos.has(m.evento_id) ? [m.evento_id] : [])))].slice(0, 100);
  if (faltam.length) for (const e of await listarEventos({ ids: faltam })) eventos.set(e.$id, e);
  const pacotes = new Map(pacotesLista.map((p) => [p.$id, p]));
  const maisUrl = (() => {
    const p = new URLSearchParams({ aba: "historico", paginas: String(paginas + 1) });
    for (const [k, v] of Object.entries(filtros)) if (v) p.set(k, v);
    return `/admin/creditos?${p}`;
  })();
  const temMais = movimentos.length >= limite && paginas < 10;

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
    <section className="cartao overflow-hidden p-0 sm:p-0">
      <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <FiltrosHistorico
          pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
          eventos={rituais.map((e) => ({ id: e.$id, titulo: `${e.titulo} (${dataCurta(e.data)})` })).reverse()}
          pacotes={pacotesLista.slice(0, 200).map((p) => ({ id: p.$id, titulo: `${nome(p.usuario_id)} · ${p.nome ?? "Pacote"}` }))}
        />
        <div className="shrink-0 max-lg:[&>button]:w-full">
        <ExportarHistoricoCsv
          nomeArquivo="historico-creditos.csv"
          cabecalho={["Data", "Ação", "Pessoa", "Ritual", "Pacote", "Feito por", "Detalhe"]}
          linhas={linhas.map(({ m, evento, pacote, detalhe }) => [dataHora(m.$createdAt), ROTULO_ACAO[m.acao], nome(m.usuario_id), evento, pacote, nome(m.por), detalhe])}
        />
        </div>
      </div>

      {/* Celular: um cartão por movimentação (sem rolagem lateral) */}
      <ul className="divide-y divide-stone-100 lg:hidden">
        {linhas.length ? linhas.map(({ m, evento, pacote, detalhe }) => (
          <li key={m.$id} className="space-y-2 px-4 py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="font-semibold text-stone-900">{ROTULO_ACAO[m.acao]}</p>
              <time dateTime={m.$createdAt} className="text-xs text-stone-400 tabular-nums">{dataHora(m.$createdAt)}</time>
            </div>
            <div className="text-sm"><Pessoa id={m.usuario_id} usuarios={usuarios} /></div>
            {detalhe && <p className="text-xs break-words text-stone-500">{detalhe}</p>}
            {(m.evento_id || pacote || m.por) && (
              <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
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
  );
}

/**
 * Indicador dos créditos de um pacote: uma bolinha por crédito (usado = cinza, disponível = verde,
 * aguardando pagamento = âmbar vazado). Pacotes grandes viram uma barra empilhada.
 */
function IndicadorCreditos({ p }: { p: PacoteResumo }) {
  if (p.situacao === "cancelado") return <span className="text-stone-300">—</span>;
  const total = Math.max(p.quantidade, p.disponiveis + p.utilizados + p.bloqueados);
  const resumo = [
    `${p.disponiveis} ${p.disponiveis === 1 ? "disponível" : "disponíveis"}`,
    `${p.utilizados} ${p.utilizados === 1 ? "usado" : "usados"}`,
    p.bloqueados ? `${p.bloqueados} aguardando` : "",
    p.cedidos ? `${p.cedidos} ${p.cedidos === 1 ? "cedido" : "cedidos"}` : "",
  ].filter(Boolean);
  const contagens = [
    { n: p.disponiveis, rotulo: "disponíveis", singular: "disponível", cor: "text-emerald-700", sempre: true },
    { n: p.utilizados, rotulo: "usados", singular: "usado", cor: "text-stone-700", sempre: true },
    { n: p.bloqueados, rotulo: "aguardando", singular: "aguardando", cor: "text-amber-600", sempre: false },
    { n: p.cedidos, rotulo: "cedidos", singular: "cedido", cor: "text-sky-700", sempre: false },
  ];
  const grupos = [
    { n: p.utilizados, rotulo: "Usado", dot: "bg-stone-400", barra: "bg-stone-400" },
    { n: p.disponiveis, rotulo: "Disponível", dot: "bg-emerald-500", barra: "bg-emerald-500" },
    { n: p.bloqueados, rotulo: "Aguardando pagamento", dot: "border-2 border-amber-400 bg-white", barra: "bg-amber-300" },
  ];
  return (
    <div className="min-w-32" role="img" aria-label={resumo.join(", ")}>
      {total <= 20 ? (
        <div className="flex flex-wrap gap-1">
          {grupos.flatMap((g) => Array.from({ length: g.n }, (_, i) => (
            <span key={`${g.rotulo}-${i}`} title={g.rotulo} className={`h-3 w-3 rounded-full ${g.dot}`} />
          )))}
        </div>
      ) : (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
          {grupos.map((g) => g.n > 0 && <span key={g.rotulo} title={`${g.rotulo}: ${g.n}`} className={g.barra} style={{ width: `${(g.n / total) * 100}%` }} />)}
        </div>
      )}
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-stone-500 tabular-nums">
        {contagens.map((c) => c.n > 0 || c.sempre ? (
          <span key={c.rotulo} className="whitespace-nowrap">
            <strong className={`text-base font-bold ${c.cor}`}>{c.n}</strong> {c.n === 1 ? c.singular : c.rotulo}
          </span>
        ) : null)}
      </p>
    </div>
  );
}
