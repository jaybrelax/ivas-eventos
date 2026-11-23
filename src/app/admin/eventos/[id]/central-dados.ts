import "server-only";
import { Query } from "node-appwrite";
import { TABLES } from "@/lib/config";
import { listar } from "@/lib/data";
import { mapaUsuarios } from "@/lib/usuarios";
import { guardioesDoEvento } from "@/lib/central";
import { mencoesDoTexto, type TipoCentral } from "@/lib/central-texto";
import type { Evento, Inscricao } from "@/lib/types";

/** Linha da tabela `central_posts`. */
export type LinhaCentral = {
  $id: string; $createdAt: string; evento_id: string; autor_id: string; tipo: TipoCentral; texto: string | null;
  mencoes: string[] | null; imagens: string[] | null; fixado: boolean | null;
  concluida_por: string | null; concluida_em: string | null; editado_em: string | null;
};

export type PessoaCentral = {
  id: string; nome: string; foto: string | null; papel: "mestre" | "guardiao" | "participante" | "equipe";
  /** Faz parte deste ritual (mestre escalado, guardião do ritual ou inscrito). Os demais só aparecem ao buscar pelo nome. */
  doEvento: boolean;
};

export type PostCentral = {
  id: string; tipo: TipoCentral; texto: string; criadoEm: string; editadoEm: string | null; fixado: boolean;
  autor: { id: string; nome: string; foto: string | null };
  mencoes: string[]; imagens: string[];
  concluida: { por: string; em: string } | null;
  podeEditar: boolean; podeExcluir: boolean;
};

export type DadosCentral = {
  posts: PostCentral[]; pessoas: PessoaCentral[]; euId: string; gestao: boolean;
  tarefasAbertas: number; meMarcaram: number;
};

/**
 * Quem pode ser marcado com @: qualquer usuário ativo. Os deste ritual (mestres escalados, guardiões do
 * ritual e inscritos não cancelados) vêm marcados com `doEvento` e aparecem primeiro na lista; os demais
 * só aparecem quando a pessoa digita o nome. Serve para o autocomplete e para validar as menções.
 */
export async function pessoasMencionaveis(evento: Evento): Promise<PessoaCentral[]> {
  const [inscricoes, mapa, guardioes] = await Promise.all([
    listar<Inscricao>(TABLES.inscricoes, [Query.equal("evento_id", evento.$id), Query.limit(500)]),
    mapaUsuarios(),
    guardioesDoEvento(evento),
  ]);
  const doEvento = new Set<string>([...(evento.mestres ?? []), ...guardioes, ...inscricoes.filter((i) => i.situacao !== "cancelada").map((i) => i.usuario_id)]);
  const lista: PessoaCentral[] = [];
  for (const u of mapa.values()) {
    if (u.mock || (!u.ativo && !doEvento.has(u.id))) continue;
    const papel = (evento.mestres ?? []).includes(u.id) ? "mestre" : guardioes.includes(u.id) ? "guardiao" : u.funcao === "mestre" ? "mestre" : u.funcao === "guardiao" ? "guardiao" : "participante";
    lista.push({ id: u.id, nome: u.nome, foto: u.foto, papel, doEvento: doEvento.has(u.id) });
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Ordem: fixados, tarefas abertas, depois os mais novos (tarefas concluídas no fim do seu grupo). */
function peso(p: Pick<PostCentral, "fixado" | "tipo" | "concluida">) {
  if (p.fixado) return 0;
  if (p.tipo === "tarefa" && !p.concluida) return 1;
  return 2;
}

export async function dadosCentral(evento: Evento, u: { id: string }, gestao: boolean): Promise<DadosCentral> {
  const [linhas, mapa, pessoas] = await Promise.all([
    listar<LinhaCentral>(TABLES.central, [Query.equal("evento_id", evento.$id), Query.orderDesc("$createdAt"), Query.limit(200)]).catch((e) => {
      // Tabela ainda não criada (migração pendente): a Central aparece vazia em vez de quebrar a página
      console.error("Central:", e instanceof Error ? e.message : e);
      return [] as LinhaCentral[];
    }),
    mapaUsuarios(),
    pessoasMencionaveis(evento),
  ]);
  const posts: PostCentral[] = linhas.map((l) => {
    const autor = mapa.get(l.autor_id);
    const texto = l.texto ?? "";
    return {
      id: l.$id, tipo: l.tipo, texto, criadoEm: l.$createdAt, editadoEm: l.editado_em, fixado: !!l.fixado,
      autor: { id: l.autor_id, nome: autor?.nome ?? "Pessoa removida", foto: autor?.foto ?? null },
      mencoes: l.mencoes?.length ? l.mencoes : mencoesDoTexto(texto),
      imagens: l.imagens ?? [],
      concluida: l.tipo === "tarefa" && l.concluida_em ? { por: mapa.get(l.concluida_por ?? "")?.nome ?? "alguém", em: l.concluida_em } : null,
      podeEditar: l.autor_id === u.id,
      podeExcluir: l.autor_id === u.id || gestao,
    };
  });
  posts.sort((a, b) => peso(a) - peso(b) || b.criadoEm.localeCompare(a.criadoEm));
  return {
    posts, pessoas, euId: u.id, gestao,
    tarefasAbertas: posts.filter((p) => p.tipo === "tarefa" && !p.concluida).length,
    meMarcaram: posts.filter((p) => p.mencoes.includes(u.id)).length,
  };
}
