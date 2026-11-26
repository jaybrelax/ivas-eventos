import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GlassWater, MessageSquareText, Receipt } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { getDadosInstituto, getEvento, listarTipos } from "@/lib/data";
import { lerDoses, totalDoses } from "@/lib/doses";
import { avaliacaoDaInscricao, depoimentosDaInscricao, inscricaoDoDono, podeDepor } from "@/lib/depoimentos";
import { ASPECTOS } from "@/lib/depoimentos-regras";
import { dataCurta } from "@/lib/format";
import { CabecalhoPublico } from "@/components/publico/CabecalhoPublico";
import { FormularioDepoimento } from "./FormularioDepoimento";
import { EditarAvaliacao, EditarDepoimento } from "./EditarConteudo";
import { AnexarComprovante } from "./AnexarComprovante";

export default async function ParticipacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirSessao(`/minha-conta/participacao/${id}`);
  const inscricao = await inscricaoDoDono(id, usuario.id);
  if (!inscricao || inscricao.situacao !== "confirmada") notFound();
  const [evento, dados, avaliacao, depoimentos, permitido] = await Promise.all([
    getEvento(inscricao.evento_id), getDadosInstituto(), avaliacaoDaInscricao(id), depoimentosDaInscricao(id), podeDepor(inscricao),
  ]);
  if (!evento) notFound();
  const tipoEvento = (await listarTipos()).find((tipo) => tipo.$id === evento.tipo_id);
  const endereco = dados.enderecos.find((e) => e.$id === evento.endereco_id);
  const doses = lerDoses(inscricao.doses).filter((d) => d.ml > 0);
  const contribuicao = inscricao.pagamento === "credito" ? "Crédito de pacote" : inscricao.pagamento === "aniversario" ? "Bônus de aniversário" : inscricao.pagamento === "isento" ? "Isenta" : inscricao.pagamento === "pago" ? "Confirmada" : inscricao.pagamento === "informado" ? "Informada" : inscricao.pagamento === "na_hora" ? "Prevista para o dia" : "Pendente";
  return <div className="min-h-screen bg-fundo text-stone-900">
    <CabecalhoPublico instituto={dados.instituto} />
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-7 pb-20 sm:px-6">
      <Link href="/minha-conta?aba=proximos#historico" className="inline-flex items-center gap-2 text-sm font-semibold text-mata-700"><ArrowLeft size={16} /> Participações</Link>
      <header><p className="text-xs font-bold uppercase tracking-wider text-ouro-700">Minha participação{evento.ritual_numero_geral ? ` · Ritual Nº ${evento.ritual_numero_geral}` : ""}</p><h1 className="mt-1 font-display text-2xl font-semibold">{evento.titulo}</h1><p className="mt-2 text-sm text-stone-600">{dataCurta(evento.data)} às {evento.hora_inicio}{endereco ? ` · ${endereco.apelido}` : evento.endereco_livre ? ` · ${evento.endereco_livre}` : ""}</p></header>
      {permitido && <FormularioDepoimento inscricaoId={id} jaAvaliou={!!avaliacao} capa={evento.capa_file_id} />}
      {!permitido && <p className="text-sm text-stone-500">Você poderá deixar seu depoimento a partir do dia seguinte ao ritual.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="cartao"><h2 className="flex items-center gap-2 font-semibold"><GlassWater size={18} /> Doses registradas</h2>{doses.length ? <><ul className="mt-3 space-y-1 text-sm">{doses.map((d) => <li key={d.n} className="flex justify-between"><span>{d.n}ª dose</span><strong>{d.ml} ml</strong></li>)}</ul><p className="mt-3 border-t pt-2 text-sm font-semibold">Total de {totalDoses(doses)} ml</p></> : <p className="mt-3 text-sm text-stone-500">Nenhuma dose registrada.</p>}</section>
        <section className="cartao"><h2 className="flex items-center gap-2 font-semibold"><Receipt size={18} /> Minha contribuição</h2><p className="mt-3 text-sm font-semibold">{contribuicao}</p>{inscricao.valor != null && inscricao.pagamento !== "credito" && <p className="mt-1 text-sm text-stone-600">{inscricao.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>}{inscricao.forma_pagamento && <p className="mt-1 text-sm text-stone-600">{inscricao.forma_pagamento === "pix" ? "Pix" : "Dinheiro"}</p>}{tipoEvento?.conta_como_ritual && <AnexarComprovante eventoId={evento.$id} inscricaoId={id} pagamento={inscricao.pagamento} temComprovante={!!inscricao.comprovante_file_id} />}</section>
      </div>
      {avaliacao && <section className="cartao"><h2 className="font-semibold">Sua avaliação</h2><dl className="mt-3 space-y-2">{ASPECTOS.map(([chave, rotulo]) => <div key={chave} className="flex justify-between gap-3 text-sm"><dt>{rotulo}</dt><dd className="font-bold tabular-nums text-mata-800">{avaliacao[chave].toFixed(1).replace(".", ",")}/10</dd></div>)}</dl>{permitido && <EditarAvaliacao inscricaoId={id} inicial={Object.fromEntries(ASPECTOS.map(([chave]) => [chave, avaliacao[chave]])) as import("@/lib/depoimentos-regras").Notas} />}</section>}
      <section className="cartao"><h2 className="flex items-center gap-2 font-semibold"><MessageSquareText size={18} /> Meus depoimentos</h2>{depoimentos.length ? <ul className="mt-3 space-y-3">{depoimentos.map((d) => <EditarDepoimento key={d.$id} inscricaoId={id} item={{ id: d.$id, texto: d.texto, criadoEm: d.$createdAt }} />)}</ul> : <p className="mt-3 text-sm text-stone-500">Você ainda não escreveu um depoimento.</p>}</section>
    </main>
  </div>;
}
