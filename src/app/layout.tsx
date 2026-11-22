import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { RegistrarSW } from "@/components/RegistrarSW";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  // Base dos links e imagens de compartilhamento (og:image, og:url)
  metadataBase: new URL(SITE_URL),
  title: "Rituais IVAS",
  description: "Gestão de eventos e rituais do Instituto IVAS",
  applicationName: "Instituto IVAS",
  // iPhone: ao adicionar à tela de início, abre como app (sem a barra do Safari)
  appleWebApp: { capable: true, title: "IVAS", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#3f014d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Bricolage+Grotesque:wght@500;600;700;800&family=Sora:wght@500;600;700&display=swap" rel="stylesheet" />
        {/* Menu lateral do painel fino se foi escolhido ou, sem escolha, em tablet (< 1024 px); antes da pintura, no layout raiz (que não re-renderiza no cliente) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var c=localStorage.getItem("menu-colapsado");if(c==="1"||(c===null&&innerWidth<1024))document.documentElement.dataset.menu="colapsado"}catch(e){}` }} />
      </head>
      <body className="min-h-full font-sans">
        {children}
        <RegistrarSW />
        <Toaster />
      </body>
    </html>
  );
}
