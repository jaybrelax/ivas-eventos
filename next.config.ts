import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Painel interno: todas as páginas leem a sessão, então ficam dinâmicas.
  cacheComponents: false,
  // O indicador do modo dev fica à direita para não cobrir o botão "Sair" do menu
  devIndicators: { position: "bottom-right" },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
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
