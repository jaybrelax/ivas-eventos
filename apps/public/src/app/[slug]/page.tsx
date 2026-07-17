import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import EventoDetailsClient from "@/components/EventoDetailsClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getEventoData(slug: string) {
  // Check if slug is a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  
  let query = supabase.from("eventos").select("*");
  if (isUuid) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: evento, error } = await query.single();
  
  if (error || !evento) return null;

  const [configRes] = await Promise.all([
    supabase.from('vw_configuracoes_publicas').select('*').eq('id', 1).single()
  ]);

  return {
    evento,
    config: configRes.data || { nome_sistema: "Sistema de Eventos" }
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventoData(slug);
  
  if (!data) return { title: "Evento não encontrado" };

  const { evento, config } = data;
  const title = `${evento.titulo} | ${config.nome_sistema}`;
  const description = evento.descricao?.substring(0, 160) || "Garanta seu ingresso para este evento incrível!";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: evento.imagem_url ? [evento.imagem_url] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: evento.imagem_url ? [evento.imagem_url] : [],
    }
  };
}

export default async function EventoPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getEventoData(slug);

  if (!data) {
    notFound();
  }

  return (
    <EventoDetailsClient 
      initialEvento={data.evento}
      config={data.config}
    />
  );
}
