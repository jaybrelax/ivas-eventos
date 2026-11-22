import "server-only";
import { headers } from "next/headers";
import { bloqueado, ipDe, registrarFalha, textoEspera } from "./limite-taxa";

const JANELA_MS = 60 * 60_000;
const MAX_POR_IP = 8;

/** Cada envio do formulário de cadastro conta. Devolve a mensagem de erro quando o IP passou do limite. */
export async function limitarCadastro(): Promise<string | null> {
  const chave = `cadastro:ip:${ipDe(await headers())}`;
  const b = bloqueado(chave, MAX_POR_IP);
  if (b.bloqueado) return `Muitas tentativas de cadastro. Tente de novo em ${textoEspera(b.esperaS)}.`;
  registrarFalha(chave, JANELA_MS);
  return null;
}
