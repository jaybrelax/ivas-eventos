import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ID, Query } from "node-appwrite";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { createAdminClient } from "@/lib/appwrite";
import { BUCKET_ID, LABEL_PARTICIPANTE, SESSION_COOKIE } from "@/lib/config";
import { ehParticipante, perfilDosLabels } from "@/lib/usuarios";
import { destinoGuarnicao, destinoSeguro, ehDestinoGuarnicao } from "@/lib/destino-auth";

type PerfilGoogle = { email: string; email_verified: boolean; name?: string; picture?: string };

/** Baixa a foto de perfil do Google (quando houver) e manda pro bucket, para usar como foto do usuário. */
async function baixarFotoGoogle(storage: ReturnType<typeof createAdminClient>["storage"], url: string): Promise<string | null> {
  try {
    // Google entrega uma miniatura pequena (=s96-c); pede uma versão maior quando o padrão bate.
    const maior = url.replace(/=s\d+-c$/, "=s400-c");
    const r = await fetch(maior);
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") ?? "";
    if (!tipo.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength > 2 * 1024 * 1024) return null; // mesmo limite de "foto" em src/lib/imagem.ts
    const arquivo = await storage.createFile({ bucketId: BUCKET_ID, fileId: ID.unique(), file: (await arquivoOtimizado(buf, "google.jpg", "foto")).input });
    return arquivo.$id;
  } catch (e) {
    console.error("Foto do Google:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Troca o código de autorização pelos tokens do Google. */
async function trocarCodigo(code: string, redirectUri: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`Token do Google: ${r.status} ${await r.text()}`);
  return r.json() as Promise<{ access_token: string }>;
}

/** Busca o perfil (e-mail, nome) com o access_token recém-obtido. */
async function buscarPerfil(accessToken: string): Promise<PerfilGoogle> {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`Perfil do Google: ${r.status} ${await r.text()}`);
  return r.json();
}

/** Volta do Google: troca o código, acha/cria a conta no Appwrite e loga, sem depender do domínio do Appwrite. */
export async function GET(req: NextRequest) {
  const falha = new URL("/login?erro=google", req.url);
  const code = req.nextUrl.searchParams.get("code");
  const stateRecebido = req.nextUrl.searchParams.get("state");
  const jar = await cookies();
  const bruto = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");

  if (!bruto) return NextResponse.redirect(falha);
  let estado: { state: string; next: string | null; guardiao?: boolean; origem?: "cadastro" | null };
  try {
    estado = JSON.parse(bruto);
  } catch {
    return NextResponse.redirect(falha);
  }
  // Quem veio do app da Guarnição volta para o login do app se algo falhar
  const doApp = estado.guardiao === true || ehDestinoGuarnicao(estado.next);
  const next = doApp ? destinoGuarnicao(estado.next) : destinoSeguro(estado.next);
  const base = doApp ? "/login-guarnicao" : "/login";
  const falhaApp = new URL(`${base}?erro=google`, req.url);
  if (next) falhaApp.searchParams.set("next", next);
  if (!code || !stateRecebido || estado.state !== stateRecebido) return NextResponse.redirect(falhaApp);

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
    const { access_token } = await trocarCodigo(code, redirectUri);
    const perfil = await buscarPerfil(access_token);
    if (!perfil.email || !perfil.email_verified) {
      falhaApp.searchParams.set("erro", "google-email");
      return NextResponse.redirect(falhaApp);
    }

    const { users, storage } = createAdminClient();
    const existentes = await users.list({ queries: [Query.equal("email", perfil.email.toLowerCase()), Query.limit(1)] });
    let userId = existentes.users[0]?.$id;
    const contaNova = !userId;

    if (!userId) {
      const novo = await users.create({ userId: ID.unique(), email: perfil.email.toLowerCase(), name: perfil.name || perfil.email });
      userId = novo.$id;
      await users.updateLabels({ userId, labels: [LABEL_PARTICIPANTE] });
      const fotoId = perfil.picture ? await baixarFotoGoogle(storage, perfil.picture) : null;
      await users.updatePrefs({ userId, prefs: doApp
        ? { funcao_ritual: "nenhuma", cadastro_guarnicao_incompleto: true, foto_file_id: fotoId }
        : { funcao_ritual: "nenhuma", foto_file_id: fotoId } });
    }

    const contaAtual = await users.get({ userId });
    const prefs = (contaAtual.prefs ?? {}) as { guarnicao_situacao?: string; guarnicao_solicitacao?: boolean; cadastro_guarnicao_incompleto?: boolean; guarnicao_cargo_removido?: boolean; funcao_ritual?: string };
    // Pedido de acesso à Guarnição ainda não aprovado pela coordenação
    if (prefs.guarnicao_situacao === "pendente" && prefs.guarnicao_solicitacao === true)
      return NextResponse.redirect(new URL("/aguardando-aprovacao", req.url));
    const perfilAcesso = perfilDosLabels(contaAtual.labels);
    // Conta nova sem perfil de equipe e sem cadastro de participante ainda: primeiro login pelo Google vira participante.
    if (!perfilAcesso && !ehParticipante(contaAtual.labels)) {
      await users.updateLabels({ userId, labels: [...contaAtual.labels, LABEL_PARTICIPANTE] });
    }

    // Sessão real via API admin, sem precisar de senha.
    const sessao = await users.createSession({ userId });

    jar.set(SESSION_COOKIE, sessao.secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(sessao.expire),
    });

    // Conta nova pelo Google: WhatsApp, CPF, endereço e nascimento não vêm de lá, então completa o cadastro antes de seguir.
    // Quem clicou em "Criar cadastro com o Google" na própria tela de cadastro continua ali para completar os dados.
    // No app da Guarnição, quem ainda não é guardião (e não teve o cargo retirado) completa o cadastro dele e entra na aprovação.
    const semAcessoGuarnicao = !prefs.guarnicao_cargo_removido && (perfilAcesso === null || perfilAcesso === "normal") && prefs.funcao_ritual !== "guardiao" && prefs.funcao_ritual !== "mestre";
    const telaCompletar = estado.origem === "cadastro" ? "/cadastro" : "/minha-conta/dados";
    const destino = doApp
      ? contaNova || prefs.cadastro_guarnicao_incompleto === true || semAcessoGuarnicao
        ? `/cadastro-guarnicao?completar=1&next=${encodeURIComponent(next ?? "/guarnicao")}`
        : (next ?? "/guarnicao")
      : contaNova
        ? `${telaCompletar}?completar=1${next ? `&next=${encodeURIComponent(next)}` : ""}`
        : (next ?? (perfilAcesso ? "/admin/eventos" : "/minha-conta"));
    return NextResponse.redirect(new URL(destino, req.url));
  } catch (e) {
    console.error("OAuth Google (retorno):", e instanceof Error ? e.message : e);
    return NextResponse.redirect(falhaApp);
  }
}
