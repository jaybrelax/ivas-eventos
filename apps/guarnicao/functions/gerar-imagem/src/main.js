import { Account, Client, Query, Storage, TablesDB } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import sharp from "sharp";
import { montarPromptIA, dataParaPrompt, horarioParaPrompt } from "./prompt.js";
import { prepararLogosInstituto, cacheLogosAppwrite } from "./logos-instituto.mjs";
import { enviarLogo } from "./enviar-logo.mjs";
import { mensagemOpenAI, montarPedido } from "./pedido.js";

const BUCKET = "midia";
const PREFIXO_TEMP = "ia-temp-";

/**
 * Erros que o usuário deve ver. O Appwrite não guarda o corpo de uma execução assíncrona,
 * mas guarda os logs: os apps leem a linha IA_ERRO da execução.
 */
function falha(res, log, mensagem, status) {
  log("IA_ERRO " + JSON.stringify({ erro: mensagem }));
  return res.json({ ok: false, erro: mensagem }, status);
}

/** Arquivos temporários esquecidos (o app apaga o seu logo após ler; isto cobre falhas dele). */
async function limparTemporarios(storage) {
  try {
    const limite = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const lista = await storage.listFiles({ bucketId: BUCKET, queries: [Query.startsWith("name", PREFIXO_TEMP), Query.lessThan("$createdAt", limite), Query.limit(25)] });
    await Promise.all(lista.files.map((f) => storage.deleteFile({ bucketId: BUCKET, fileId: f.$id }).catch(() => {})));
  } catch { /* A limpeza nunca impede uma geração. */ }
}

/** A execução deve vir do SDK autenticado, sem expor a função por domínio HTTP. */
export default async function main({ req, res, log, error }) {
  const jwt = req.headers["x-appwrite-user-jwt"];
  const key = req.headers["x-appwrite-key"];
  const executionId = req.headers["x-appwrite-execution-id"];
  if (!jwt || !key) return falha(res, log, "Sessão inválida.", 401);
  // Sem o ID não há onde entregar o resultado: confere antes de gastar uma geração.
  if (!executionId) return falha(res, log, "Execução inválida.", 400);

  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  try {
    const usuario = await new Account(new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt)).get();
    if (!usuario.labels?.some((label) => label === "admin" || label === "coordenador" || label === "mestre")) {
      return falha(res, log, "Somente coordenadores e mestres podem gerar imagens.", 403);
    }

    const entrada = req.bodyJson ?? {};
    const titulo = String(entrada.titulo ?? "").trim().slice(0, 120);
    const descricao = String(entrada.descricao ?? "").trim().slice(0, 1500);
    const tipo = String(entrada.tipo ?? "").trim().slice(0, 120);
    if (!titulo && !descricao) return falha(res, log, "Preencha o título ou a descrição do evento para a IA ter o que ilustrar.", 400);

    const admin = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
    const db = new TablesDB(admin);
    const storage = new Storage(admin);
    const config = await db.getRow({ databaseId: "ivas", tableId: "instituto", rowId: "ia" });
    const chave = config.openai_api_key?.trim();
    if (!chave) return falha(res, log, "Cadastre a chave da OpenAI em Configurações › Chaves API.", 400);

    let opcoes = {};
    try { opcoes = JSON.parse(config.config_imagem || "{}"); } catch { /* Configuração anterior: usa os padrões. */ }
    const prompt = config.prompt_imagem?.trim() || "";
    const detalhes = [titulo && `Título do evento: ${titulo}`, tipo && `Tipo: ${tipo}`, descricao && `Descrição do evento:\n${descricao}`].filter(Boolean);

    let local = String(entrada.enderecoLivre ?? "").trim().slice(0, 500);
    if (entrada.enderecoId && entrada.enderecoId !== "__livre") {
      const end = await db.getRow({ databaseId: "ivas", tableId: "enderecos", rowId: String(entrada.enderecoId) });
      local = [end.apelido, end.endereco, end.cidade].filter(Boolean).join(" — ");
    }
    const numero = Number(entrada.numeroGeral);
    const valores = {
      art_direction: typeof opcoes.art_direction === "string" ? opcoes.art_direction : "",
      titulo_ritual: titulo,
      data_ritual: dataParaPrompt(String(entrada.data ?? "")),
      horario_ritual: horarioParaPrompt(String(entrada.horaInicio ?? "")),
      numero_ritual: Number.isSafeInteger(numero) && numero > 0 ? String(numero) : "",
      local_ritual: local,
    };

    let comando = "";
    let referencias = [];
    try {
      if (prompt) {
        montarPromptIA(prompt, valores); // Valida os dados antes de sincronizar qualquer arquivo.
        const logos = await prepararLogosInstituto(prompt, chave, opcoes.logo_openai_file_id, {
          ...cacheLogosAppwrite(db),
          obterArquivo: (fileId) => storage.getFile({ bucketId: BUCKET, fileId }),
          enviar: (fileId) => enviarLogo(chave, fileId, storage),
        });
        comando = montarPromptIA(logos.prompt, valores);
        referencias = [...logos.images];
      }
    } catch (e) { return falha(res, log, e instanceof Error ? e.message : "Não foi possível preparar os dados e as logos do ritual.", 400); }
    const usaLogo = referencias.length > 0;

    // Ajuste da capa atual: a imagem salva do evento entra como a última referência.
    const capaFileId = String(entrada.capaFileId ?? "").trim();
    const usaCapa = capaFileId !== "";
    if (usaCapa) {
      try {
        const atual = await storage.getFileView({ bucketId: BUCKET, fileId: capaFileId });
        const png = await sharp(Buffer.from(atual), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        referencias.push({ image_url: `data:image/png;base64,${png.toString("base64")}` });
      } catch { return falha(res, log, "Não foi possível ler a imagem atual. Tente gerar uma nova imagem sem usá-la como referência.", 400); }
    }

    let pedido;
    try { pedido = montarPedido({ comando, detalhes, usaLogo, usaCapa, ajustes: entrada.ajustes }); }
    catch (e) { return falha(res, log, e.message, 400); }

    const formato = opcoes.output_format || "webp";
    const parametros = {
      model: opcoes.model || "gpt-image-2.5-flare", size: opcoes.size || "1024x1024", quality: opcoes.quality || "low",
      output_format: formato, background: opcoes.background || "auto", moderation: opcoes.moderation || "auto", n: 1, prompt: pedido,
    };
    let resposta;
    try {
      resposta = await fetch(`https://api.openai.com/v1/images/${referencias.length ? "edits" : "generations"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...parametros, ...(referencias.length ? { images: referencias } : {}) }),
        signal: AbortSignal.timeout(150_000),
      });
    } catch {
      return falha(res, log, "A geração demorou demais ou a conexão falhou. Tente de novo.", 504);
    }
    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => "");
      error(`OpenAI ${resposta.status}: ${texto.slice(0, 300)}`);
      return falha(res, log, mensagemOpenAI(resposta.status, texto), 502);
    }
    const json = await resposta.json();
    const base64 = json.data?.[0]?.b64_json;
    if (!base64) return falha(res, log, "A imagem veio em formato inesperado. Tente de novo.", 502);

    // O ID da execução identifica o arquivo temporário. O bucket é privado: só o servidor dos apps o lê.
    await limparTemporarios(storage);
    await storage.createFile({ bucketId: BUCKET, fileId: executionId, file: InputFile.fromBuffer(Buffer.from(base64, "base64"), `${PREFIXO_TEMP}${executionId}.${formato}`) });
    return res.json({ ok: true });
  } catch (e) {
    error(`Falha ao gerar imagem: ${e instanceof Error ? e.message : "erro inesperado"}`);
    return falha(res, log, "Não foi possível gerar a imagem. Tente novamente.", 500);
  }
}
