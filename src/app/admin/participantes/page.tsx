import { exigir } from "@/lib/auth";
import { PERFIS, PODE, type Perfil } from "@/lib/config";
import { hoje } from "@/lib/format";
import { listarEventos, listarTipos } from "@/lib/data";
import { todasInscricoesAtivas } from "@/lib/inscricoes";
import { listarTodasAsPessoas } from "@/lib/usuarios";
import { Titulo } from "@/components/Titulo";
import { TabelaPessoas, type LinhaPessoa } from "./TabelaPessoas";

const COR_PERFIL: Record<Perfil, string> = {
  admin: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  coordenador: "bg-orange-50 text-orange-700 ring-orange-200",
  normal: "bg-stone-100 text-stone-600 ring-stone-200",
};
const COR_FUNCAO = { mestre: "bg-mata-50 text-mata-700 ring-mata-200", guardiao: "bg-sky-50 text-sky-700 ring-sky-200" } as const;
const ROTULO_FUNCAO = { mestre: "Mestre", guardiao: "Guardião" } as const;

/** Todas as pessoas com conta: quem só participa dos rituais e também a equipe (mestres, guardiões, coordenação). */
export default async function Participantes({ searchParams }: PageProps<"/admin/participantes">) {
  const eu = await exigir(PODE.editarEventos);
  const sp = await searchParams;
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const [pessoas, inscricoes, eventos, tipos] = await Promise.all([listarTodasAsPessoas(), todasInscricoesAtivas(), listarEventos(), listarTipos()]);
  const comContribuicao = new Set(tipos.filter((t) => t.conta_como_ritual).map((t) => t.$id));
  const eventoPorId = new Map(eventos.map((e) => [e.$id, e]));
  const hj = hoje();

  type Resumo = Pick<LinhaPessoa, "participou" | "proximos" | "emAberto" | "aguardando" | "ultimaParticipacao">;
  const resumo = new Map<string, Resumo>();
  for (const i of inscricoes) {
    const e = eventoPorId.get(i.evento_id);
    if (!e) continue;
    const r = resumo.get(i.usuario_id) ?? { participou: 0, proximos: 0, emAberto: 0, aguardando: 0, ultimaParticipacao: null };
    if (e.data < hj) {
      if (i.situacao === "confirmada") {
        r.participou++;
        if (!r.ultimaParticipacao || e.data > r.ultimaParticipacao) r.ultimaParticipacao = e.data;
      }
    } else r.proximos++;
    // Só conta contribuição de quem tem vaga confirmada em evento que cobra (ritual)
    if (i.situacao === "confirmada" && comContribuicao.has(e.tipo_id)) {
      if (i.pagamento === "informado") r.aguardando++;
      else if (i.pagamento === "pendente" || i.pagamento === "na_hora") r.emAberto++;
    }
    resumo.set(i.usuario_id, r);
  }

  const linhas: LinhaPessoa[] = pessoas.map((p) => {
    const r = resumo.get(p.id);
    // Uma etiqueta só: Mestre ou Guardião; senão o perfil de acesso da equipe; senão Participante
    const etiqueta = p.funcao !== "nenhuma"
      ? { rotulo: ROTULO_FUNCAO[p.funcao], cor: COR_FUNCAO[p.funcao] }
      : p.perfil
        ? { rotulo: PERFIS.find((x) => x.id === p.perfil)?.nome ?? p.perfil, cor: COR_PERFIL[p.perfil] }
        : { rotulo: "Participante", cor: "bg-stone-100 text-stone-500 ring-stone-200" };
    return {
      id: p.id, nome: p.nome, email: p.email, telefone: p.telefone, foto: p.foto,
      local: [p.cidade, p.estado].filter(Boolean).join("/") || null,
      equipe: !!p.perfil || p.funcao !== "nenhuma", etiqueta,
      participou: r?.participou ?? 0, proximos: r?.proximos ?? 0, emAberto: r?.emAberto ?? 0, aguardando: r?.aguardando ?? 0,
      ultimaParticipacao: r?.ultimaParticipacao ?? null, criadoEm: p.criadoEm,
    };
  });

  return (
    <>
      <Titulo sobre="Administração" titulo="Participantes" subtitulo="Todas as pessoas com conta: participantes e equipe, com o histórico de rituais e pagamentos." />
      <TabelaPessoas
        pessoas={linhas}
        admin={eu.perfil === "admin"}
        filtroInicial={texto(sp.filtro)}
        ordemInicial={texto(sp.ordem)}
        buscaInicial={texto(sp.q)}
      />
    </>
  );
}
