"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { SESSION_COOKIE } from "@/lib/config";

export async function entrar(_: { erro?: string } | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED"))
      return { erro: "Não consegui falar com o Appwrite. Ele está rodando? Confira APPWRITE_ENDPOINT no .env.local." };
    return { erro: "E-mail ou senha incorretos." };
  }
  redirect("/eventos");
}

export async function sair() {
  const s = await createSessionClient();
  try {
    await s?.account.deleteSession({ sessionId: "current" });
  } catch {}
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
