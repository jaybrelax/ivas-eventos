import "server-only";
import { ID } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";

export type AcaoHistorico =
  | "inscricao" | "inclusao" | "cancelamento" | "remocao"
  | "pagamento_informado" | "comprovante_anexado" | "pagamento_na_hora" | "pagamento_desfeito"
  | "pagamento_confirmado" | "pagamento_isento" | "pagamento_reaberto"
  | "credito_usado" | "credito_devolvido"
  | "bonus_aniversario_usado" | "bonus_aniversario_devolvido";

export type RegistroHistorico = {
  inscricao_id: string;
  evento_id: string;
  usuario_id: string;
  acao: AcaoHistorico;
  pagamento_de?: string | null;
  pagamento_para?: string | null;
  valor?: number | null;
  por: string;
};

let avisado = false;

/**
 * Guarda uma linha no histórico das inscrições (quem fez o quê e quando). Nunca derruba a ação
 * principal: se a tabela ainda não existe (falta rodar `npm run setup`), só avisa no log uma vez.
 */
export async function registrarHistorico(r: RegistroHistorico): Promise<void> {
  try {
    const { tablesDB } = createAdminClient();
    await tablesDB.createRow({
      databaseId: DB_ID, tableId: TABLES.historicoInscricoes, rowId: ID.unique(),
      data: { pagamento_de: null, pagamento_para: null, valor: null, ...r },
    });
  } catch (e) {
    if (!avisado) {
      avisado = true;
      console.warn("Histórico de inscrições indisponível (rode npm run setup):", e instanceof Error ? e.message : e);
    }
  }
}
