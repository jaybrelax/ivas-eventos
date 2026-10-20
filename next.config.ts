import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Painel interno: todas as páginas leem a sessão, então ficam dinâmicas.
  cacheComponents: false,
  // Permite acesso de outros dispositivos na rede local (ex: celular/tablet) sem bloquear HMR/dev
  allowedDevOrigins: ["192.168.100.22", "192.168.100.22:3000", "localhost:3000"],
  // O indicador do modo dev fica à direita para não cobrir o botão "Sair" do menu
  devIndicators: { position: "bottom-right" },
  // O painel passou a ficar em /admin: endereços antigos (favoritos, links enviados) continuam funcionando
  async redirects() {
    // /eventos agora é a agenda pública; a antiga /evento (singular) leva para ela
    const publicas = [
      { source: "/evento", destination: "/eventos", permanent: true },
      { source: "/evento/:id", destination: "/eventos/:id", permanent: true },
    ];
    const painel = ["usuarios", "configuracoes", "banners", "guarnicao", "perfil", "resumo"].map((r) => ({
      source: `/${r}/:resto*`,
      destination: `/admin/${r}/:resto*`,
      permanent: true,
    }));
    return [...publicas, ...painel];
  },
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
    // Igual ao teto das Functions da Vercel (4,5 MB), para o dev falhar como produção.
    // As imagens são reduzidas no navegador antes do envio (src/lib/imagem.ts).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
