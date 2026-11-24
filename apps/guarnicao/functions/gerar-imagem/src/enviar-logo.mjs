import sharp from "sharp";

/** Conversão só no primeiro envio; preserva transparência e limita tamanho. */
export async function enviarLogo(chave, fileId, storage) {
  const arquivo = await storage.getFile({ bucketId: "midia", fileId });
  if (arquivo.sizeOriginal > 10 * 1024 * 1024 || !/\.(png|jpe?g|webp|svg)$/i.test(arquivo.name)) throw new Error("Logo inválida. Use PNG, JPG, WebP ou SVG de até 10 MB.");
  const bytes = await storage.getFileView({ bucketId: "midia", fileId });
  const png = await sharp(Buffer.from(bytes), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const form = new FormData();
  form.set("purpose", "user_data");
  form.set("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "ivas_logo.png");
  const resposta = await fetch("https://api.openai.com/v1/files", { method: "POST", headers: { Authorization: "Bearer " + chave }, body: form, signal: AbortSignal.timeout(60_000) });
  if (!resposta.ok) throw new Error("Não foi possível sincronizar a logo com a OpenAI. Confira a chave e tente novamente.");
  const resultado = await resposta.json();
  if (typeof resultado.id !== "string" || !/^file-[A-Za-z0-9_-]+$/.test(resultado.id)) throw new Error("A OpenAI não retornou um File ID válido para a logo.");
  return resultado.id;
}
