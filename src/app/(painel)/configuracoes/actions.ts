"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { BUCKET_ID, DB_ID, INSTITUTO_ROW_ID, TABLES } from "@/lib/config";
import { getInstituto } from "@/lib/data";
import { slugify } from "@/lib/format";
import { conferirImagem } from "@/lib/imagem";
import { CAMPOS, type TabelaEditavel } from "./campos";

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

export async function salvarItem(tabela: TabelaEditavel, _: Resultado, form: FormData): Promise<Resultado> {
  await exigir(["admin"]);
  const def = CAMPOS[tabela];
  const id = String(form.get("$id") ?? "");
  const dados: Record<string, unknown> = {};

  for (const c of def.campos) {
    const bruto = form.get(c.nome);
    if (c.tipo === "checkbox") dados[c.nome] = bruto === "on";
    else if (c.tipo === "number") dados[c.nome] = Number(bruto) || 0;
    else {
      const v = String(bruto ?? "").trim();
      if (c.obrigatorio && !v) return { erro: `Preencha “${c.rotulo}”.` };
      dados[c.nome] = v || null;
    }
  }
  if (tabela === "tipos" && !id) dados.slug = slugify(String(dados.nome)) + "-" + Date.now().toString(36);

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
  revalidatePath("/configuracoes");
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
  revalidatePath("/configuracoes");
  return { ok: "Excluído." };
}
