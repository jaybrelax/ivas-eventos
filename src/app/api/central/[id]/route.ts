import sharp from "sharp";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { getUsuario } from "@/lib/auth";
import { CENTRAL_BUCKET_ID, DB_ID, TABLES } from "@/lib/config";
import { getEvento } from "@/lib/data";
import { guardioesDoEvento, podeVerCentral } from "@/lib/central";
import { LARGURAS_IMAGEM } from "@/lib/links";

/** Largura pedida → a permitida mais próxima acima (mesma regra de /api/arquivo). */
function larguraPermitida(bruto: string | null): number | null {
  const w = Number(bruto);
  if (!bruto || !Number.isFinite(w) || w <= 0) return null;
  return LARGURAS_IMAGEM.find((l) => l >= w) ?? LARGURAS_IMAGEM[LARGURAS_IMAGEM.length - 1];
}

/**
 * Serve uma foto da Central do evento. Exige login e só entrega a quem pode ver a Central daquele
 * evento (equipe: coordenação, mestres escalados e guardiões do ritual). Com `?w=` devolve versão reduzida.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/central/[id]">) {
  const { id } = await ctx.params;
  const u = await getUsuario();
  if (!u) return new Response("Não autorizado", { status: 401 });

  const { tablesDB, storage } = createAdminClient();
  const res = await tablesDB.listRows({ databaseId: DB_ID, tableId: TABLES.central, queries: [Query.contains("imagens", id), Query.limit(1)] }).catch(() => null);
  const post = res?.rows[0] as unknown as { evento_id: string; autor_id: string } | undefined;
  if (!post) {
    // Foto ainda no rascunho: só quem enviou vê a prévia
    const arq = await storage.getFile({ bucketId: CENTRAL_BUCKET_ID, fileId: id }).catch(() => null);
    if (!arq?.name.startsWith(`central-${u.id}-`)) return new Response("Não encontrado", { status: 404 });
  } else {
    const evento = await getEvento(post.evento_id);
    if (!evento || !podeVerCentral(u, evento, await guardioesDoEvento(evento))) return new Response("Não encontrado", { status: 404 });
  }

  const w = larguraPermitida(new URL(req.url).searchParams.get("w"));
  try {
    const [arquivo, bytes] = await Promise.all([
      storage.getFile({ bucketId: CENTRAL_BUCKET_ID, fileId: id }),
      storage.getFileView({ bucketId: CENTRAL_BUCKET_ID, fileId: id }),
    ]);
    // O conteúdo de um id nunca muda: pode ficar em cache no navegador (privado, nunca na CDN)
    const cache = "private, max-age=86400";
    if (w) {
      const reduzida = await sharp(Buffer.from(bytes), { failOn: "none" })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w <= 320 ? 70 : 78, effort: 4 })
        .toBuffer();
      return new Response(new Uint8Array(reduzida), { headers: { "Content-Type": "image/webp", "Cache-Control": cache } });
    }
    return new Response(bytes, { headers: { "Content-Type": arquivo.mimeType, "Cache-Control": cache } });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
