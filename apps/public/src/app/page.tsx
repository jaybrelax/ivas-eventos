import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, Clock, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 3600; // Cache de 1 hora

async function getData() {
  try {
    const [configRes, eventosRes] = await Promise.all([
      supabase.from('vw_configuracoes_publicas').select('*').eq('id', 1).single(),
      supabase.from('eventos').select('*').eq('status', 'ativo').order('created_at', { ascending: false })
    ]);

    if (configRes.error) console.error("Error fetching config:", configRes.error);
    if (eventosRes.error) console.error("Error fetching eventos:", eventosRes.error);

    return {
      config: configRes.data || {},
      eventos: eventosRes.data || []
    };
  } catch (err) {
    console.error("Critical error in getData:", err);
    return { config: {}, rifas: [] };
  }
}

export default async function Home() {
  const { config, eventos } = await getData();

  const heroEnabled = config.hero_enabled !== false;

  return (
    <div className="bg-gray-50 pb-20">
      {/* Hero Section */}
      {heroEnabled && (
        <section 
          className="relative text-white py-16 md:py-24 overflow-hidden"
          style={{
            backgroundColor: config.hero_imagem_url ? 'transparent' : '#2563eb' 
          }}
        >
          {config.hero_imagem_url && (
            <div className="absolute inset-0 z-0">
              <img 
                src={config.hero_imagem_url} 
                alt="Banner Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
            </div>
          )}
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-lg">
              {config.hero_titulo || config.nome_sistema}
            </h1>
            <p className="text-xl text-blue-50 max-w-2xl mx-auto mb-8 drop-shadow-md">
              {config.hero_descricao || "Participe dos nossos sorteios e concorra a prêmios incríveis!"}
            </p>
          </div>
        </section>
      )}

      {/* Eventos List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center mb-8">
          <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Eventos Disponíveis</h2>
        </div>

        {eventos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum evento ativo no momento</h3>
            <p className="text-gray-500">Volte em breve para conferir novos eventos!</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
            {eventos.map((evento) => {
              return (
                <Card key={evento.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md flex flex-col">
                  <Link href={`/${evento.slug || evento.id}`} className="block overflow-hidden group relative">
                    <div className="relative h-64 w-full bg-gray-200">
                      {evento.imagem_url ? (
                        <img
                          src={evento.imagem_url}
                          alt={evento.titulo}
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                          Sem imagem
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <Badge className="bg-green-500 text-xs px-3 py-1 shadow-lg border-0">Garantir Ingresso</Badge>
                        <Badge variant="secondary" className="bg-blue-600 text-white text-base px-3 py-1 shadow-lg font-bold border-0">
                          R$ {Number(evento.valor_ingresso).toFixed(2)}
                        </Badge>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md border border-white/30 text-white mb-2 shadow-sm">
                          EVENTO
                        </div>
                        <h3 className="text-2xl font-bold text-white group-hover:text-blue-200 transition-colors">{evento.titulo}</h3>
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <div className="space-y-4 mb-6 mt-auto">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="font-medium text-gray-900">{new Date(evento.data_evento).toLocaleDateString('pt-BR')} {evento.horario_evento ? `às ${evento.horario_evento}` : ''}</span>
                        </div>
                      </div>
                      
                      {evento.local_evento && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          <span className="font-medium">Local:</span> {evento.local_evento}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Ingresso a partir de</p>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {Number(evento.valor_ingresso).toFixed(2)}
                        </p>
                      </div>
                      <Button render={<Link href={`/${evento.slug || evento.id}`} />} nativeButton={false} size="lg" className="bg-blue-600 hover:bg-blue-700 uppercase font-black px-8">
                        COMPRAR
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
