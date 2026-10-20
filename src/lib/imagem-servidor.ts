import "server-only";
import sharp from "sharp";
import { InputFile } from "node-appwrite/file";
import type { UsoImagem } from "./imagem";

/**
 * Otimização final no servidor, antes de gravar no Storage: corrige a rotação, tira os
 * metadados (EXIF/GPS de foto de celular), reduz ao tamanho de uso e salva em WEBP.
 * O navegador já reduz antes do envio (src/lib/imagem.ts); aqui garantimos o padrão
 * mesmo quando a imagem chega sem passar por lá.
 */
const REGRAS: Record<UsoImagem, { lado: number; qualidade: number; semPerda?: boolean }> = {
  capa: { lado: 1600, qualidade: 78 },
  foto: { lado: 600, qualidade: 80 },
  comprovante: { lado: 1600, qualidade: 75 },
  // Logos mantêm a transparência e os contornos nítidos
  logo: { lado: 1200, qualidade: 90, semPerda: true },
};

export async function prepararImagem(bytes: Buffer, nome: string, uso: UsoImagem): Promise<{ bytes: Buffer; nome: string }> {
  // SVG é vetor: já é leve e não deve virar bitmap
  if (uso === "logo" && /\.svg$/i.test(nome)) return { bytes, nome };
  const r = REGRAS[uso];
  try {
    const saida = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width: r.lado, height: r.lado, fit: "inside", withoutEnlargement: true })
      .webp(r.semPerda ? { lossless: true, effort: 5 } : { quality: r.qualidade, effort: 6, smartSubsample: true })
      .toBuffer();
    const base = nome.replace(/\.[^.]*$/, "") || "imagem";
    // Se por algum motivo ficar maior que o original (já era um WEBP enxuto), mantém o original
    return saida.length < bytes.length || !/\.webp$/i.test(nome) ? { bytes: saida, nome: `${base}.webp` } : { bytes, nome };
  } catch (e) {
    console.error("Otimizar imagem:", e instanceof Error ? e.message : e);
    return { bytes, nome };
  }
}

/** Atalho: arquivo enviado pelo formulário → InputFile otimizado (e os bytes, para quem precisar ler a imagem). */
export async function arquivoOtimizado(arquivo: File | Buffer, nome: string, uso: UsoImagem) {
  const bruto = Buffer.isBuffer(arquivo) ? arquivo : Buffer.from(await arquivo.arrayBuffer());
  const pronto = await prepararImagem(bruto, nome, uso);
  return { input: InputFile.fromBuffer(pronto.bytes, pronto.nome), bytes: pronto.bytes };
}
