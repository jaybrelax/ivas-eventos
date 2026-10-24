import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, Clock, History, Wallet } from "lucide-react";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { PERFIS, PODE } from "@/lib/config";
import { mascararCpf } from "@/lib/cpf";
import { dataCurta, dataPorExtenso, formatarIdRitual } from "@/lib/format";
import { inscricoesComEventos, type ItemInscricao } from "@/lib/inscricoes";
import { ehParticipante, perfilDosLabels, prefsDe } from "@/lib/usuarios";
import { Titulo } from "@/components/Titulo";
import { Avatar } from "@/components/Avatar";
import { BotaoComprovante } from "@/app/minha-conta/BotaoComprovante";
import { AcoesPagamento } from "./AcoesPagamento";
import { EditarParticipante } from "./EditarParticipante";
import { rotuloExperiencia } from "@/lib/perfil-extra";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAGAMENTO: Record<ItemInscricao["pagamento"], { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-stone-100 text-stone-600" },
  informado: { rotulo: "Informado", cor: "bg-amber-50 text-amber-700" },
  pago: { rotulo: "Pago", cor: "bg-emerald-50 text-emerald-700" },
  isento: { rotulo: "Isento", cor: "bg-sky-50 text-sky-700" },
  na_hora: { rotulo: "Na hora", cor: "bg-ouro-100 text-ouro-700" },
};

const SITUACAO: Record<ItemInscricao["situacao"], { rotulo: string; cor: string }> = {
  confirmada: { rotulo: "Confirmado", cor: "bg-mata-100 text-mata-800" },
  espera: { rotulo: "Lista de espera", cor: "bg-amber-50 text-amber-700" },
  cancelada: { rotulo: "Cancelado", cor: "bg-stone-100 text-stone-500" },
};

/** Ficha do participante: dados de cadastro, rituais de que participou e pagamentos. */
export default async function FichaParticipante({ params }: PageProps<"/admin/participantes/[id]">) {
  await exigir(PODE.editarEventos);
  const { id } = await params;
  const { users } = createAdminClient();
  const conta = await users.get({ userId: id }).catch(() => null);
  const perfilEquipe = conta ? perfilDosLabels(conta.labels) : null;
  if (!conta || (!ehParticipante(conta.labels) && !perfilEquipe)) notFound();
  const p = prefsDe(conta.prefs);
  const nome = conta.name || conta.email;

  const itens = await inscricoesComEventos(id);
  const proximos = itens.filter((i) => !i.passado);
  const historico = itens.filter((i) => i.passado && i.situacao === "confirmada");
  const comContribuicao = itens.filter((i) => i.temContribuicao);
  const totalPago = comContribuicao.filter((i) => i.pagamento === "pago").reduce((s, i) => s + (i.valor ?? 0), 0);
  const emAberto = comContribuicao.filter((i) => i.pagamento === "pendente" || i.pagamento === "informado" || i.pagamento === "na_hora").length;

  const dados: [string, string | null][] = [
    ["E-mail", conta.email],
    ["WhatsApp", p.telefone],
    ["Endereço", p.endereco],
    ["Cidade", p.cidade ? `${p.cidade}${p.estado ? ` - ${p.estado}` : ""}` : p.estado],
    ["Profissão", p.profissao],
    ["CPF", p.cpf ? mascararCpf(p.cpf) : null],
    ["Nascimento", p.data_nascimento ? dataCurta(p.data_nascimento) : null],
    ["Gênero", p.sexo ? (p.sexo === "masculino" ? "Masculino" : "Feminino") : null],
    ["Experiência com ayahuasca", rotuloExperiencia(p.experiencia_ayahuasca)],
    ["Motivação para participar", p.motivacao],
    ["Expectativas", p.expectativas],
    ["Cadastro em", dataCurta(conta.$createdAt.slice(0, 10))],
  ];

  const kpis = [
    { rotulo: "Rituais participados", valor: historico.length, Icone: History, cor: "bg-mata-50 text-mata-600" },
    { rotulo: "Próximos", valor: proximos.length, Icone: CalendarCheck, cor: "bg-sky-50 text-sky-600" },
    { rotulo: "Pagamentos em aberto", valor: emAberto, Icone: Clock, cor: "bg-amber-50 text-amber-600" },
    { rotulo: "Total pago", valor: formatoReal(totalPago), Icone: Wallet, cor: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <>
      <Link href="/admin/participantes" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800">
        <ChevronLeft size={15} /> Participantes
      </Link>
      <Titulo sobre={perfilEquipe ? "Equipe" : "Participante"} titulo={nome} />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className="cartao h-fit space-y-4">
          <div className="flex flex-col items-center text-center">
            <Avatar nome={nome} foto={p.foto_file_id} tamanho={88} />
            <p className="mt-3 font-semibold text-stone-900">{nome}</p>
            {perfilEquipe && (
              <span className="chip mt-1 bg-stone-100 text-stone-600">
                Equipe · {PERFIS.find((x) => x.id === perfilEquipe)?.nome}
              </span>
            )}
            {!conta.status && <span className="chip mt-1 bg-red-50 text-red-700">Conta desativada</span>}
          </div>
          <dl className="space-y-2.5 border-t border-stone-100 pt-4 text-sm">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-xs text-stone-400">{rotulo}</dt>
                <dd className="break-words whitespace-pre-line text-stone-800">{valor ?? <span className="text-stone-300">Não informado</span>}</dd>
              </div>
            ))}
          </dl>
          {perfilEquipe ? (
            <Link href="/admin/usuarios" className="btn-secundario w-full">Gerenciar em Usuários</Link>
          ) : (
            <EditarParticipante
              userId={id}
              dados={{
                nome, email: conta.email, telefone: p.telefone, sexo: p.sexo, cpf: p.cpf, dataNascimento: p.data_nascimento,
                endereco: p.endereco, estado: p.estado, cidade: p.cidade, profissao: p.profissao,
                experiencia: p.experiencia_ayahuasca, motivacao: p.motivacao, expectativas: p.expectativas,
              }}
            />
          )}
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {kpis.map(({ rotulo, valor, Icone, cor }) => (
              <div key={rotulo} className="cartao flex flex-col items-start gap-2 p-4">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${cor}`}><Icone size={17} /></span>
                <p className="text-[13px] text-stone-500">{rotulo}</p>
                <p className="text-xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</p>
              </div>
            ))}
          </div>

          <section className="cartao overflow-hidden p-0 sm:p-0">
            <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
              <h2 className="cartao-titulo">Inscrições e pagamentos</h2>
              <p className="cartao-sub">Rituais e encontros em que a pessoa se inscreveu, do mais recente ao mais antigo.</p>
            </div>
            {itens.length ? (
              <ul className="divide-y divide-stone-100">
                {itens.map((i) => (
                  <li key={i.inscricaoId} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 sm:px-6">
                    <div className="min-w-0">
                      <Link href={`/admin/eventos/${i.eventoId}`} className="font-medium text-stone-900 hover:text-mata-700 hover:underline">
                        {i.ritualNumero ? `${formatarIdRitual(i.ritualNumero, null, null)} — ` : ""}{i.titulo}
                      </Link>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {dataPorExtenso(i.data)} · {dataCurta(i.data)} às {i.hora}
                        {i.passado ? " · realizado" : ""}
                      </p>
                      {i.temContribuicao && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          {i.valor != null && <span>Valor: {formatoReal(i.valor)}</span>}
                          {i.comprovante && <BotaoComprovante id={i.comprovante} />}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`chip ${SITUACAO[i.situacao].cor}`}>{SITUACAO[i.situacao].rotulo}</span>
                        {i.temContribuicao && <span className={`chip ${PAGAMENTO[i.pagamento].cor}`}>{PAGAMENTO[i.pagamento].rotulo}</span>}
                      </div>
                      {i.temContribuicao && <AcoesPagamento eventoId={i.eventoId} inscricaoId={i.inscricaoId} pagamento={i.pagamento} />}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-stone-400 sm:px-6">Nenhuma inscrição ainda.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
