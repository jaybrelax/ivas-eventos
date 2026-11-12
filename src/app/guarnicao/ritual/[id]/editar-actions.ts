"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";
import { getUsuario } from "@/lib/auth";
import { podeEditarRitual } from "@/lib/permissao-edicao-ritual";
import { createAdminClient } from "@/lib/appwrite";
import { BUCKET_ID, DB_ID, TABLES } from "@/lib/config";
import { getEvento, listar, listarTipos } from "@/lib/data";
import { temAppGuarnicao, ehReuniao } from "@/lib/guarnicao";
import { dataParaPrompt, horarioParaPrompt } from "@/lib/ia-prompt";
import { getConfigIA } from "@/lib/ia";
import { conferirImagem } from "@/lib/imagem";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { corDaCapa } from "@/lib/cor";
import { comNumeracao } from "@/lib/ritual";
import { sinalizarMudanca } from "@/lib/tempo-real";
import { urlRitualGuarnicao } from "@/lib/guarnicao-links";
import { gerarImagemRitual, type ResultadoImagemIA } from "@/lib/gerar-imagem-ritual";
import type { Endereco } from "@/lib/types";

type ResultadoEdicao = { ok: true; destino: string } | { ok: false; erro: string };

async function editor(eventoId: string) {
  const u = await getUsuario();
  if (!podeEditarRitual(u)) throw new Error("Somente coordenadores e mestres podem editar este evento.");
  const [evento, tipos] = await Promise.all([getEvento(eventoId), listarTipos()]);
  if (!evento || !temAppGuarnicao(tipos.find(t => t.$id === evento.tipo_id))) throw new Error("Evento não encontrado no app Guardião.");
  return { u: u!, evento, tipos };
}

async function atualizarTelas() {
  revalidatePath("/guarnicao", "layout");
  revalidatePath("/eventos", "layout");
  revalidatePath("/ritual", "layout");
  await sinalizarMudanca();
}

export async function salvarInformacoesRitual(eventoId: string, form: FormData): Promise<ResultadoEdicao> {
  try {
    const { u, evento, tipos } = await editor(eventoId);
    if (String(form.get("versao")) !== evento.$updatedAt) throw new Error("Este evento foi atualizado por outra pessoa. Feche e abra o editor para carregar os dados atuais.");
    const titulo = String(form.get("titulo") ?? "").trim();
    const descricao = String(form.get("descricao") ?? "").trim();
    const data = String(form.get("data") ?? "");
    const hora = String(form.get("hora_inicio") ?? "");
    const enderecoId = String(form.get("endereco_id") ?? "");
    const livre = String(form.get("endereco_livre") ?? "").trim();
    const tipo = tipos.find(t => t.$id === String(form.get("tipo_id")));
    if (!titulo || titulo.length > 80) throw new Error("Informe um título com até 80 caracteres.");
    if (descricao.length > 5000) throw new Error("A descrição deve ter até 5.000 caracteres.");
    if (!dataParaPrompt(data)) throw new Error("Informe uma data válida.");
    if (!horarioParaPrompt(hora)) throw new Error("Informe um horário válido.");
    if (!tipo || !temAppGuarnicao(tipo) || (!tipo.ativo && tipo.$id !== evento.tipo_id)) throw new Error("Escolha um tipo disponível no app Guardião.");
    if (enderecoId === "__livre") {
      if (!livre || livre.length > 255) throw new Error("Informe o endereço com até 255 caracteres.");
    } else if (!(await listar<Endereco>(TABLES.enderecos)).some(e => e.$id === enderecoId)) throw new Error("Escolha um endereço válido.");
    const tipoAtual = tipos.find(t => t.$id === evento.tipo_id);
    if (ehReuniao(tipoAtual) !== ehReuniao(tipo)) {
      const { tablesDB } = createAdminClient();
      const registros = await tablesDB.listRows({ databaseId: DB_ID, tableId: TABLES.candidaturas, queries: [Query.equal("evento_id", evento.$id), Query.limit(1)] });
      if (registros.rows.length || evento.mestres?.length || evento.guardioes?.length || evento.guardioes_escalados_reuniao?.length) throw new Error("Este evento já tem equipe ou participações. A mudança entre reunião e ritual deve ser feita no painel de Eventos para revisar as listas.");
    }
    const { tablesDB } = createAdminClient();
    const dados = { titulo, descricao: descricao || null, data, hora_inicio: hora, tipo_id: tipo.$id, endereco_id: enderecoId === "__livre" ? null : enderecoId, endereco_livre: enderecoId === "__livre" ? livre : null, atualizado_por: u.id };
    const salvar = (extra: object = {}) => tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: evento.$id, data: { ...dados, ...extra } });
    let salvo;
    if (tipo.conta_como_ritual && !evento.ritual_numero_geral) salvo = await comNumeracao(Number(data.slice(0, 4)), salvar);
    else salvo = await salvar(tipo.conta_como_ritual ? {} : { ritual_numero_geral: null, ritual_numero_ano: null, ritual_ano: null });
    await atualizarTelas();
    return { ok: true, destino: urlRitualGuarnicao({ ...evento, ...salvo }) };
  } catch (e) { return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível salvar o evento. Tente novamente." }; }
}

export async function gerarImagemEvento(eventoId: string, ajustes: string, usarAtual: boolean): Promise<ResultadoImagemIA> {
  try {
    const { evento } = await editor(eventoId);
    if (typeof ajustes !== "string" || ajustes.length > 2000) return { ok: false, erro: "Os ajustes devem ter até 2.000 caracteres." };
    return await gerarImagemRitual(evento, ajustes, usarAtual === true);
  } catch (e) { return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível gerar a imagem. Tente novamente." }; }
}

export async function gerarDescricaoRitual(eventoId: string, tituloRascunho: string, roteiroRascunho: string): Promise<{ ok: true; descricao: string } | { ok: false; erro: string }> {
  try {
    const { evento, tipos } = await editor(eventoId);
    if (typeof tituloRascunho !== "string" || tituloRascunho.length > 80 || typeof roteiroRascunho !== "string" || roteiroRascunho.length > 5000) {
      throw new Error("Confira o título e o roteiro antes de criar a descrição.");
    }
    const titulo = tituloRascunho.trim() || evento.titulo;
    if (!titulo) throw new Error("Informe o tema do ritual antes de criar a descrição.");
    const tipo = tipos.find(t => t.$id === evento.tipo_id)?.nome || "Ritual";
    const roteiro = roteiroRascunho.trim();
    const { chave } = await getConfigIA();
    if (!chave) throw new Error("Cadastre a chave da OpenAI em Configurações › Chaves API.");

    const resposta = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-6-luna",
        instructions: "Escreva em português do Brasil uma breve descrição para divulgar um ritual. Use uma voz natural, persuasiva e emotiva, com calor humano e beleza poética, sem soar artificial ou como propaganda pronta. Combine com liberdade referências espirituais, educativas, culturais e sensoriais de modo eclético, sempre coerente com o tema e com o roteiro fornecido. Convide a pessoa a conhecer e participar, explicando a proposta com clareza e acolhimento. Não invente detalhes, promessas ou benefícios que não estejam no material. Escreva em um ou dois parágrafos curtos, separando-os com uma linha em branco se usar dois. Retorne somente a descrição, sem título, aspas, notas ou formatação. O texto completo, incluindo a quebra de parágrafo, deve ter no máximo 500 caracteres.",
        input: `Tema do ritual: ${titulo}\nTipo: ${tipo}\n${roteiro ? `Roteiro ou contexto fornecido:\n${roteiro}` : "Não foi fornecido roteiro; crie uma descrição breve apenas a partir do tema e do tipo."}`,
        max_output_tokens: 300,
        store: false,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!resposta.ok) {
      if (resposta.status === 401) throw new Error("A chave da OpenAI foi recusada. Confira em Configurações › Chaves API.");
      if (resposta.status === 429) throw new Error("O limite ou saldo da OpenAI foi atingido. Confira sua conta e tente novamente.");
      throw new Error("A OpenAI não conseguiu criar a descrição. Tente novamente.");
    }
    const dados = await resposta.json() as { output?: { content?: { type?: string; text?: string }[] }[] };
    const texto = dados.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text?.trim();
    if (!texto) throw new Error("A OpenAI não retornou uma descrição. Tente novamente.");
    const caracteres = Array.from(texto.replace(/^['\"“”]+|['\"“”]+$/g, "").trim());
    let descricao = caracteres.join("");
    if (caracteres.length > 500) {
      descricao = caracteres.slice(0, 499).join("").replace(/\s+\S*$/, "").trimEnd() + "…";
    }
    return { ok: true, descricao };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível criar a descrição. Tente novamente." };
  }
}

export async function salvarImagemEvento(eventoId: string, form: FormData): Promise<ResultadoEdicao> {
  let nova: string | null = null;
  const { storage, tablesDB } = createAdminClient();
  try {
    const { u, evento } = await editor(eventoId);
    if (String(form.get("versao")) !== evento.$updatedAt) throw new Error("Este evento foi atualizado. Feche e abra o editor antes de salvar a imagem.");
    const arquivo = form.get("capa");
    if (!(arquivo instanceof File) || !arquivo.size) throw new Error("Escolha ou gere uma imagem antes de salvar.");
    const erro = conferirImagem(arquivo, "capa");
    if (erro) throw new Error(erro);
    const { input, bytes } = await arquivoOtimizado(arquivo, arquivo.name, "capa");
    const foto = await storage.createFile({ bucketId: BUCKET_ID, fileId: ID.unique(), file: input });
    nova = foto.$id;
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: evento.$id, data: { capa_file_id: nova, cor_capa: await corDaCapa(bytes), atualizado_por: u.id } });
    nova = null;
    // Capas antigas podem estar sendo usadas por eventos copiados: preserva a referência anterior.
    await atualizarTelas();
    return { ok: true, destino: urlRitualGuarnicao(evento) };
  } catch (e) {
    if (nova) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: nova }).catch(() => {});
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível salvar a imagem. Tente novamente." };
  }
}
