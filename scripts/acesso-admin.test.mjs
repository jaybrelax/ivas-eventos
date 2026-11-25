import assert from "node:assert/strict";
import test from "node:test";
import { destinoAposLogin, ehDestinoAdmin, podeAcessarAdmin } from "../src/lib/acesso-admin.ts";

test("somente admin e coordenador têm acesso ao painel", () => {
  assert.equal(podeAcessarAdmin("admin"), true);
  assert.equal(podeAcessarAdmin("coordenador"), true);
  assert.equal(podeAcessarAdmin("normal"), false);
  assert.equal(podeAcessarAdmin(null), false);
});

test("perfil normal vai sempre para a agenda pública, mesmo com next", () => {
  for (const next of [null, "/admin", "/admin/eventos/123", "/minha-conta", "/eventos/123"]) {
    assert.equal(destinoAposLogin("normal", next), "/eventos");
  }
});

test("apenas admin e coordenador podem seguir um next administrativo", () => {
  for (const next of ["/admin", "/admin?aba=eventos", "/admin/eventos/123"]) {
    assert.equal(ehDestinoAdmin(next), true);
    assert.equal(destinoAposLogin("admin", next), next);
    assert.equal(destinoAposLogin("coordenador", next), next);
    assert.equal(destinoAposLogin(null, next), "/minha-conta");
  }
  assert.equal(ehDestinoAdmin("/administracao"), false);
});

test("destinos públicos dos participantes continuam acessíveis", () => {
  assert.equal(destinoAposLogin(null, null), "/minha-conta");
  assert.equal(destinoAposLogin(null, "/eventos/123"), "/eventos/123");
  assert.equal(destinoAposLogin("admin", null), "/admin/eventos");
  assert.equal(destinoAposLogin("coordenador", null), "/admin/eventos");
});
