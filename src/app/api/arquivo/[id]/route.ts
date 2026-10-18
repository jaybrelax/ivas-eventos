import { createAdminClient } from "@/lib/appwrite";
import { BUCKET_ID } from "@/lib/config";

// Serve imagens do bucket (capas, logos, fotos) com cache público
export async function GET(_req: Request, ctx: RouteContext<"/api/arquivo/[id]">) {
  const { id } = await ctx.params;
  const { storage } = createAdminClient();
  try {
    const [arquivo, bytes] = await Promise.all([
      storage.getFile({ bucketId: BUCKET_ID, fileId: id }),
      storage.getFileView({ bucketId: BUCKET_ID, fileId: id }),
    ]);
    return new Response(bytes, {
      headers: {
        "Content-Type": arquivo.mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
