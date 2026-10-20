import type { MetadataRoute } from "next";

/** Manifesto do app instalável (PWA): nome, cores, ícones e atalhos. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Instituto IVAS — Rituais e Encontros",
    short_name: "IVAS",
    description: "Agenda de rituais e encontros do Instituto das Virtudes da Ayahuasca e do Sol: inscrição, histórico e pagamentos.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/eventos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#3f014d",
    theme_color: "#3f014d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda de rituais", short_name: "Agenda", url: "/eventos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Minha conta", short_name: "Minha conta", url: "/minha-conta", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
