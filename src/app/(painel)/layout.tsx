import { exigir, pode } from "@/lib/auth";
import { PERFIS, PODE } from "@/lib/config";
import { getInstituto } from "@/lib/data";
import { MarcaInstituto } from "@/components/Marca";
import { Menu, type GrupoMenu } from "./Menu";
import { sair } from "../login/actions";

export default async function PainelLayout({ children }: LayoutProps<"/">) {
  const [u, instituto] = await Promise.all([exigir(), getInstituto()]);
  const grupos: GrupoMenu[] = [
    {
      titulo: "Agenda",
      itens: [
        { href: "/eventos", rotulo: "Eventos", icone: "calendar" },
        ...(pode(u, PODE.editarEventos) ? [{ href: "/eventos/novo", rotulo: "Novo evento", icone: "plus" as const }] : []),
        { href: "/resumo", rotulo: "Resumo do ano", icone: "chart" },
      ],
    },
    { titulo: "Divulgação", itens: [{ href: "/banners", rotulo: "Banners", icone: "image" }] },
  ];
  const admin = [
    ...(pode(u, PODE.configurar) ? [{ href: "/configuracoes", rotulo: "Configurações", icone: "settings" as const }] : []),
    ...(pode(u, PODE.gerenciarUsuarios) ? [{ href: "/usuarios", rotulo: "Usuários", icone: "users" as const }] : []),
  ];
  if (admin.length) grupos.push({ titulo: "Administração", itens: admin });
  const perfil = PERFIS.find((p) => p.id === u.perfil)?.nome ?? "";

  const marca = <MarcaInstituto instituto={instituto} altura={52} legenda={instituto.nome_curto && instituto.nome !== instituto.nome_curto ? instituto.nome : "Eventos e rituais"} />;

  return (
    <div className="min-h-screen">
      <Menu grupos={grupos} marca={marca} usuario={{ nome: u.nome, perfil, perfilId: u.perfil, foto: u.foto }} sair={sair} />
      <main className="md:pl-64 xl:pl-72">
        <div className="mx-auto w-full max-w-7xl animate-aparecer px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
