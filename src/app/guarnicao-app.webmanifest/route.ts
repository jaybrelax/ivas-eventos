/** Manifesto do app da Guarnição (PWA separado): abre direto em /guarnicao e só vale para essa área. */
export function GET() {
  const icone = (arquivo: string, tam: number, purpose: string) => ({ src: `/icons/${arquivo}`, sizes: `${tam}x${tam}`, type: "image/png", purpose });
  const manifesto = {
    id: "/guarnicao",
    name: "IVAS Guarnição",
    short_name: "Guarnição IVAS",
    description: "Escala dos guardiões nos rituais do Instituto IVAS: vagas, candidaturas e histórico.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/guarnicao",
    scope: "/guarnicao",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1c1040",
    theme_color: "#1c1040",
    icons: [
      icone("guarnicao-192.png", 192, "any"),
      icone("guarnicao-512.png", 512, "any"),
      icone("guarnicao-maskable-192.png", 192, "maskable"),
      icone("guarnicao-maskable-512.png", 512, "maskable"),
    ],
    shortcuts: [
      { name: "Rituais", url: "/guarnicao", icons: [{ src: "/icons/guarnicao-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Estatísticas", url: "/guarnicao/estatisticas", icons: [{ src: "/icons/guarnicao-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
  return new Response(JSON.stringify(manifesto), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
