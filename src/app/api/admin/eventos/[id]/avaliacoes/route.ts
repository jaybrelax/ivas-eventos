import { NextResponse } from "next/server";
import { getUsuario } from "@/lib/auth";
import { getEvento } from "@/lib/data";
import { pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { resumoDepoimentos } from "@/lib/depoimentos";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/eventos/[id]/avaliacoes">) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ erro: "Sessão necessária." }, { status: 401 });
  if (!pode(usuario, PODE.editarEventos)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const { id } = await ctx.params;
  const evento = await getEvento(id);
  if (!evento) return NextResponse.json({ erro: "Ritual não encontrado." }, { status: 404 });
  const resumo = await resumoDepoimentos(id);
  return NextResponse.json(resumo, { headers: { "Cache-Control": "private, no-store" } });
}
