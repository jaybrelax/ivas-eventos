import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { diasDesde } from "@/lib/guarnicao-estatisticas";
import { listarSoldados } from "@/lib/soldados";
import { CabecalhoApp } from "../ui";
import { ListaSoldados } from "./ListaSoldados";

export const metadata = { title: "Soldados" };

/** Mantém os endereços existentes dos perfis, agora reunindo guardiões e mestres. */
export default async function SoldadosGuarnicao() {
  const { u, visao } = (await contextoGuarnicao("/guarnicao/guardioes"))!;
  const pessoas = await listarSoldados();

  return (
    <>
      <CabecalhoApp u={u} sobre={visao === "coordenador" ? "Coordenação" : undefined} titulo="Soldados" />
      <ListaSoldados pessoas={pessoas.map((p) => ({
        id: p.id, nome: p.nome, foto: p.foto, sexo: p.sexo, funcao: p.funcao, total: p.total,
        ultimoTexto: p.ultimo ? `Último há ${diasDesde(p.ultimo)} dias` : "Ainda não serviu",
        suspenso: visao === "coordenador" && !!p.suspensoAte,
      }))} />
    </>
  );
}
