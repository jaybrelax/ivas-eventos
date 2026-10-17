import { NextResponse, type NextRequest } from "next/server";

// Barreira rápida: sem cookie de sessão, vai para o login.
// A checagem real (sessão válida + perfil) acontece no servidor em cada página.
export function proxy(request: NextRequest) {
  const temSessao = request.cookies.has("ivas-session");
  if (!temSessao) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next|favicon.ico|api/arquivo).*)"],
};
