import "server-only";
import { cache } from "react";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "./appwrite";
import { BUCKET_ID, type Perfil } from "./config";
import { conferirImagem } from "./imagem";
import type { Funcao, Pessoa, Sexo } from "./types";

/** Função do usuário (Mestre, Guardião ou nenhuma), independente do perfil de acesso (um Admin pode ser Mestre). */
export type FuncaoRitual = Funcao | "nenhuma";

/** Dados extras de cada usuário, guardados nas preferências (prefs) da conta no Appwrite. */
export type PrefsUsuario = { telefone?: string | null; foto_file_id?: string | null; funcao_ritual?: FuncaoRitual | null; sexo?: Sexo | null };

const FUNCOES: FuncaoRitual[] = ["mestre", "guardiao", "nenhuma"];
const SEXOS: Sexo[] = ["masculino", "feminino"];

/** Sem função definida, o usuário não é escalado nos eventos. */
export function prefsDe(prefs: unknown) {
  const p = (prefs ?? {}) as PrefsUsuario;
  const funcao: FuncaoRitual = p.funcao_ritual && FUNCOES.includes(p.funcao_ritual)
    ? p.funcao_ritual
    : "nenhuma";
  return {
    telefone: p.telefone || null,
    foto_file_id: p.foto_file_id || null,
    funcao_ritual: funcao,
    sexo: p.sexo && SEXOS.includes(p.sexo) ? p.sexo : null,
  };
}

export function perfilDosLabels(labels: string[] = []): Perfil | null {
  return (["admin", "coordenador", "normal"] as const).find((p) => labels.includes(p)) ?? null;
}

/** Usuários que podem ser escalados: mestres e guardiões ativos, em ordem de nome. */
export const listarEquipe = cache(async (): Promise<Pessoa[]> => {
  const { users } = createAdminClient();
  const res = await users.list({ queries: [Query.limit(500), Query.orderAsc("name")] });
  return res.users.flatMap((u) => {
    const p = prefsDe(u.prefs);
    if (p.funcao_ritual === "nenhuma" || !u.status) return [];
    return [{ $id: u.$id, nome: u.name || u.email, funcao: p.funcao_ritual, sexo: p.sexo, foto: p.foto_file_id }];
  });
});

/** Resumo de todos os usuários (ativos ou não), por ID: para exibir nomes e fotos em listas. */
export type ResumoUsuario = { id: string; nome: string; foto: string | null; sexo: Sexo | null; funcao: FuncaoRitual; ativo: boolean };

export const mapaUsuarios = cache(async (): Promise<Map<string, ResumoUsuario>> => {
  const { users } = createAdminClient();
  const res = await users.list({ queries: [Query.limit(500), Query.orderAsc("name")] });
  return new Map(
    res.users.map((u) => {
      const p = prefsDe(u.prefs);
      return [u.$id, { id: u.$id, nome: u.name || u.email, foto: p.foto_file_id, sexo: p.sexo, funcao: p.funcao_ritual, ativo: !!u.status }];
    }),
  );
});

/** Aceita formatos livres ("(43) 99999-0000", "+55 43 ..."); exige de 10 a 13 dígitos. */
export function validarTelefone(bruto: string): { valor: string | null } | { erro: string } {
  const t = bruto.trim().slice(0, 30);
  if (!t) return { valor: null };
  if (!/^[\d\s()+.-]+$/.test(t)) return { erro: "Telefone com caracteres inválidos." };
  const digitos = t.replace(/\D/g, "").length;
  if (digitos < 10 || digitos > 13) return { erro: "Telefone incompleto: informe DDD e número." };
  return { valor: t };
}

/**
 * Lê `telefone`, `sexo`, `foto` (arquivo), `remover_foto` e, se `podeFuncao`, `funcao_ritual`
 * do formulário e grava nas prefs do usuário, mantendo as outras preferências.
 * Campos ausentes no formulário ficam como estavam. Apaga a foto antiga quando é trocada ou removida.
 */
export async function salvarContato(userId: string, form: FormData, podeFuncao = false): Promise<{ erro?: string }> {
  const tel = validarTelefone(String(form.get("telefone") ?? ""));
  if ("erro" in tel) return { erro: tel.erro };

  const { users, storage } = createAdminClient();
  const atuais = await users.getPrefs({ userId });
  const antiga = prefsDe(atuais).foto_file_id;
  let foto = antiga;
  let apagar: string | null = null;

  const arquivo = form.get("foto");
  if (arquivo instanceof File && arquivo.size > 0) {
    const invalida = conferirImagem(arquivo, "foto");
    if (invalida) return { erro: invalida };
    try {
      const novo = await storage.createFile({
        bucketId: BUCKET_ID, fileId: ID.unique(), file: InputFile.fromBuffer(Buffer.from(await arquivo.arrayBuffer()), arquivo.name),
      });
      foto = novo.$id;
      apagar = antiga;
    } catch (e) {
      console.error(e);
      return { erro: "Não foi possível enviar a foto. Use PNG, JPG ou WEBP." };
    }
  } else if (form.get("remover_foto") === "on" && antiga) {
    foto = null;
    apagar = antiga;
  }

  try {
    const extra: PrefsUsuario = {};
    if (form.has("sexo")) {
      const sx = String(form.get("sexo"));
      extra.sexo = SEXOS.includes(sx as Sexo) ? (sx as Sexo) : null;
    }
    if (podeFuncao && form.has("funcao_ritual")) {
      const f = String(form.get("funcao_ritual")) as FuncaoRitual;
      if (FUNCOES.includes(f)) extra.funcao_ritual = f;
    }
    await users.updatePrefs({ userId, prefs: { ...atuais, ...extra, telefone: tel.valor, foto_file_id: foto } });
  } catch (e) {
    console.error(e);
    if (foto && foto !== antiga) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: foto }).catch(() => {});
    return { erro: "Não foi possível salvar o telefone e a foto." };
  }
  if (apagar) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: apagar }).catch(() => {});
  return {};
}

/** Apaga a foto de perfil do bucket (usado ao excluir o usuário). */
export async function apagarFotoDe(userId: string) {
  const { users, storage } = createAdminClient();
  const foto = prefsDe(await users.getPrefs({ userId }).catch(() => ({}))).foto_file_id;
  if (foto) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: foto }).catch(() => {});
}
