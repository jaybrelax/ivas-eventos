import "server-only";
import { Query } from "node-appwrite";
import { TABLES } from "./config";
import { listar } from "./data";

/** Conta sem nenhum registro ligado (inscrição, candidatura, pacote ou crédito): pode ser apagada sem perder nada. */
export async function contaSemRegistros(id: string): Promise<boolean> {
  const q = (campo: string) => [Query.equal(campo, id), Query.limit(1)];
  const achados = await Promise.all([
    listar(TABLES.inscricoes, q("usuario_id")),
    listar(TABLES.candidaturas, q("usuario_id")),
    listar(TABLES.pacotes, q("usuario_id")),
    listar(TABLES.creditos, q("titular_id")),
  ]);
  return achados.every((a) => a.length === 0);
}
