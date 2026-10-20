import "server-only";
import { listarEventos, listarTipos } from "./data";
import { inscricoesDosEventos } from "./inscricoes";
import { mapaUsuarios } from "./usuarios";
import type { SituacaoInscricao, SituacaoPagamento } from "./types";

export type ItemPagamento = {
  inscricaoId: string;
  usuarioId: string;
  nome: string;
  foto: string | null;
  eventoId: string;
  titulo: string;
  data: string;
  tipoId: string;
  tipoNome: string;
  tipoCor: string;
  situacao: SituacaoInscricao;
  pagamento: SituacaoPagamento;
  valor: number | null;
  pagoEm: string | null;
  informadoEm: string | null;
  comprovante: string | null;
};

/** Inscrições com contribuição (eventos que contam como ritual) de um ano, já com pessoa e evento — para o relatório de pagamentos. */
export async function pagamentosDoAno(ano: number): Promise<ItemPagamento[]> {
  const [eventos, tipos, usuarios] = await Promise.all([
    listarEventos({ inicio: `${ano}-01-01`, fim: `${ano}-12-31` }),
    listarTipos(),
    mapaUsuarios(),
  ]);
  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const eventosComContribuicao = eventos.filter((e) => tipoPorId.get(e.tipo_id)?.conta_como_ritual);
  if (!eventosComContribuicao.length) return [];

  const eventoPorId = new Map(eventosComContribuicao.map((e) => [e.$id, e]));
  const inscricoes = await inscricoesDosEventos(eventosComContribuicao.map((e) => e.$id));

  return inscricoes
    .flatMap((i) => {
      const e = eventoPorId.get(i.evento_id);
      if (!e) return [];
      const tipo = tipoPorId.get(e.tipo_id);
      const u = usuarios.get(i.usuario_id);
      return [{
        inscricaoId: i.$id,
        usuarioId: i.usuario_id,
        nome: u?.nome ?? "Usuário removido",
        foto: u?.foto ?? null,
        eventoId: e.$id,
        titulo: e.titulo,
        data: e.data,
        tipoId: e.tipo_id,
        tipoNome: tipo?.nome ?? "",
        tipoCor: tipo?.cor ?? "#999",
        situacao: i.situacao,
        pagamento: i.pagamento,
        valor: i.valor,
        pagoEm: i.pago_em,
        informadoEm: i.informado_em,
        comprovante: i.comprovante_file_id,
      }];
    })
    .sort((a, b) => b.data.localeCompare(a.data) || a.nome.localeCompare(b.nome));
}
