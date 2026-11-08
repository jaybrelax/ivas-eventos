import sharp from "sharp";
import { createAdminClient } from "@/lib/appwrite";
import { BUCKET_ID } from "@/lib/config";
import { LARGURAS_IMAGEM } from "@/lib/links";

// O id de um arquivo nunca muda de conteúdo (trocar a capa gera outro id): pode ficar em cache por 1 ano, inclusive na CDN.
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

/** Largura pedida → a permitida mais próxima acima (limita a quantidade de versões guardadas na CDN). */
function larguraPermitida(bruto: string | null): number | null {
  const w = Number(bruto);
  if (!bruto || !Number.isFinite(w) || w <= 0) return null;
  return LARGURAS_IMAGEM.find((l) => l >= w) ?? LARGURAS_IMAGEM[LARGURAS_IMAGEM.length - 1];
}

/**
 * Serve imagens do bucket (capas, logos, fotos). Com `?w=` devolve uma versão reduzida em WEBP,
 * para cada tela baixar só o tamanho de que precisa (card, miniatura, avatar).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/arquivo/[id]">) {
  const { id } = await ctx.params;
  const w = larguraPermitida(new URL(req.url).searchParams.get("w"));
  const { storage } = createAdminClient();
  try {
    const [arquivo, bytes] = await Promise.all([
      storage.getFile({ bucketId: BUCKET_ID, fileId: id }),
      storage.getFileView({ bucketId: BUCKET_ID, fileId: id }),
    ]);
    if (w && arquivo.mimeType !== "image/svg+xml") {
      const reduzida = await sharp(Buffer.from(bytes), { failOn: "none" })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w <= 128 ? 45 : w <= 320 ? 72 : 78, effort: 4 })
        .toBuffer();
      return new Response(new Uint8Array(reduzida), { headers: { "Content-Type": "image/webp", "Cache-Control": CACHE } });
    }
    return new Response(bytes, { headers: { "Content-Type": arquivo.mimeType, "Cache-Control": CACHE } });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
