import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cinzel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rituais IVAS",
  description: "Gestão de eventos e rituais do Instituto IVAS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
