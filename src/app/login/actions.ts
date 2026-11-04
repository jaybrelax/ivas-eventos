"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppwriteException, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { SESSION_COOKIE } from "@/lib/config";
import { destinoGuarnicao } from "@/lib/destino-auth";

export async function entrar(_: { erro?: string } | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  let destino: string;
  try {
    const { account } = createAdminClient();
    const sessao = await account.createEmailPasswordSession({ email, password: senha });
    (await cookies()).set(SESSION_COOKIE, sessao.secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(sessao.expire),
    });
    destino = destinoGuarnicao(form.get("next"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED"))
      return { erro: "Não consegui falar com o Appwrite. Ele está rodando? Confira APPWRITE_ENDPOINT no .env.local." };
    // Conta bloqueada: se for um cadastro aguardando aprovação, avisa em vez de "senha incorreta"
    if (e instanceof AppwriteException && e.type === "user_blocked") {
      const { users } = createAdminClient();
      const u = (await users.list({ queries: [Query.equal("email", email), Query.limit(1)] }).catch(() => null))?.users[0];
      if ((u?.prefs as { situacao?: string } | undefined)?.situacao === "pendente")
        return { erro: "Seu cadastro ainda está aguardando a aprovação da coordenação." };
      return { erro: "Este acesso está desativado. Fale com a coordenação." };
    }
    return { erro: "E-mail ou senha incorretos." };
  }
  redirect(destino);
}

/** Sai da conta e retorna ao login da Guarnição. */
export async function sair() {
  const s = await createSessionClient();
  try {
    await s?.account.deleteSession({ sessionId: "current" });
  } catch {}
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login-guarnicao");
}
