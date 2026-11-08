import { NextResponse, type NextRequest } from "next/server";

// Barreira rápida: sem cookie de sessão, vai para o login.
// A checagem real (sessão válida + perfil) acontece no servidor em cada página.
export function proxy(request: NextRequest) {
  // O endereço principal é público: leva à agenda (src/app/page.tsx)
  if (request.nextUrl.pathname === "/") return NextResponse.next();
  const temSessao = request.cookies.has("ivas-session");
  if (!temSessao) {
    // Volta para a página pedida depois de entrar (ex.: o app da Guarnição instalado na tela inicial)
    // O app da Guarnição tem o seu próprio login
    const doApp = request.nextUrl.pathname.startsWith("/guarnicao");
    const login = new URL(doApp ? "/login-guarnicao" : "/login", request.url);
    const destino = request.nextUrl.pathname + request.nextUrl.search;
    if (destino !== "/") login.searchParams.set("next", destino);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|cadastro|aguardando-aprovacao|guarnicao-suspensa|_next|favicon.ico|icon|apple-icon|api/arquivo|api/og|api/auth|api/cron|evento|ritual|privacidade|termos|fundo_login|manifest.webmanifest|admin-app.webmanifest|guarnicao-app.webmanifest|sw.js|offline).*)"],
};
