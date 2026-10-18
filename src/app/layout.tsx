import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cinzel";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  // Base dos links e imagens de compartilhamento (og:image, og:url)
  metadataBase: new URL(SITE_URL),
  title: "Rituais IVAS",
  description: "Gestão de eventos e rituais do Instituto IVAS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
