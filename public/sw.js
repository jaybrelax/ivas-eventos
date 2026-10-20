/* Service worker do app IVAS.
 * Guarda só o que é seguro e igual para todos: arquivos estáticos, ícones e imagens públicas das capas.
 * Páginas (que mudam com o login) e qualquer /api privada passam direto pela rede; sem internet, aparece /offline. */
const VERSAO = "ivas-v1";
const ESTATICO = `${VERSAO}-estatico`;
const IMAGENS = `${VERSAO}-imagens`;
const OFFLINE = "/offline";
const MAX_IMAGENS = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ESTATICO)
      .then((c) => c.addAll([OFFLINE, "/icons/icon-192.png", "/icons/icon-512.png"]))
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
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }

  // Arquivos versionados do Next e ícones: não mudam, vêm do cache.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/fundo_login.webp") {
    event.respondWith(cacheEDepois(req, ESTATICO));
    return;
  }

  // Capas e fotos públicas
  if (url.pathname.startsWith("/api/arquivo/")) {
    event.respondWith(cacheEDepois(req, IMAGENS, MAX_IMAGENS));
  }
  // Todo o resto (incluindo /api/comprovante e /api/auth) passa direto pela rede.
});
