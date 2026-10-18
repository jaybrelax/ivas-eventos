"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { BUCKET_ID, DB_ID, IA_ROW_ID, INSTITUTO_ROW_ID, TABLES } from "@/lib/config";
import { getConfigIA } from "@/lib/ia";
import { FONTES_TEXTO, FONTES_TITULO, fonteValida } from "@/lib/tipografia";
import { getInstituto, listarTipos } from "@/lib/data";
import { slugify } from "@/lib/format";
import { conferirImagem } from "@/lib/imagem";
import { CAMPOS, type Campo, type TabelaEditavel } from "./campos";

export type Resultado = { ok?: string; erro?: string } | undefined;

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function salvarInstituto(_: Resultado, form: FormData): Promise<Resultado> {
  await exigir(["admin"]);
  const { tablesDB, storage } = createAdminClient();
  const atual = await getInstituto();
  const texto = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);

  const dados: Record<string, unknown> = {
    nome: texto("nome", 120) || "Instituto IVAS",
    nome_curto: texto("nome_curto", 40),
    cor_primaria: HEX.test(texto("cor_primaria", 9)) ? texto("cor_primaria", 9) : atual.cor_primaria,
    cor_secundaria: HEX.test(texto("cor_secundaria", 9)) ? texto("cor_secundaria", 9) : atual.cor_secundaria,
    fonte_titulo: texto("fonte_titulo", 60) || atual.fonte_titulo,
    fonte_texto: texto("fonte_texto", 60) || atual.fonte_texto,
    ritual_numero_inicial: Math.max(1, Number(form.get("ritual_numero_inicial")) || atual.ritual_numero_inicial),
  };

  for (const nome of ["logo", "logo_escura"]) {
    const arquivo = form.get(nome);
    const invalida = arquivo instanceof File && arquivo.size > 0 ? conferirImagem(arquivo, "logo") : null;
    if (invalida) return { erro: invalida };
  }

  try {
    for (const campo of ["logo_file_id", "logo_escura_file_id"] as const) {
      const arquivo = form.get(campo.replace("_file_id", ""));
      const remover = form.get(`remover_${campo}`) === "on";
      const antigo = atual[campo];
      if (arquivo instanceof File && arquivo.size > 0) {
        const buf = Buffer.from(await arquivo.arrayBuffer());
        const novo = await storage.createFile({ bucketId: BUCKET_ID, fileId: ID.unique(), file: InputFile.fromBuffer(buf, arquivo.name) });
        dados[campo] = novo.$id;
        if (antigo) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: antigo }).catch(() => {});
      } else if (remover && antigo) {
        dados[campo] = null;
        await storage.deleteFile({ bucketId: BUCKET_ID, fileId: antigo }).catch(() => {});
      }
    }
    await tablesDB.upsertRow({ databaseId: DB_ID, tableId: TABLES.instituto, rowId: INSTITUTO_ROW_ID, data: dados });
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível salvar. Confira o formato da imagem (PNG, JPG, WEBP ou SVG)." };
  }
  revalidatePath("/", "layout");
  return { ok: "Dados do Instituto salvos." };
}

/** Fontes da página pública (título dos eventos e textos). */
export async function salvarTipografia(_: Resultado, form: FormData): Promise<Resultado> {
  await exigir(["admin"]);
  const { tablesDB } = createAdminClient();
  const titulo = fonteValida(form.get("fonte_publica_titulo"), FONTES_TITULO);
  const texto = fonteValida(form.get("fonte_publica_texto"), FONTES_TEXTO);
  if (!titulo || !texto) return { erro: "Escolha uma fonte da lista." };
  try {
    await tablesDB.upsertRow({
      databaseId: DB_ID, tableId: TABLES.instituto, rowId: INSTITUTO_ROW_ID,
      data: { fonte_publica_titulo: titulo, fonte_publica_texto: texto },
    });
  } catch (e) {
    console.error("Tipografia:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: "Tipografia salva. A página pública já usa as novas fontes." };
}

/** Chave da OpenAI e prompt das capas geradas por IA. Chave em branco mantém a atual. */
export async function salvarChavesApi(_: Resultado, form: FormData): Promise<Resultado> {
  await exigir(["admin"]);
  const { tablesDB } = createAdminClient();
  const nova = String(form.get("openai_api_key") ?? "").trim();
  if (nova && !/^sk-[A-Za-z0-9_-]{20,250}$/.test(nova)) return { erro: "Essa chave não parece válida. Ela começa com “sk-” e não pode ter espaços." };
  const atual = await getConfigIA();
  const dados: Record<string, unknown> = { prompt_imagem: String(form.get("prompt_imagem") ?? "").trim().slice(0, 3000) || null };
  if (nova) dados.openai_api_key = nova;
  else if (form.get("remover_chave") === "on") dados.openai_api_key = null;
  else if (atual.chave) dados.openai_api_key = atual.chave;
  try {
    await tablesDB.upsertRow({ databaseId: DB_ID, tableId: TABLES.instituto, rowId: IA_ROW_ID, data: dados });
  } catch (e) {
    console.error("Chaves API:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/eventos", "layout");
  return { ok: nova ? "Chave e prompt salvos." : "Prompt salvo." };
}

/** Textos fixos que aparecem na página de todo ritual: informações gerais e contribuição. */
export async function salvarInformacoes(_: Resultado, form: FormData): Promise<Resultado> {
  await exigir(["admin"]);
  const { tablesDB } = createAdminClient();
  const texto = (k: string) => String(form.get(k) ?? "").trim().slice(0, 5000) || null;
  try {
    await tablesDB.upsertRow({
      databaseId: DB_ID, tableId: TABLES.instituto, rowId: INSTITUTO_ROW_ID,
      data: { info_rituais: texto("info_rituais"), info_contribuicao: texto("info_contribuicao") },
    });
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível salvar as informações. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: "Informações salvas." };
}

export async function salvarItem(tabela: TabelaEditavel, _: Resultado, form: FormData): Promise<Resultado> {
  await exigir(["admin"]);
  const def = CAMPOS[tabela];
  const id = String(form.get("$id") ?? "");
  const dados: Record<string, unknown> = {};

  for (const c of def.campos as Campo[]) {
    const bruto = form.get(c.nome);
    if (c.tipo === "checkbox") dados[c.nome] = bruto === "on";
    else if (c.tipo === "number") dados[c.nome] = Number(bruto) || 0;
    else {
      const v = String(bruto ?? "").trim();
      if (c.obrigatorio && !v) return { erro: `Preencha “${c.rotulo}”.` };
      dados[c.nome] = v || null;
    }
  }
  if (tabela === "tipos") {
    // Ícone: nome de um ícone da biblioteca Lucide (letras, números e hífen).
    if (dados.icone && !/^[a-z0-9-]{1,30}$/.test(String(dados.icone))) dados.icone = null;
    if (typeof dados.descricao === "string") dados.descricao = dados.descricao.slice(0, 1000);
    if (!id) {
      dados.slug = slugify(String(dados.nome)) + "-" + Date.now().toString(36);
      // Sem campo de ordem na tela: o tipo novo entra no fim da lista.
      const ultimos = await listarTipos();
      dados.ordem = Math.max(0, ...ultimos.map((t) => t.ordem ?? 0)) + 1;
    }
  }

  const { tablesDB } = createAdminClient();
  const tableId = TABLES[tabela];
  try {
    if (dados.padrao === true) {
      // Só um item pode ser o padrão.
      const outros = await tablesDB.listRows({ databaseId: DB_ID, tableId, queries: [Query.equal("padrao", true), Query.limit(100)] });
      for (const r of outros.rows) if (r.$id !== id) await tablesDB.updateRow({ databaseId: DB_ID, tableId, rowId: r.$id, data: { padrao: false } });
    }
    if (id) await tablesDB.updateRow({ databaseId: DB_ID, tableId, rowId: id, data: dados });
    else await tablesDB.createRow({ databaseId: DB_ID, tableId, rowId: ID.unique(), data: dados });
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível salvar." };
  }
  revalidatePath("/admin/configuracoes");
  return { ok: "Salvo." };
}

export async function excluirItem(tabela: TabelaEditavel, id: string): Promise<Resultado> {
  await exigir(["admin"]);
  const { tablesDB } = createAdminClient();
  const campoRef = tabela === "tipos" ? "tipo_id" : tabela === "enderecos" ? "endereco_id" : null;
  if (campoRef) {
    const usados = await tablesDB.listRows({ databaseId: DB_ID, tableId: TABLES.eventos, queries: [Query.equal(campoRef, id), Query.limit(1)] });
    if (usados.rows.length)
      return { erro: tabela === "tipos" ? "Há eventos com esse tipo. Desative-o em vez de excluir." : "Há eventos usando esse endereço." };
  }
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: TABLES[tabela], rowId: id });
  revalidatePath("/admin/configuracoes");
  return { ok: "Excluído." };
}
