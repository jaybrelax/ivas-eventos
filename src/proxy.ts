import { NextResponse, type NextRequest } from "next/server";

// Barreira rápida: sem cookie de sessão, vai para o login.
// A checagem real (sessão válida + perfil) acontece no servidor em cada página.
export function proxy(request: NextRequest) {
  // O endereço principal redireciona para a Guarnição.
  if (request.nextUrl.pathname === "/") return NextResponse.next();
  const temSessao = request.cookies.has("ivas-session");
  if (!temSessao) {
    // Preserva a tela da Guarnição solicitada após o login.
    const login = new URL("/login-guarnicao", request.url);
    const destino = request.nextUrl.pathname + request.nextUrl.search;
    if (destino !== "/") login.searchParams.set("next", destino);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/guarnicao/:path*"],
};
