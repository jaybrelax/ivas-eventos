import type { Metadata, Viewport } from "next";
import { exigir, pode } from "@/lib/auth";
import { PERFIS, PODE } from "@/lib/config";
import { getInstituto } from "@/lib/data";
import { MarcaInstituto } from "@/components/Marca";
import { Menu, type GrupoMenu } from "./Menu";
import { sair } from "../login/actions";
import { listarPendentes } from "@/lib/usuarios";

// O painel é um app instalável à parte: manifesto, nome e cor próprios (o site público mantém o dele)
export const metadata: Metadata = {
  manifest: "/admin-app.webmanifest",
  applicationName: "IVAS Painel",
  appleWebApp: { capable: true, title: "IVAS Painel", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/admin-192.png" },
};
export const viewport: Viewport = { themeColor: "#1a0b2e" };

export default async function PainelLayout({ children }: LayoutProps<"/">) {
  const u = await exigir();
  const instituto = await getInstituto();
  const podeEditarEventos = pode(u, PODE.editarEventos);
  const grupos: GrupoMenu[] = [
    {
      titulo: "Agenda",
      itens: [
        { href: "/admin/eventos", rotulo: "Rituais", icone: "calendar", acaoCriar: podeEditarEventos },
        ...(podeEditarEventos ? [
          { href: "/admin/participantes", rotulo: "Participantes", icone: "participantes" as const },
          { href: "/admin/creditos", rotulo: "Pacotes", icone: "ticket" as const },
          { href: "/admin/pagamentos", rotulo: "Pagamentos", icone: "receipt" as const },
          // Gestão da guarnição: só coordenação e admin (o guardião se candidata pela página do evento)
          { href: "/admin/guarnicao", rotulo: "Guarnição", icone: "shield" as const },
        ] : []),
        { href: "/admin/resumo", rotulo: "Resumo do ano", icone: "chart" },
      ],
    },
    { titulo: "Divulgação", itens: [{ href: "/admin/banners", rotulo: "Banners", icone: "image" }] },
  ];
  const admin = [
    ...(pode(u, PODE.configurar) ? [{ href: "/admin/configuracoes", rotulo: "Configurações", icone: "settings" as const }] : []),
    ...(pode(u, PODE.gerenciarUsuarios) ? [{ href: "/admin/usuarios", rotulo: "Usuários", icone: "users" as const, aviso: (await listarPendentes()).length }] : []),
  ];
  if (admin.length) grupos.push({ titulo: "Administração", itens: admin });
  const perfil = PERFIS.find((p) => p.id === u.perfil)?.nome ?? "";

  const marca = <MarcaInstituto instituto={instituto} altura={52} />;

  return (
    <div className="min-h-screen">
      <Menu grupos={grupos} marca={marca} usuario={{ nome: u.nome, perfil, perfilId: u.perfil, foto: u.foto }} sair={sair} />
      <main className="transition-[padding] duration-200 md:pl-64 xl:pl-72 in-data-[menu=colapsado]:md:pl-[4.5rem]! in-data-[menu=colapsado]:xl:pl-[4.5rem]!">
        <div className="mx-auto w-full max-w-7xl animate-aparecer px-2 py-3 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
