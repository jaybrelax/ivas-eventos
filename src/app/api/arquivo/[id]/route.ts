import { createAdminClient } from "@/lib/appwrite";
import { BUCKET_ID } from "@/lib/config";
import { getUsuario } from "@/lib/auth";
import { getInstituto } from "@/lib/data";

// Serve imagens do bucket (logo, fundos) pela mesma origem do painel,
// para o gerador de banner conseguir embutir a imagem no PNG.
export async function GET(_req: Request, ctx: RouteContext<"/api/arquivo/[id]">) {
  const { id } = await ctx.params;
  if (!(await getUsuario())) {
    // Sem login, só as logos do Instituto (usadas na tela de entrada).
    const { logo_file_id, logo_escura_file_id } = await getInstituto();
    if (id !== logo_file_id && id !== logo_escura_file_id) return new Response("Não autorizado", { status: 401 });
  }
  const { storage } = createAdminClient();
  try {
    const [arquivo, bytes] = await Promise.all([
      storage.getFile({ bucketId: BUCKET_ID, fileId: id }),
      storage.getFileView({ bucketId: BUCKET_ID, fileId: id }),
    ]);
    return new Response(bytes, {
      headers: { "Content-Type": arquivo.mimeType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
