/**
 * Otimiza, uma única vez, as imagens já guardadas no bucket "midia" (capas, fotos e logos antigas).
 * Mantém o MESMO id de cada arquivo, então nada no banco precisa mudar.
 *
 *   node --env-file=.env.local scripts/otimizar-imagens.mjs --simular   → só mostra antes/depois
 *   node --env-file=.env.local scripts/otimizar-imagens.mjs             → faz backup e grava
 *
 * Antes de gravar, cada original é baixado para backup-imagens/<id>-<nome>.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { Client, Query, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const BUCKET = "midia";
const SIMULAR = process.argv.includes("--simular");
const PASTA = "backup-imagens";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Faltam APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID ou APPWRITE_API_KEY (.env.local).");
  process.exit(1);
}
const storage = new Storage(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

// Mesmas regras de src/lib/imagem-servidor.ts: com transparência (logos) → WEBP sem perda; demais → capa
async function otimizar(bytes) {
  const img = sharp(bytes, { failOn: "none" });
  const meta = await img.metadata();
  const transparente = meta.hasAlpha && (await img.stats()).isOpaque === false;
  const base = sharp(bytes, { failOn: "none" }).rotate();
  return transparente
    ? base.resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ lossless: true, effort: 5 }).toBuffer()
    : base.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 6, smartSubsample: true }).toBuffer();
}

const arquivos = [];
for (let pagina = 0; ; pagina += 100) {
  const r = await storage.listFiles({ bucketId: BUCKET, queries: [Query.limit(100), Query.offset(pagina)] });
  arquivos.push(...r.files);
  if (r.files.length < 100) break;
}
console.log(`${arquivos.length} arquivo(s) no bucket "${BUCKET}"${SIMULAR ? " — SIMULAÇÃO, nada será gravado" : ""}\n`);
if (!SIMULAR) fs.mkdirSync(PASTA, { recursive: true });

let antes = 0, depois = 0, trocados = 0;
for (const f of arquivos) {
  antes += f.sizeOriginal;
  if (f.mimeType === "image/svg+xml" || !f.mimeType.startsWith("image/")) {
    depois += f.sizeOriginal;
    console.log(`  =  ${f.name.padEnd(36)} ${kb(f.sizeOriginal).padStart(8)}  (mantido: ${f.mimeType})`);
    continue;
  }
  const bytes = Buffer.from(await storage.getFileView({ bucketId: BUCKET, fileId: f.$id }));
  let novo;
  try {
    novo = await otimizar(bytes);
  } catch (e) {
    depois += bytes.length;
    console.log(`  !  ${f.name.padEnd(36)} erro ao processar: ${e.message}`);
    continue;
  }
  if (novo.length >= bytes.length * 0.95) {
    depois += bytes.length;
    console.log(`  =  ${f.name.padEnd(36)} ${kb(bytes.length).padStart(8)}  (já está enxuto)`);
    continue;
  }
  const nome = `${f.name.replace(/\.[^.]*$/, "") || "imagem"}.webp`;
  console.log(`  ↓  ${f.name.padEnd(36)} ${kb(bytes.length).padStart(8)} → ${kb(novo.length).padStart(8)}  (-${Math.round((1 - novo.length / bytes.length) * 100)}%)`);
  depois += novo.length;
  trocados++;
  if (SIMULAR) continue;

  fs.writeFileSync(path.join(PASTA, `${f.$id}-${f.name}`), bytes);
  await storage.deleteFile({ bucketId: BUCKET, fileId: f.$id });
  try {
    await storage.createFile({ bucketId: BUCKET, fileId: f.$id, file: InputFile.fromBuffer(novo, nome) });
  } catch (e) {
    // Falhou ao recriar: volta o original com o mesmo id
    console.error(`     falhou ao gravar a versão otimizada (${e.message}); restaurando o original…`);
    await storage.createFile({ bucketId: BUCKET, fileId: f.$id, file: InputFile.fromBuffer(bytes, f.name) });
  }
}

console.log(`\nTotal: ${kb(antes)} → ${kb(depois)} (${trocados} arquivo(s) ${SIMULAR ? "seriam otimizados" : "otimizados"}, -${Math.round((1 - depois / antes) * 100)}%)`);
if (!SIMULAR) console.log(`Originais guardados em ${PASTA}/`);
