/**
 * Limites e redução de imagens enviadas pelos formulários.
 *
 * As Functions da Vercel recusam corpos de requisição acima de 4,5 MB, seja qual for o
 * `bodySizeLimit` do next.config. Por isso as imagens são reduzidas no navegador antes do
 * envio e o servidor confere de novo os mesmos limites, mantendo cada envio abaixo de ~4 MB.
 */

const MB = 1024 * 1024;

/** Lado maior (px) e tamanho máximo do arquivo já reduzido, por uso. */
export const LIMITES_IMAGEM = {
  capa: { lado: 2000, maxBytes: 3.5 * MB },
  foto: { lado: 600, maxBytes: 2 * MB },
  // O formulário do Instituto pode mandar as duas logos juntas: 2 × 1,5 MB.
  logo: { lado: 1200, maxBytes: 1.5 * MB },
} as const;

export type UsoImagem = keyof typeof LIMITES_IMAGEM;

/** Maior arquivo aceito na escolha, antes da redução no navegador. */
export const ENTRADA_MAX = 25 * MB;

const RASTER = ["image/png", "image/jpeg", "image/webp"];

export function formatarMB(bytes: number) {
  return `${(bytes / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

/** Validação no servidor; devolve a mensagem de erro ou null. */
export function conferirImagem(arquivo: File, uso: UsoImagem): string | null {
  const svg = uso === "logo" && arquivo.type === "image/svg+xml";
  if (!svg && !RASTER.includes(arquivo.type)) return `A imagem precisa ser PNG, JPG ou WEBP${uso === "logo" ? " (ou SVG)" : ""}.`;
  const max = LIMITES_IMAGEM[uso].maxBytes;
  if (arquivo.size > max) return `A imagem ficou com ${formatarMB(arquivo.size)}; o máximo é ${formatarMB(max)}.`;
  return null;
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number) {
  return new Promise<Blob>((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Não foi possível converter a imagem."))), tipo, qualidade),
  );
}

/**
 * Reduz a imagem no navegador (lado maior e peso) e converte para WEBP — ou JPEG/PNG se o
 * navegador não gerar WEBP. SVG passa intacto. Lança Error com mensagem para o usuário.
 */
export async function otimizarImagem(arquivo: File, uso: UsoImagem): Promise<File> {
  const { lado, maxBytes } = LIMITES_IMAGEM[uso];
  if (uso === "logo" && arquivo.type === "image/svg+xml") {
    if (arquivo.size > maxBytes) throw new Error(`O SVG pode ter no máximo ${formatarMB(maxBytes)}.`);
    return arquivo;
  }
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha uma imagem PNG, JPG ou WEBP.");
  if (arquivo.size > ENTRADA_MAX) throw new Error(`A imagem pode ter no máximo ${formatarMB(ENTRADA_MAX)}.`);

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(arquivo);
  } catch {
    throw new Error("Não foi possível ler a imagem. Use PNG, JPG ou WEBP.");
  }
  try {
    const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    // Já pequena e leve: manda como está.
    if (escala === 1 && arquivo.size <= maxBytes && RASTER.includes(arquivo.type)) return arquivo;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
    // Logos mantêm a transparência; capas e fotos ganham fundo branco (caso caiam no JPEG).
    if (uso !== "logo") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

    for (const q of [0.86, 0.78, 0.68, 0.56]) {
      let blob = await paraBlob(canvas, "image/webp", q);
      if (blob.type !== "image/webp") blob = await paraBlob(canvas, uso === "logo" ? "image/png" : "image/jpeg", q);
      if (blob.size <= maxBytes) {
        const ext = blob.type.split("/")[1].replace("jpeg", "jpg");
        const nome = `${arquivo.name.replace(/\.[^.]*$/, "") || "imagem"}.${ext}`;
        return new File([blob], nome, { type: blob.type, lastModified: Date.now() });
      }
    }
    throw new Error(`Não foi possível deixar a imagem abaixo de ${formatarMB(maxBytes)}. Tente outra.`);
  } finally {
    bmp.close();
  }
}

/** Coloca o arquivo (ou nenhum) no `<input type="file">`, para seguir no envio do formulário. */
export function colocarNoInput(input: HTMLInputElement, arquivo: File | null) {
  const dt = new DataTransfer();
  if (arquivo) dt.items.add(arquivo);
  input.files = dt.files;
}
