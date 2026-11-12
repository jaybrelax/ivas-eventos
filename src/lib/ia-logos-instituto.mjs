import { createHash } from "node:crypto";

const MARCADORES = {
  logo_ivas_fundo_claro: { campo: "logo_file_id", nome: "logo colorida para fundo claro" },
  logo_ivas_fundo_escuro: { campo: "logo_escura_file_id", nome: "logo branca para fundo escuro" },
};

/** A reserva atômica no banco evita dois uploads simultâneos do mesmo arquivo. */
async function sincronizar(chave, fileId, deps) {
  const arquivo = await deps.obterArquivo(fileId);
  const hash = createHash("sha256").update(JSON.stringify([chave, fileId, arquivo.$updatedAt])).digest("hex");
  const cacheId = "ia-logo-" + hash.slice(0, 28);
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const cache = await deps.lerCache(cacheId);
    if (cache?.file_id) return cache.file_id;
    if (cache) {
      // Uma execução interrompida não deixa a reserva presa indefinidamente.
      if (Date.now() - cache.inicio > 180_000) {
        await deps.apagarCache(cacheId);
        continue;
      }
      await (deps.esperar || (() => new Promise(resolve => setTimeout(resolve, 1000))))();
      continue;
    }
    if (!await deps.reservarCache(cacheId, { inicio: Date.now() })) continue;
    try {
      const openaiId = await deps.enviar(fileId);
      await deps.salvarCache(cacheId, { file_id: openaiId, origem_file_id: fileId, versao: arquivo.$updatedAt });
      return openaiId;
    } catch (e) {
      await deps.apagarCache(cacheId).catch(() => {});
      throw e;
    }
  }
  throw new Error("A logo está sendo sincronizada. Aguarde alguns instantes e tente novamente.");
}

/** Os IDs persistidos são compartilhados por Eventos e pela função Appwrite. */
export async function prepararLogosInstituto(prompt, chave, manualId, deps) {
  const encontrados = [...new Set([...prompt.matchAll(/\{\{(logo_ivas|logo_ivas_fundo_claro|logo_ivas_fundo_escuro)\}\}/g)].map(m => m[1]))];
  if (!encontrados.length) return { prompt, images: [] };
  if (encontrados.includes("logo_ivas") && !manualId) throw new Error("Salve o File ID da OpenAI para {{logo_ivas}} ou use um dos marcadores das logos do Instituto.");
  const precisaInstituto = encontrados.some(k => k !== "logo_ivas");
  const instituto = precisaInstituto ? await deps.obterInstituto() : {};
  for (const nome of encontrados) {
    if (nome !== "logo_ivas" && !instituto[MARCADORES[nome].campo]) throw new Error("Cadastre a " + MARCADORES[nome].nome + " nas configurações do Instituto.");
  }
  const images = [], textos = {};
  for (const nome of encontrados) {
    const fileId = nome === "logo_ivas" ? manualId : await sincronizar(chave, instituto[MARCADORES[nome].campo], deps);
    let indice = images.findIndex(imagem => imagem.file_id === fileId);
    if (indice < 0) { images.push({ file_id: fileId }); indice = images.length - 1; }
    textos[nome] = "a imagem de referência " + (indice + 1) + " (" + (nome === "logo_ivas" ? "logo IVAS" : MARCADORES[nome].nome) + ")";
  }
  return { prompt: prompt.replace(/\{\{(logo_ivas|logo_ivas_fundo_claro|logo_ivas_fundo_escuro)\}\}/g, (_, nome) => textos[nome]), images };
}

/** Adaptador do cache em linhas independentes: não sobrescreve chave, prompt ou opções. */
export function cacheLogosAppwrite(tablesDB) {
  const base = { databaseId: "ivas", tableId: "instituto" };
  return {
    async obterInstituto() { return tablesDB.getRow({ ...base, rowId: "principal" }); },
    async lerCache(rowId) {
      try { const row = await tablesDB.getRow({ ...base, rowId }); return JSON.parse(row.config_imagem || "{}"); }
      catch (e) { if (e.code === 404) return null; throw e; }
    },
    async reservarCache(rowId, data) {
      try { await tablesDB.createRow({ ...base, rowId, data: { config_imagem: JSON.stringify(data) } }); return true; }
      catch (e) { if (e.code === 409) return false; throw e; }
    },
    async salvarCache(rowId, data) { await tablesDB.updateRow({ ...base, rowId, data: { config_imagem: JSON.stringify(data) } }); },
    async apagarCache(rowId) { await tablesDB.deleteRow({ ...base, rowId }); },
  };
}
