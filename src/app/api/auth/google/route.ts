import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { destinoGuarnicao, destinoSeguro, ehDestinoGuarnicao } from "@/lib/destino-auth";

/**
 * Início do login/cadastro com um clique pelo Google: o próprio app fala com o Google
 * (não passa pelo domínio do Appwrite, só usado para guardar a conta depois do retorno).
 */
export async function GET(req: NextRequest) {
  const retorno = destinoSeguro(req.nextUrl.searchParams.get("next"));
  const guardiao = req.nextUrl.searchParams.get("guardiao") === "1";
  const doApp = guardiao || ehDestinoGuarnicao(retorno);
  const next = doApp ? destinoGuarnicao(retorno) : retorno;
  const login = doApp ? "/login-guarnicao" : "/login";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID ausente no .env.local");
    const falha = new URL(`${login}?erro=google`, req.url);
    if (next) falha.searchParams.set("next", next);
    return NextResponse.redirect(falha);
  }

  const origem = req.nextUrl.searchParams.get("origem") === "cadastro" ? "cadastro" : null;
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
  const state = randomBytes(16).toString("hex");

  (await cookies()).set("google_oauth_state", JSON.stringify({ state, next, guardiao, origem }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 min: só durante a ida e volta ao Google
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  // Só o perfil básico (nome, e-mail, foto): escopos não sensíveis, sem precisar da verificação do Google.
  // Telefone, CPF, endereço e nascimento a pessoa completa logo depois, em "Meus dados".
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url);
}
