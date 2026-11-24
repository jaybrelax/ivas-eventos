/* Service worker do app Guarnição IVAS.
 * Guarda só o que é seguro e igual para todos: arquivos estáticos, ícones e imagens públicas das capas.
 * As telas da Guarnição ficam guardadas neste aparelho (a última versão vista), para abrir sem sinal. */
const VERSAO = "guarnicao-v1";
const ESTATICO = `${VERSAO}-estatico`;
const IMAGENS = `${VERSAO}-imagens`;
const GUARNICAO = `${VERSAO}-guarnicao`;
const MAX_TELAS = 40;
const OFFLINE = "/offline";
const MAX_IMAGENS = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ESTATICO)
      .then((c) => c.addAll([OFFLINE, "/icons/guarnicao-192.png", "/icons/guarnicao-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function limitar(nome, max) {
  const cache = await caches.open(nome);
  const chaves = await cache.keys();
  if (chaves.length > max) await Promise.all(chaves.slice(0, chaves.length - max).map((k) => cache.delete(k)));
}

/** Responde do cache e, em paralelo, atualiza o cache pela rede. */
async function cacheEDepois(req, nomeCache, max) {
  const cache = await caches.open(nomeCache);
  const guardado = await cache.match(req);
  const rede = fetch(req)
    .then((res) => {
      if (res.ok) {
        cache.put(req, res.clone());
        if (max) limitar(nomeCache, max);
      }
      return res;
    })
    .catch(() => guardado);
  return guardado || rede;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: sempre da rede (a página depende do login); sem conexão, a tela de "sem internet".
  if (req.mode === "navigate" && url.pathname.startsWith("/guarnicao")) {
    // App da Guarnição: rede primeiro; se cair, a última versão guardada desta tela
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Sem sessão (mandou para o login): apaga as telas guardadas deste aparelho
          if (res.redirected && new URL(res.url).pathname.startsWith("/login")) caches.delete(GUARNICAO);
          if (res.ok && !res.redirected) {
            const copia = res.clone();
            caches.open(GUARNICAO).then((c) => c.put(req, copia).then(() => limitar(GUARNICAO, MAX_TELAS)));
          }
          return res;
        })
        .catch(async () => (await caches.match(req, { cacheName: GUARNICAO, ignoreSearch: false })) || (await caches.match(OFFLINE)) || Response.error()),
    );
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }

  // Arquivos versionados do Next e ícones: não mudam, vêm do cache.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheEDepois(req, ESTATICO));
    return;
  }

  // Capas e fotos públicas
  if (url.pathname.startsWith("/api/arquivo/")) {
    event.respondWith(cacheEDepois(req, IMAGENS, MAX_IMAGENS));
  }
  // Autenticação e demais requisições passam direto pela rede.
});

// ───────── Notificações push (app da Guarnição) ─────────
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { titulo: "IVAS Guarnição", corpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.titulo || "IVAS Guarnição", {
      body: d.corpo || "",
      icon: "/icons/guarnicao-192.png",
      badge: "/icons/guarnicao-maskable-192.png",
      tag: d.tag,
      data: { url: d.url || "/guarnicao" },
    }),
  );
});

// Tocar na notificação abre (ou traz para a frente) o app na tela certa
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/guarnicao", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abertas) => {
      const app = abertas.find((c) => c.url.includes("/guarnicao"));
      if (app) return app.navigate(url).then((c) => (c || app).focus());
      return self.clients.openWindow(url);
    }),
  );
});
