import "server-only";
import { cache } from "react";
import { ID, Query } from "node-appwrite";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { createAdminClient } from "./appwrite";
import { BUCKET_ID, LABEL_PARTICIPANTE, type Perfil } from "./config";
import { conferirImagem } from "./imagem";
import { validarCpf } from "./cpf";
import { ehExperiencia, ehUf, LIMITE_TEXTO_LONGO, type Experiencia } from "./perfil-extra";
import type { Funcao, Pessoa, Sexo } from "./types";

/** Função do usuário (Mestre, Guardião ou nenhuma), independente do perfil de acesso (um Admin pode ser Mestre). */
export type FuncaoRitual = Funcao | "nenhuma";

/** Dados extras de cada usuário, guardados nas preferências (prefs) da conta no Appwrite. */
export type PrefsUsuario = {
  telefone?: string | null; foto_file_id?: string | null; funcao_ritual?: FuncaoRitual | null; sexo?: Sexo | null;
  /** Cadastro feito pela página pública, aguardando um Admin aprovar. */
  situacao?: "pendente" | null;
  /** Função que a pessoa indicou ao se cadastrar (vem do link: /cadastro/equipe?funcao=guardiao). */
  funcao_solicitada?: Funcao | null;
  /** Endereço informado no cadastro ou preenchido depois em "Meus dados". */
  endereco?: string | null;
  /** CPF (opcional, preenchido depois em "Meus dados"), só dígitos. */
  cpf?: string | null;
  /** Data de nascimento (opcional, preenchido depois em "Meus dados"), AAAA-MM-DD. */
  data_nascimento?: string | null;
  /** Localização (sigla do estado e nome da cidade, como no IBGE) e profissão. */
  estado?: string | null;
  cidade?: string | null;
  profissao?: string | null;
  /** O que a pessoa conta sobre a caminhada com a medicina. */
  experiencia_ayahuasca?: Experiencia | null;
  motivacao?: string | null;
  expectativas?: string | null;
};

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
    endereco: p.endereco || null,
    cpf: p.cpf || null,
    data_nascimento: p.data_nascimento || null,
    estado: p.estado || null,
    cidade: p.cidade || null,
    profissao: p.profissao || null,
    experiencia_ayahuasca: p.experiencia_ayahuasca && ehExperiencia(p.experiencia_ayahuasca) ? p.experiencia_ayahuasca : null,
    motivacao: p.motivacao || null,
    expectativas: p.expectativas || null,
  };
}

export function perfilDosLabels(labels: string[] = []): Perfil | null {
  return (["admin", "coordenador", "normal"] as const).find((p) => labels.includes(p)) ?? null;
}

/** Conta de participante (cadastro público, sem acesso ao painel). */
export function ehParticipante(labels: string[] = []): boolean {
  return labels.includes(LABEL_PARTICIPANTE);
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

/** Cadastros da página pública aguardando aprovação (conta bloqueada até o Admin aprovar). */
export type Pendente = { id: string; nome: string; email: string; telefone: string | null; sexo: Sexo | null; funcaoSolicitada: Funcao | null; endereco: string | null; foto: string | null; criadoEm: string };

export const listarPendentes = cache(async (): Promise<Pendente[]> => {
  const { users } = createAdminClient();
  const res = await users.list({ queries: [Query.limit(500), Query.orderDesc("$createdAt")] });
  return res.users.flatMap((u) => {
    const bruto = (u.prefs ?? {}) as PrefsUsuario;
    if (bruto.situacao !== "pendente") return [];
    const p = prefsDe(u.prefs);
    const f = bruto.funcao_solicitada;
    return [{ id: u.$id, nome: u.name || u.email, email: u.email, telefone: p.telefone, sexo: p.sexo, funcaoSolicitada: f === "mestre" || f === "guardiao" ? f : null, endereco: bruto.endereco || null, foto: p.foto_file_id, criadoEm: u.$createdAt }];
  });
});

/** Qualquer pessoa com conta ativa (participante ou equipe), para a lista de Participantes no painel. */
export type PessoaConta = Participante & { perfil: Perfil | null; funcao: FuncaoRitual; cidade: string | null; estado: string | null };

export const listarTodasAsPessoas = cache(async (): Promise<PessoaConta[]> => {
  const { users } = createAdminClient();
  const res = await users.list({ queries: [Query.limit(500), Query.orderDesc("$createdAt")] });
  return res.users.flatMap((u) => {
    const bruto = (u.prefs ?? {}) as PrefsUsuario;
    // Cadastros da equipe que ainda esperam aprovação ficam em Usuários › Cadastros pendentes
    if (bruto.situacao === "pendente") return [];
    const perfil = perfilDosLabels(u.labels);
    if (!perfil && !ehParticipante(u.labels)) return [];
    const p = prefsDe(u.prefs);
    return [{
      id: u.$id, nome: u.name || u.email, email: u.email, telefone: p.telefone, endereco: bruto.endereco || null,
      sexo: p.sexo, foto: p.foto_file_id, criadoEm: u.$createdAt, perfil, funcao: p.funcao_ritual, cidade: p.cidade, estado: p.estado,
    }];
  });
});

/** Participante do site público: nome, contato e dados usados no cadastro. */
export type Participante = { id: string; nome: string; email: string; telefone: string | null; endereco: string | null; sexo: Sexo | null; foto: string | null; criadoEm: string };

export const listarParticipantes = cache(async (): Promise<Participante[]> => {
  const { users } = createAdminClient();
  const res = await users.list({ queries: [Query.limit(500), Query.orderDesc("$createdAt")] });
  return res.users.flatMap((u) => {
    if (!ehParticipante(u.labels)) return [];
    const bruto = (u.prefs ?? {}) as PrefsUsuario;
    const p = prefsDe(u.prefs);
    return [{ id: u.$id, nome: u.name || u.email, email: u.email, telefone: p.telefone, endereco: bruto.endereco || null, sexo: p.sexo, foto: p.foto_file_id, criadoEm: u.$createdAt }];
  });
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
        bucketId: BUCKET_ID, fileId: ID.unique(), file: (await arquivoOtimizado(arquivo, arquivo.name, "foto")).input,
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

  if (form.has("cpf")) {
    const bruto = String(form.get("cpf") ?? "").replace(/\D/g, "");
    if (bruto && !validarCpf(bruto)) return { erro: "CPF inválido. Confira os números." };
  }
  if (form.has("data_nascimento")) {
    const bruto = String(form.get("data_nascimento") ?? "");
    if (bruto && (!/^\d{4}-\d{2}-\d{2}$/.test(bruto) || bruto > new Date().toISOString().slice(0, 10)))
      return { erro: "Data de nascimento inválida." };
  }

  try {
    const extra: PrefsUsuario = {};
    if (form.has("endereco")) extra.endereco = String(form.get("endereco") ?? "").trim().replace(/\s+/g, " ").slice(0, 255) || null;
    if (form.has("cpf")) extra.cpf = String(form.get("cpf") ?? "").replace(/\D/g, "") || null;
    if (form.has("data_nascimento")) extra.data_nascimento = String(form.get("data_nascimento") ?? "") || null;
    const linha = (k: string, max: number) => String(form.get(k) ?? "").trim().replace(/\s+/g, " ").slice(0, max) || null;
    const texto = (k: string) => String(form.get(k) ?? "").trim().slice(0, LIMITE_TEXTO_LONGO) || null;
    if (form.has("estado")) {
      const uf = String(form.get("estado") ?? "");
      extra.estado = ehUf(uf) ? uf : null;
      if (!extra.estado) extra.cidade = null;
    }
    if (form.has("cidade") && extra.cidade !== null) extra.cidade = linha("cidade", 100);
    if (form.has("profissao")) extra.profissao = linha("profissao", 100);
    if (form.has("experiencia_ayahuasca")) {
      const x = String(form.get("experiencia_ayahuasca") ?? "");
      extra.experiencia_ayahuasca = ehExperiencia(x) ? x : null;
    }
    if (form.has("motivacao")) extra.motivacao = texto("motivacao");
    if (form.has("expectativas")) extra.expectativas = texto("expectativas");
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
