import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { supabase } from "@/lib/supabase";

// Cache de 1 hora para as configurações do sistema no servidor
export const revalidate = 3600;

const inter = Inter({ subsets: ["latin"] });

async function getConfig() {
  try {
    const { data, error } = await supabase
      .from('vw_configuracoes_publicas')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;
    return data || { nome_sistema: process.env.NEXT_PUBLIC_SITE_NAME || "Sistema de Eventos" };
  } catch (err) {
    console.error("Erro ao buscar configurações:", err);
    return { nome_sistema: process.env.NEXT_PUBLIC_SITE_NAME || "Sistema de Eventos" };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  return {
    title: {
      default: config.nome_sistema,
      template: `%s | ${config.nome_sistema}`
    },
    description: "Garanta seus ingressos para eventos incríveis!",
    icons: {
      icon: config.logo_url || "/favicon.png",
    }
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
