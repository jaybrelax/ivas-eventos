import "server-only";
import { cookies } from "next/headers";
import { Agent } from "undici";
import { Account, Client, Storage, TablesDB, Users } from "node-appwrite";
import { SESSION_COOKIE } from "./config";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name} (veja .env.example)`);
  return v;
}

// Um só pool de conexões para o processo (sobrevive ao HMR do dev): reaproveita as conexões
// TLS e limita quantas abrem ao mesmo tempo quando uma página dispara várias consultas.
const g = globalThis as typeof globalThis & { __appwriteAgent?: Agent };
const agente = (g.__appwriteAgent ??= new Agent({ connections: 6, keepAliveTimeout: 10_000 }));

// Falhas antes de a conexão existir: o pedido não chegou ao servidor, repetir é seguro em qualquer método.
const ERROS_DE_CONEXAO = new Set([
  "UND_ERR_CONNECT_TIMEOUT", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ENETUNREACH", "EHOSTUNREACH",
]);
const ESPERAS_MS = [300, 1000];

function codigos(e: unknown): string[] {
  const out: string[] = [];
  for (let c = e, i = 0; c && typeof c === "object" && i < 5; c = (c as { cause?: unknown }).cause, i++) {
    const code = (c as { code?: unknown }).code;
    if (typeof code === "string") out.push(code);
    for (const sub of (c as { errors?: unknown[] }).errors ?? []) codigos(sub).forEach((x) => out.push(x));
  }
  return out;
}

/** Só erros de rede (o "fetch failed" do undici); AppwriteException (4xx/5xx) nunca é repetida. */
function podeRepetir(e: unknown, method: string) {
  if (!(e instanceof TypeError) || e.message !== "fetch failed") return false;
  // GET é idempotente: repete também conexão derrubada no meio (ECONNRESET, socket fechado).
  return method.toUpperCase() === "GET" || codigos(e).some((c) => ERROS_DE_CONEXAO.has(c));
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

class ClienteResiliente extends Client {
  prepareRequest(...args: Parameters<Client["prepareRequest"]>) {
    const req = super.prepareRequest(...args);
    req.options.dispatcher ??= agente;
    return req;
  }

  async call(...args: Parameters<Client["call"]>) {
    for (let tentativa = 0; ; tentativa++) {
      try {
        return await super.call(...args);
      } catch (e) {
        if (tentativa >= ESPERAS_MS.length || !podeRepetir(e, args[0])) throw e;
        console.warn(`[appwrite] ${args[0]} ${args[1].pathname} falhou (${codigos(e)[0] ?? "rede"}); nova tentativa ${tentativa + 1}/${ESPERAS_MS.length}`);
        await esperar(ESPERAS_MS[tentativa] + Math.random() * 200);
      }
    }
  }
}

function baseClient() {
  return new ClienteResiliente()
    .setEndpoint(env("APPWRITE_ENDPOINT"))
    .setProject(env("APPWRITE_PROJECT_ID"));
}

/** Cliente com a chave de API: só roda no servidor. */
export function createAdminClient() {
  const client = baseClient().setKey(env("APPWRITE_API_KEY"));
  return {
    account: new Account(client),
    tablesDB: new TablesDB(client),
    storage: new Storage(client),
    users: new Users(client),
  };
}

/** Cliente da sessão do usuário logado (cookie httpOnly). */
export async function createSessionClient() {
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return null;
  const client = baseClient().setSession(secret);
  return { account: new Account(client) };
}
