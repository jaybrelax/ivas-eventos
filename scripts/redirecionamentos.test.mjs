import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const config = fileURLToPath(new URL("../next.config.ts", import.meta.url));
// Cada import com query própria recarrega o módulo e relê GUARNICAO_URL.
async function redirecionamentos(url) {
  if (url === undefined) delete process.env.GUARNICAO_URL; else process.env.GUARNICAO_URL = url;
  const mod = await import(pathToFileURL(config).href + `?v=${Math.random()}`);
  return mod.default.redirects();
}
const por = (lista, source) => lista.find((r) => r.source === source);

test("endereços do app dos guardiões vão para o domínio da Guarnição", async () => {
  const r = await redirecionamentos(undefined);
  const base = "https://guarnicao.virtudes.net.br";
  assert.equal(por(r, "/guarnicao").destination, `${base}/guarnicao`);
  assert.equal(por(r, "/guarnicao/:resto*").destination, `${base}/guarnicao/:resto*`);
  assert.equal(por(r, "/login-guarnicao").destination, `${base}/login-guarnicao`);
  assert.equal(por(r, "/cadastro-guarnicao").destination, `${base}/cadastro`);
  assert.equal(por(r, "/guarnicao-suspensa").destination, `${base}/guarnicao-suspensa`);
  assert.equal(por(r, "/guarnicao-app.webmanifest").destination, `${base}/guarnicao-app.webmanifest`);
});

test("GUARNICAO_URL personalizada é respeitada e a barra final é ignorada", async () => {
  const r = await redirecionamentos("https://teste.exemplo.com/");
  assert.equal(por(r, "/guarnicao").destination, "https://teste.exemplo.com/guarnicao");
});

test("redirecionamentos da Guarnição são temporários e vêm antes dos demais", async () => {
  const r = await redirecionamentos(undefined);
  const guard = r.filter((x) => x.destination.startsWith("https://guarnicao."));
  assert.equal(guard.length, 6);
  assert.ok(guard.every((x) => x.permanent === false));
  assert.ok(r.indexOf(guard.at(-1)) < r.indexOf(por(r, "/evento")));
});

test("não captura rotas do Eventos (login, cadastro, admin, participante)", async () => {
  const r = await redirecionamentos(undefined);
  for (const protegida of ["/login", "/cadastro", "/cadastro/equipe", "/admin", "/minha-conta", "/eventos", "/ritual"]) {
    assert.equal(por(r, protegida), undefined, protegida);
  }
});
