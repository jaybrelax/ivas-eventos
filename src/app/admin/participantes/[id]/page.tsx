import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, Clock, History, IdCard, Mail, MessageCircle, Wallet } from "lucide-react";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { PERFIS, PODE } from "@/lib/config";
import { mascararCpf } from "@/lib/cpf";
import { getDadosInstituto } from "@/lib/data";
import { dataCurta } from "@/lib/format";
import { inscricoesComEventos } from "@/lib/inscricoes";
import { ehParticipante, perfilDosLabels, prefsDe } from "@/lib/usuarios";
import { Titulo } from "@/components/Titulo";
import { Avatar } from "@/components/Avatar";
import { EditarParticipante } from "./EditarParticipante";
import { FichaCompleta } from "./FichaCompleta";
import { InscricoesDoParticipante } from "./InscricoesDoParticipante";
import { rotuloExperiencia } from "@/lib/perfil-extra";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const [itens, { instituto }] = await Promise.all([inscricoesComEventos(id), getDadosInstituto()]);
  const proximos = itens.filter((i) => !i.passado);
  const historico = itens.filter((i) => i.passado && i.situacao === "confirmada");
  const comContribuicao = itens.filter((i) => i.temContribuicao);
  const totalPago = comContribuicao.filter((i) => i.pagamento === "pago").reduce((s, i) => s + (i.valor ?? 0), 0);
  const emAberto = comContribuicao.filter((i) => i.pagamento === "pendente" || i.pagamento === "informado" || i.pagamento === "na_hora").length;

  const whatsapp = p.telefone ? `https://wa.me/${(p.telefone.replace(/\D/g, "").startsWith("55") ? "" : "55") + p.telefone.replace(/\D/g, "")}` : null;
  // Ficha completa: o que não aparece no topo (WhatsApp, e-mail e CPF já estão lá)
  const dados: [string, string | null, boolean?][] = [
    ["Endereço", p.endereco, true],
    ["Cidade", p.cidade ? `${p.cidade}${p.estado ? ` - ${p.estado}` : ""}` : p.estado],
    ["Profissão", p.profissao],
    ["Nascimento", p.data_nascimento ? dataCurta(p.data_nascimento) : null],
    ["Gênero", p.sexo ? (p.sexo === "masculino" ? "Masculino" : "Feminino") : null],
    ["Cadastro em", dataCurta(conta.$createdAt.slice(0, 10))],
    ["Experiência com ayahuasca", rotuloExperiencia(p.experiencia_ayahuasca)],
    ["Motivação para participar", p.motivacao, true],
    ["Expectativas", p.expectativas, true],
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
      <Titulo sobre={perfilEquipe ? "Equipe" : "Participante"} titulo="Ficha do participante" />

      <div className="space-y-6">
        {/* Topo: avatar à esquerda; nome, WhatsApp, e-mail e CPF à direita */}
        <section className="cartao">
          <div className="flex items-start gap-4 sm:gap-6">
            <Avatar nome={nome} foto={p.foto_file_id} tamanho={96} />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">{nome}</h2>
              {(perfilEquipe || !conta.status) && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {perfilEquipe && <span className="chip bg-stone-100 text-stone-600">Equipe · {PERFIS.find((x) => x.id === perfilEquipe)?.nome}</span>}
                  {!conta.status && <span className="chip bg-red-50 text-red-700">Conta desativada</span>}
                </div>
              )}
              <ul className="mt-3 space-y-1.5 text-sm">
                <li className="flex items-center gap-2 text-stone-700">
                  <MessageCircle size={15} className="shrink-0 text-emerald-600" />
                  {whatsapp ? (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="truncate hover:text-mata-700 hover:underline">{p.telefone}</a>
                  ) : (
                    <span className="text-stone-400">WhatsApp não informado</span>
                  )}
                </li>
                <li className="flex items-center gap-2 text-stone-700">
                  <Mail size={15} className="shrink-0 text-stone-400" />
                  <a href={`mailto:${conta.email}`} className="truncate hover:text-mata-700 hover:underline">{conta.email}</a>
                </li>
                <li className="flex items-center gap-2 text-stone-700">
                  <IdCard size={15} className="shrink-0 text-stone-400" />
                  {p.cpf ? <span className="tabular-nums">CPF {mascararCpf(p.cpf)}</span> : <span className="text-stone-400">CPF não informado</span>}
                </li>
              </ul>
            </div>
          </div>

          <FichaCompleta>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {dados.map(([rotulo, valor, largo]) => (
                <div key={rotulo} className={largo ? "sm:col-span-2" : ""}>
                  <dt className="text-xs text-stone-400">{rotulo}</dt>
                  <dd className="break-words whitespace-pre-line text-stone-800">{valor ?? <span className="text-stone-300">Não informado</span>}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 sm:max-w-xs">
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
            </div>
          </FichaCompleta>
        </section>

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
            <p className="cartao-sub">Toque numa participação para ver a contribuição, o comprovante e as ações.</p>
          </div>
          <InscricoesDoParticipante itens={itens} pessoa={{ id, nome, foto: p.foto_file_id }} valorContribuicao={instituto.valor_contribuicao ?? null} />
        </section>
      </div>
    </>
  );
}
