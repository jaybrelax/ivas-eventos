import test from "node:test";
import assert from "node:assert/strict";
import { prepararLogosInstituto } from "../src/logos-instituto.mjs";

function ambiente() {
  const cache = new Map(), envios = [];
  const instituto = { logo_file_id: "colorida", logo_escura_file_id: "branca" };
  const versoes = { colorida: "v1", branca: "v1", nova: "v1" };
  const deps = {
    async obterInstituto() { return instituto; },
    async obterArquivo(id) { return { $updatedAt: versoes[id] }; },
    async lerCache(id) { return cache.get(id) || null; },
    async reservarCache(id, dados) { if (cache.has(id)) return false; cache.set(id, dados); return true; },
    async salvarCache(id, dados) { cache.set(id, dados); },
    async apagarCache(id) { cache.delete(id); },
    async enviar(id) { envios.push(id); return "file-" + envios.length; },
    async esperar() { await new Promise(resolve => setTimeout(resolve, 1)); },
  };
  return { deps, cache, instituto, versoes, envios };
}

test("sincroniza as duas versões uma vez e reutiliza os IDs em outra chamada", async () => {
  const a = ambiente(), prompt = "{{logo_ivas_fundo_claro}} e {{logo_ivas_fundo_escuro}}";
  const primeira = await prepararLogosInstituto(prompt, "chave-falsa", "", a.deps);
  const segunda = await prepararLogosInstituto(prompt, "chave-falsa", "", a.deps);
  assert.deepEqual(a.envios, ["colorida", "branca"]);
  assert.deepEqual(primeira, segunda);
  assert.equal(primeira.images.length, 2);
  assert.match(primeira.prompt, /referência 1 \(logo colorida/);
  assert.match(primeira.prompt, /referência 2 \(logo branca/);
});

test("troca e atualização do original invalidam só a versão correspondente", async () => {
  const a = ambiente(), prompt = "{{logo_ivas_fundo_claro}} {{logo_ivas_fundo_escuro}}";
  await prepararLogosInstituto(prompt, "chave-falsa", "", a.deps);
  a.instituto.logo_file_id = "nova";
  await prepararLogosInstituto(prompt, "chave-falsa", "", a.deps);
  a.versoes.branca = "v2";
  await prepararLogosInstituto(prompt, "chave-falsa", "", a.deps);
  assert.deepEqual(a.envios, ["colorida", "branca", "nova", "branca"]);
});

test("logo ausente impede uploads parciais e não reaproveita versão removida", async () => {
  const a = ambiente(); a.instituto.logo_escura_file_id = null;
  await assert.rejects(prepararLogosInstituto("{{logo_ivas_fundo_claro}} {{logo_ivas_fundo_escuro}}", "chave-falsa", "", a.deps), /Cadastre a logo branca/);
  assert.equal(a.envios.length, 0);
});

test("preserva marcador manual, identifica duplicatas e não interpreta dados substituídos", async () => {
  const a = ambiente();
  const r = await prepararLogosInstituto("{{logo_ivas}} {{logo_ivas_fundo_claro}} {{logo_ivas_fundo_claro}}", "chave-falsa", "file-manual", a.deps);
  assert.equal(r.images.length, 2);
  assert.deepEqual(a.envios, ["colorida"]);
  assert.match(r.prompt, /referência 1 \(logo IVAS/);
  assert.deepEqual(await prepararLogosInstituto("Sem logos", "chave-falsa", "", a.deps), { prompt: "Sem logos", images: [] });
});

test("reserva compartilhada evita uploads duplicados entre chamadas simultâneas", async () => {
  const a = ambiente(), original = a.deps.enviar;
  a.deps.enviar = async id => { await new Promise(resolve => setTimeout(resolve, 5)); return original(id); };
  const resultados = await Promise.all(Array.from({length: 3}, () => prepararLogosInstituto("{{logo_ivas_fundo_claro}}", "chave-falsa", "", a.deps)));
  assert.deepEqual(a.envios, ["colorida"]);
  assert.deepEqual(resultados[0], resultados[1]);
});

test("falha de upload libera reserva e permite tentar novamente", async () => {
  const a = ambiente(), original = a.deps.enviar;
  a.deps.enviar = async () => { throw Error("rede"); };
  await assert.rejects(prepararLogosInstituto("{{logo_ivas_fundo_claro}}", "chave-falsa", "", a.deps), /rede/);
  assert.equal(a.cache.size, 0);
  a.deps.enviar = original;
  const r = await prepararLogosInstituto("{{logo_ivas_fundo_claro}}", "chave-falsa", "", a.deps);
  assert.equal(r.images[0].file_id, "file-1");
});
