import sharp from "sharp";
import { createAdminClient } from "@/lib/appwrite";
import { BUCKET_ID } from "@/lib/config";

/**
 * Imagem de compartilhamento em JPEG (WhatsApp e algumas redes não mostram WEBP).
 * - Capa: reduzida para no máximo 1080 px e abaixo de ~300 KB (limite prático do WhatsApp).
 * - `?logo=1`: a logo centralizada sobre fundo branco em 1200×630 (eventos sem capa).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/og/[id]">) {
  const { id } = await ctx.params;
  const logo = new URL(req.url).searchParams.get("logo") === "1";
  const { storage } = createAdminClient();
  try {
    const bytes = Buffer.from(await storage.getFileView({ bucketId: BUCKET_ID, fileId: id }));
    const img = logo
      ? sharp({ create: { width: 1200, height: 630, channels: 3, background: "#ffffff" } }).composite([
          { input: await sharp(bytes).resize(760, 380, { fit: "inside" }).png().toBuffer(), gravity: "center" },
        ])
      : sharp(bytes).resize(1080, 1080, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" });
    const jpeg = await img.jpeg({ quality: logo ? 85 : 76, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
