/** Manifesto do app do painel (PWA separado do site público): abre direto em /admin e só vale para essa área. */
export function GET() {
  const icone = (arquivo: string, tam: number, purpose: string) => ({ src: `/icons/${arquivo}`, sizes: `${tam}x${tam}`, type: "image/png", purpose });
  const manifesto = {
    id: "/admin",
    name: "IVAS Painel — Gestão de Rituais",
    short_name: "IVAS Painel",
    description: "Painel de gestão do Instituto IVAS: eventos, guarnição, participantes e pagamentos.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/admin/eventos",
    scope: "/admin/",
    display: "standalone",
    background_color: "#1a0b2e",
    theme_color: "#1a0b2e",
    icons: [
      icone("admin-192.png", 192, "any"),
      icone("admin-512.png", 512, "any"),
      icone("admin-maskable-192.png", 192, "maskable"),
      icone("admin-maskable-512.png", 512, "maskable"),
    ],
    shortcuts: [
      { name: "Eventos", url: "/admin/eventos", icons: [{ src: "/icons/admin-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Participantes", url: "/admin/participantes", icons: [{ src: "/icons/admin-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Pagamentos", url: "/admin/pagamentos", icons: [{ src: "/icons/admin-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
  return new Response(JSON.stringify(manifesto), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
