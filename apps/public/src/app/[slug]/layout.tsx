import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Ticket } from "lucide-react";
import HeaderActions from "@/components/HeaderActions";

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

export default async function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getConfig();

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center gap-2">
              {config.logo_url ? (
                <img src={config.logo_url} alt={config.nome_sistema} className="h-10 w-auto object-contain" />
              ) : (
                <Ticket className="h-7 w-7 text-blue-600" />
              )}
              <span className="font-bold text-lg md:text-xl text-gray-900 tracking-tight">
                {config.nome_sistema}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <HeaderActions />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow">
        {children}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-4 grayscale opacity-50">
              {config.logo_url ? (
                <img src={config.logo_url} alt={config.nome_sistema} className="h-8 object-contain" />
              ) : (
                <Ticket className="h-6 w-6 text-blue-500" />
              )}
              <span className="font-bold text-lg text-white">
                {config.nome_sistema}
              </span>
            </div>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm">
              Este site é destinado exclusivamente para venda de ingressos para os eventos do Instituto das Virtudes da Ayahuasca e do Sol.
            </p>
          </div>

          <p className="mb-4 text-gray-500">© {new Date().getFullYear()} {config.nome_sistema}. Todos os direitos reservados.</p>

          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
            <Link href="/minhas-compras" className="hover:text-white transition-colors">Minhas Compras</Link>
            <a href="https://admin.evento.virtudes.net.br" className="hover:text-white transition-colors border-l border-gray-700 pl-4 ml-4">Área Restrita</a>
          </div>
        </div>
      </footer>
    </>
  );
}
