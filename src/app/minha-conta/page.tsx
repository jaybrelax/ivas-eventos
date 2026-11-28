import type { Metadata } from "next";
import Link from "next/link";
import { Gift, History, Receipt, Ticket } from "lucide-react";
import { Star } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { urlImagem } from "@/lib/links";
import { creditosESaldo, destinatariosRecentesCessao, historicoCreditos, pacotesComResumo, listarPlanos, saldoDoUsuario, type CreditoItem } from "@/lib/creditos";
import { resumoBonusAniversario } from "@/lib/bonus-aniversario";
import { ROTULO_ACAO, ROTULO_CREDITO, ROTULO_PACOTE } from "@/lib/creditos-rotulos";
import { getDadosInstituto, getInstituto, listarEventos } from "@/lib/data";
import { lerPreferenciasCreditos } from "@/lib/creditos-preferencias";
import { limiteCessao } from "@/lib/creditos-regras";
import { mapaUsuarios } from "@/lib/usuarios";
import { dataCurta, dataPorExtenso, formatarIdRitual } from "@/lib/format";
import { inscricoesComEventos, type ItemInscricao } from "@/lib/inscricoes";
import { CabecalhoPublico } from "@/components/publico/CabecalhoPublico";
import { RodapePublico } from "@/components/publico/RodapePublico";
import { ProximoRitualCard } from "@/components/publico/ProximoRitualCard";
import { CancelarParticipacao } from "@/components/publico/CancelarParticipacao";
import { BotaoComprovante } from "./BotaoComprovante";
import { CederCreditos, ComprarPacote, type PacoteCedivel } from "./CreditosCliente";
import { AbasMinhaConta, type AbaMinhaConta } from "./AbasMinhaConta";

export const metadata: Metadata = { title: "Minha conta" };

const PAGAMENTO: Record<ItemInscricao["pagamento"], { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pagamento pendente", cor: "bg-amber-50 text-amber-700" },
  informado: { rotulo: "Pagamento informado", cor: "bg-amber-50 text-amber-700" },
  pago: { rotulo: "Contribuiu", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
  credito: { rotulo: "Crédito", cor: "bg-violet-50 text-violet-700" },
  aniversario: { rotulo: "Bônus de aniversário", cor: "bg-fuchsia-50 text-fuchsia-800" },
};

const SITUACAO: Record<ItemInscricao["situacao"], { rotulo: string; cor: string }> = {
  confirmada: { rotulo: "Inscrição confirmada", cor: "bg-mata-100 text-mata-800" },
  espera: { rotulo: "Lista de espera", cor: "bg-amber-50 text-amber-700" },
  cancelada: { rotulo: "Cancelado", cor: "bg-stone-100 text-stone-500" },
};

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function MinhaContaPage({ searchParams }: PageProps<"/minha-conta">) {
  const u = await exigirSessao("/minha-conta");
  const sp = await searchParams;
  const abaBruta = String(sp?.aba ?? "proximos");
  const aba: AbaMinhaConta = abaBruta === "pagamentos" || abaBruta === "creditos" ? abaBruta : "proximos";

  const [{ instituto, enderecos, telefones, redes, pix }, itens, conta, bonusAniversario] = await Promise.all([
    getDadosInstituto(),
    inscricoesComEventos(u.id),
    // Saldo aparece na aba Créditos e como aviso quando está negativo; se o banco dos créditos ainda não existe, a conta segue funcionando.
    // Na aba Créditos, saldo e lista saem de uma leitura só dos créditos da pessoa.
    aba === "creditos" ? creditosESaldo(u.id).catch(() => null)
      : aba === "proximos" ? saldoDoUsuario(u.id).then((saldo) => ({ saldo, creditos: [] })).catch(() => null)
      : Promise.resolve(null),
    aba === "proximos" ? resumoBonusAniversario(u).catch(() => null) : Promise.resolve(null),
  ]);
  const saldo = conta?.saldo ?? null;

  const proximos = itens.filter((i) => !i.passado && i.situacao !== "cancelada")
    .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`));
  const historico = itens.filter((i) => i.passado && i.situacao === "confirmada");
  const pagamentos = itens.filter((i) => i.temContribuicao);
  const totalPago = pagamentos.filter((i) => i.pagamento === "pago").reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalPendente = pagamentos.filter((i) => i.pagamento === "pendente" || i.pagamento === "informado" || i.pagamento === "na_hora").length;

  return (
    <div className="min-h-screen bg-fundo text-stone-900">
      <CabecalhoPublico instituto={instituto} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-ouro-600 uppercase">Minha conta</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Olá, {u.nome.split(" ")[0]}</h1>
        </header>

        <AbasMinhaConta aba={aba} />

        {aba === "proximos" && saldo && saldo.saldo < 0 && (
          <Link href="/minha-conta?aba=creditos" className="mb-4 block rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200 transition hover:bg-red-100/70">
            Seu saldo de créditos está negativo ({saldo.saldo}). Toque para ver e regularizar com a coordenação.
          </Link>
        )}

        {aba === "proximos" && <ProximoRitualCard usuarioId={u.id} />}

        {aba === "proximos" && bonusAniversario && (
          <section className={`mb-6 rounded-2xl border p-4 sm:p-5 ${bonusAniversario.disponivel ? "border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 via-violet-50 to-amber-50" : "border-violet-200 bg-violet-50/70"}`} aria-label="Bônus de aniversário">
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${bonusAniversario.disponivel ? "bg-fuchsia-600 text-white" : "bg-violet-600 text-white"}`}><Gift size={20} aria-hidden /></span>
              <div>
                <h2 className="font-semibold text-stone-900">{bonusAniversario.disponivel ? "Seu bônus de aniversário está disponível" : "Bônus de aniversário utilizado"}</h2>
                <p className="mt-0.5 text-sm text-stone-600">{bonusAniversario.disponivel ? `Use uma participação especial em qualquer ritual de ${bonusAniversario.mesNome}.` : `Sua participação especial de ${bonusAniversario.mesNome} já foi usada este ano.`}</p>
              </div>
            </div>
          </section>
        )}

        {aba === "proximos" && (
          <>
            <section aria-labelledby="titulo-proximas">
              <h2 id="titulo-proximas" className="mb-4 text-lg font-semibold tracking-tight text-stone-900">Inscrições confirmadas</h2>
              <Lista
                vazio="Você ainda não confirmou participação em nenhum ritual futuro."
                itens={proximos}
                mostrarPagamento
                cancelar
                ocultarSituacao
              />
            </section>

            <section id="historico" aria-labelledby="titulo-historico" className="mt-10 border-t border-stone-200/80 pt-7 sm:mt-12 sm:pt-8">
              <h2 id="titulo-historico" className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-stone-900">
                <History size={19} className="text-mata-700" aria-hidden /> Histórico de participações
              </h2>
              <Lista vazio="Nenhum ritual no seu histórico ainda." itens={historico} mostrarPagamento={false} historico />
            </section>
          </>
        )}

        {aba === "creditos" && saldo && (
          <AbaCreditos usuarioId={u.id} saldo={saldo} creditos={conta?.creditos ?? []} chavePix={pix.find((p) => p.padrao) ?? pix[0] ?? null} />
        )}
        {aba === "creditos" && !saldo && <p className="cartao text-center text-sm text-stone-400">Os créditos ainda não estão disponíveis. Tente de novo em instantes.</p>}

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
            <Lista vazio="Nenhuma contribuição registrada ainda." itens={pagamentos} mostrarPagamento />
          </div>
        )}
      </main>
      <RodapePublico instituto={instituto} enderecos={enderecos} telefones={telefones} redes={redes} apenasSocket />
    </div>
  );
}

function Lista({ itens, vazio, mostrarPagamento, cancelar = false, historico = false, ocultarSituacao = false }: { itens: ItemInscricao[]; vazio: string; mostrarPagamento: boolean; cancelar?: boolean; historico?: boolean; ocultarSituacao?: boolean }) {
  if (!itens.length) return <p className="cartao text-center text-sm text-stone-400">{vazio}</p>;
  return (
    <ul className="space-y-2.5">
      {itens.map((i) => (
        <li key={i.inscricaoId} className="cartao !p-4">
          {!ocultarSituacao && <div className="mb-3"><span className={`chip ${SITUACAO[i.situacao].cor}`}>{SITUACAO[i.situacao].rotulo}</span></div>}
          {historico && <Link href={`/minha-conta/participacao/${i.inscricaoId}`} className="mb-2 block text-base font-semibold leading-snug text-stone-900 hover:text-mata-700 hover:underline sm:hidden">{i.titulo}</Link>}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={historico ? `/minha-conta/participacao/${i.inscricaoId}` : i.url} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mata-900 ring-1 ring-stone-200 ${historico ? "sm:h-20 sm:w-20" : ""}`} aria-hidden tabIndex={-1}>
                {i.capa && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagem(i.capa, 160)} width={64} height={64} loading="lazy" decoding="async" alt="" className="h-full w-full object-cover" />
                )}
              </Link>
              <div className="min-w-0">
                <Link href={historico ? `/minha-conta/participacao/${i.inscricaoId}` : i.url} className={`font-semibold text-stone-900 hover:text-mata-700 hover:underline ${historico ? "hidden sm:inline" : ""}`}>{i.titulo}</Link>
                <p className="mt-0.5 text-sm text-stone-600">{dataPorExtenso(i.data)}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-stone-500">
                  {i.ritualNumero && (historico
                    ? <Link href={i.url} className="font-semibold tracking-wide text-violet-800 hover:underline">Ritual {formatarIdRitual(i.ritualNumero, null, null)}</Link>
                    : <span className="font-semibold tracking-wide text-violet-800">Ritual {formatarIdRitual(i.ritualNumero, null, null)}</span>)}
                  {i.ritualNumero && <span aria-hidden>·</span>}
                  <span>{dataCurta(i.data).slice(-4)}</span><span aria-hidden>·</span><span>{i.hora}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                  {mostrarPagamento && i.temContribuicao && <span className={`chip ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>}
                </div>
              </div>
            </div>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              {mostrarPagamento && i.temContribuicao && (
                <span className={`chip ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>
              )}
            </div>
          </div>
          {historico && <Link href={`/minha-conta/participacao/${i.inscricaoId}`} className="mt-3 ml-auto flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#4c1d95,#7c3aed,#a855f7,#4c1d95)] bg-[length:260%_100%] px-4 text-sm font-semibold text-white shadow-md animate-gradiente-suave transition-transform hover:-translate-y-0.5 sm:w-fit"><Star size={17} strokeWidth={2.4} /> Deixe sua avaliação</Link>}
          {((mostrarPagamento && i.temContribuicao) || (cancelar && i.podeCancelar)) && (
            <div className="mt-3 flex flex-col items-stretch gap-2 text-sm text-stone-500">
              {mostrarPagamento && i.temContribuicao && i.pagamento === "credito" && <span>Participação paga com 1 crédito</span>}
              {mostrarPagamento && i.temContribuicao && i.pagamento === "aniversario" && <span>Participação confirmada com bônus de aniversário</span>}
              {mostrarPagamento && i.temContribuicao && (i.valor != null || i.comprovante || i.situacao === "confirmada" && ["pendente", "na_hora", "informado"].includes(i.pagamento)) && (
                <div className="flex w-full flex-col items-stretch gap-2.5 sm:ml-auto sm:w-fit sm:items-end sm:pr-1">
                  {i.pagamento !== "credito" && i.pagamento !== "aniversario" && i.valor != null && <span className="text-sm font-medium text-stone-600">Contribuição: <strong className="text-stone-900">{formatoReal(i.valor)}</strong></span>}
                  {i.comprovante && <BotaoComprovante id={i.comprovante} />}
                  {i.situacao === "confirmada" && (i.pagamento === "pendente" || i.pagamento === "na_hora" || (i.pagamento === "informado" && !i.comprovante)) && (
                    <Link href={`${i.url}?${i.pagamento === "informado" ? "pagar=1" : "contribuir=1"}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] sm:w-fit">
                      <Receipt size={16} /> {i.pagamento === "informado" ? "Informar comprovante" : "Realizar contribuição"}
                    </Link>
                  )}
                </div>
              )}
              {mostrarPagamento && i.temContribuicao && i.situacao === "espera" && i.pagamento === "pendente" && (
                <span className="text-xs text-stone-500">A contribuição será liberada quando sua vaga for confirmada.</span>
              )}
              {cancelar && i.podeCancelar && (i.pagamento === "credito" || i.pagamento === "na_hora" || !i.temContribuicao || (["pendente", "informado"].includes(i.pagamento) && !i.comprovante)) && <CancelarParticipacao eventoId={i.eventoId} className="self-start" alinhar="esquerda" />}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(",", " às");

/** Texto de um grupo de créditos: o que foi usado, aguardando, cedido ou recebido. */
function resumoGrupo(g: { usados: number; aguardando: number; cedidos: number; recebidos: number }): string {
  return [
    g.usados ? `${g.usados} ${g.usados === 1 ? "usado" : "usados"}` : "",
    g.aguardando ? `${g.aguardando} aguardando pagamento` : "",
    g.cedidos ? `${g.cedidos} ${g.cedidos === 1 ? "cedido" : "cedidos"} para outra pessoa` : "",
    g.recebidos ? `${g.recebidos} ${g.recebidos === 1 ? "recebido" : "recebidos"} de outra pessoa` : "",
  ].filter(Boolean).join(" · ");
}

async function AbaCreditos({ usuarioId, saldo, creditos, chavePix }: { usuarioId: string; saldo: Awaited<ReturnType<typeof saldoDoUsuario>>; creditos: CreditoItem[]; chavePix: Awaited<ReturnType<typeof getDadosInstituto>>["pix"][number] | null }) {
  const preferencias = lerPreferenciasCreditos(await getInstituto());
  const limite = limiteCessao(saldo.saldo);
  const [pacotes, movimentos, planos, usuarios, destinatariosRecentes] = await Promise.all([
    pacotesComResumo(usuarioId),
    historicoCreditos({ usuarioId, limite: 30 }),
    listarPlanos(true),
    mapaUsuarios(),
    destinatariosRecentesCessao(usuarioId),
  ]);
  const nome = (id: string | null) => (id ? (usuarios.get(id)?.nome ?? "Outra pessoa") : "");
  const eventoIds = [...new Set(movimentos.flatMap((m) => (m.evento_id ? [m.evento_id] : [])))];
  const eventos = new Map((eventoIds.length ? await listarEventos({ ids: eventoIds.slice(0, 100) }) : []).map((e) => [e.$id, e]));
  const negativo = saldo.saldo < 0;
  // Créditos agrupados por pacote; as preferências definem se recebidos podem ser cedidos novamente.
  const grupos = new Map<string, { id: string; nome: string; disponiveis: number; usados: number; aguardando: number; cedidos: number; recebidos: number; cediveis: number }>();
  for (const c of creditos) {
    if (c.situacao === "cancelado") continue;
    const g = grupos.get(c.pacote_id) ?? { id: c.pacote_id, nome: c.pacoteNome ?? "Pacote", disponiveis: 0, usados: 0, aguardando: 0, cedidos: 0, recebidos: 0, cediveis: 0 };
    if (c.cedidoParaOutro) g.cedidos++;
    else if (c.situacao === "utilizado") g.usados++;
    else if (c.situacao === "bloqueado") g.aguardando++;
    else if (c.situacao === "disponivel") {
      g.disponiveis++;
      if (c.cedido_de) g.recebidos++;
      if (!c.cedido_de || preferencias.permitirRecessao) g.cediveis++;
    }
    grupos.set(c.pacote_id, g);
  }
  const gruposLista = [...grupos.values()];
  const cediveis: PacoteCedivel[] = gruposLista.filter((g) => g.cediveis > 0).map((g) => ({ id: g.id, nome: g.nome, cediveis: g.cediveis }));
  // Soma de todos os pacotes: cada crédito disponível vira uma unidade (círculo com ticket)
  const totais = gruposLista.reduce(
    (t, g) => ({ disponiveis: t.disponiveis + g.disponiveis, usados: t.usados + g.usados, aguardando: t.aguardando + g.aguardando, cedidos: t.cedidos + g.cedidos, recebidos: t.recebidos + g.recebidos }),
    { disponiveis: 0, usados: 0, aguardando: 0, cedidos: 0, recebidos: 0 },
  );
  const LIMITE_CIRCULOS = 40;

  return (
    <div className="space-y-6">
      <section className={`cartao !p-4 sm:!p-5 ${negativo ? "ring-2 ring-red-200" : ""}`}>
        <p className="text-xs font-medium text-stone-500">Seu saldo</p>
        <p className={`mt-1 text-4xl font-semibold tabular-nums ${negativo ? "text-red-700" : "text-mata-800"}`}>{saldo.saldo}</p>
        <p className="mt-1 text-sm text-stone-500">
          {saldo.disponiveis} {saldo.disponiveis === 1 ? "crédito disponível" : "créditos disponíveis"}
          {saldo.bloqueados > 0 && ` · ${saldo.bloqueados} aguardando confirmação do pagamento`}
          {saldo.debitos > 0 && ` · ${saldo.debitos} ${saldo.debitos === 1 ? "participação sem crédito" : "participações sem crédito"}`}
        </p>
        {saldo.debitosLista.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-100">
            <p className="font-medium">Você participou sem crédito de:</p>
            <ul className="mt-1 list-inside list-disc text-red-800">
              {saldo.debitosLista.map((d) => (
                <li key={d.inscricaoId}>{d.ritualNumero ? `Ritual ${formatarIdRitual(d.ritualNumero, null, null)}: ` : ""}{d.titulo} · {dataCurta(d.data)}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-red-700">Compre um pacote e fale com a coordenação para regularizar. Seus próximos pacotes não quitam isso sozinhos.</p>
          </div>
        )}
        <div className="mt-4"><ComprarPacote planos={planos.map((p) => ({ id: p.$id, nome: p.nome, quantidade: p.quantidade, valor: p.valor, descricao: p.descricao }))} chavePix={chavePix} /></div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-800">Meus créditos</h2>
          {preferencias.cessaoAtiva && limite > 0 && cediveis.length > 0 && <CederCreditos pacotes={cediveis} limite={limite} permitirRecessao={preferencias.permitirRecessao} destinatariosRecentes={destinatariosRecentes} />}
        </div>
        {!gruposLista.length ? <p className="cartao text-center text-sm text-stone-400">Você ainda não tem créditos.</p> : (
          <div className="cartao">
            <div className="flex flex-wrap items-center gap-2" role="img" aria-label={`${totais.disponiveis} ${totais.disponiveis === 1 ? "crédito disponível" : "créditos disponíveis"}`}>
              {Array.from({ length: Math.min(totais.disponiveis, LIMITE_CIRCULOS) }, (_, i) => (
                <span key={i} title="Crédito disponível" className="grid h-9 w-9 place-items-center rounded-full bg-mata-600 text-white shadow-sm">
                  <Ticket size={16} aria-hidden />
                </span>
              ))}
              {totais.disponiveis > LIMITE_CIRCULOS && <span className="text-sm font-semibold text-stone-500 tabular-nums">+{totais.disponiveis - LIMITE_CIRCULOS}</span>}
            </div>
            <p className="mt-3 text-sm text-stone-700">
              <strong className="font-semibold text-stone-900 tabular-nums">{totais.disponiveis}</strong> {totais.disponiveis === 1 ? "crédito disponível" : "créditos disponíveis"}
              {resumoGrupo(totais) && <span className="text-stone-500"> · {resumoGrupo(totais)}</span>}
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-800">Meus pacotes</h2>
        {!pacotes.length ? <p className="cartao text-center text-sm text-stone-400">Nenhum pacote comprado ainda.</p> : (
          <ul className="space-y-2">
            {pacotes.map((p) => (
              <li key={p.$id} className="cartao !p-3 sm:!p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{p.nome ?? "Pacote"} <span className="font-normal text-stone-500">· {p.quantidade} {p.quantidade === 1 ? "crédito" : "créditos"}</span></p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {p.valor != null ? `${formatoReal(p.valor)} · ` : ""}{dataHora(p.$createdAt)}
                      {p.situacao === "pago" && ` · ${p.disponiveis} disponíveis, ${p.utilizados} usados${p.cedidos ? `, ${p.cedidos} cedidos` : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {p.comprovante_file_id && <BotaoComprovante id={p.comprovante_file_id} />}
                    <span className={`chip ${ROTULO_PACOTE[p.situacao].cor}`}>{ROTULO_PACOTE[p.situacao].rotulo}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-800">Histórico</h2>
        {!movimentos.length ? <p className="cartao text-center text-sm text-stone-400">Nenhuma movimentação ainda.</p> : (
          <ul className="cartao divide-y divide-stone-100 !p-0">
            {movimentos.map((m) => {
              const e = m.evento_id ? eventos.get(m.evento_id) : undefined;
              const detalhe = [
                e?.titulo,
                m.acao === "cessao" ? (m.de_usuario === usuarioId ? `para ${nome(m.para_usuario)}` : `de ${nome(m.de_usuario)}`) : null,
                m.observacao,
              ].filter(Boolean).join(" · ");
              return (
                <li key={m.$id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-stone-800">{ROTULO_ACAO[m.acao]}{detalhe && <span className="font-normal text-stone-500"> · {detalhe}</span>}</span>
                  <span className="text-xs text-stone-400 tabular-nums">{dataHora(m.$createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
