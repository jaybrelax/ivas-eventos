import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Painel interno: todas as páginas leem a sessão, então ficam dinâmicas.
  cacheComponents: false,
  // O indicador do modo dev fica à direita para não cobrir o botão "Sair" do menu
  devIndicators: { position: "bottom-right" },
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
