import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // As páginas do app leem a sessão, então ficam dinâmicas.
  cacheComponents: false,
  // Permite acesso de outros dispositivos na rede local (ex: celular/tablet) sem bloquear HMR/dev
  allowedDevOrigins: ["192.168.100.22", "192.168.100.22:3000", "localhost:3000", "127.0.0.1", "127.0.0.1:3000"],
  // O indicador do modo dev fica à direita para não cobrir o botão "Sair" do menu
  devIndicators: { position: "bottom-right" },
  // O service worker nunca pode ficar preso no cache do navegador, senão as atualizações do app não chegam
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  experimental: {
    // Páginas visitadas ficam na memória da aba. Mutações e Realtime invalidam o cache.
    // A prévia de páginas ainda não visitadas continua curta.
    staleTimes: { dynamic: 86_400, static: 30 },
    // Igual ao teto das Functions da Vercel (4,5 MB), para o dev falhar como produção.
    // As imagens são reduzidas no navegador antes do envio (src/lib/imagem.ts).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    root: "J:/IVAS/APP",
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
