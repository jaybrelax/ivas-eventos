import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getUsuario } from "@/lib/auth";
import { COMPROVANTES_BUCKET_ID, PODE, TABLES } from "@/lib/config";
import { getEvento, listar } from "@/lib/data";
import { podeGerenciarEvento } from "@/lib/gestao-evento";
import type { Inscricao, Pacote } from "@/lib/types";

/**
 * Serve um comprovante de pagamento — diferente de /api/arquivo/[id], exige login e só deixa
 * ver quem enviou o comprovante, a coordenação (admin/coordenador) ou o mestre escalado no evento.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/comprovante/[id]">) {
  const { id } = await ctx.params;
  const u = await getUsuario();
  if (!u) return new Response("Não autorizado", { status: 401 });

  const ehEquipe = !!u.perfil && PODE.editarEventos.includes(u.perfil);
  if (!ehEquipe) {
    const [insc] = await listar<Inscricao>(TABLES.inscricoes, [Query.equal("comprovante_file_id", id), Query.limit(1)]);
    if (!insc) {
      // Comprovante de um pacote de créditos: só quem comprou (ou a coordenação) vê
      const [pacote] = await listar<Pacote>(TABLES.pacotes, [Query.equal("comprovante_file_id", id), Query.limit(1)]);
      if (!pacote || pacote.usuario_id !== u.id) return new Response("Não encontrado", { status: 404 });
    } else if (insc.usuario_id !== u.id) {
      // O mestre escalado no evento gerencia as contribuições dele
      const evento = await getEvento(insc.evento_id);
      if (!evento || !podeGerenciarEvento(u, evento)) return new Response("Não encontrado", { status: 404 });
    }
  }

  const { storage } = createAdminClient();
  try {
    const [arquivo, bytes] = await Promise.all([
      storage.getFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: id }),
      storage.getFileView({ bucketId: COMPROVANTES_BUCKET_ID, fileId: id }),
    ]);
    return new Response(bytes, {
      headers: { "Content-Type": arquivo.mimeType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
