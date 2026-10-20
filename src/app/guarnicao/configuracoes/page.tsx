import { ShieldAlert } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { regrasGuarnicao } from "@/lib/guarnicao";
import { CabecalhoApp, Vazio } from "../ui";
import { FormConfig } from "./FormConfig";

export const metadata = { title: "Configurações" };

/** Coordenação: regras da guarnição que valem para todos os rituais. */
export default async function ConfiguracoesGuarnicao() {
  const { u, visao } = (await contextoGuarnicao("/guarnicao/configuracoes"))!;
  if (visao !== "coordenador")
    return (
      <>
        <CabecalhoApp u={u} titulo="Configurações" />
        <Vazio icone={<ShieldAlert size={26} />} titulo="Só para a coordenação" texto="As configurações da guarnição aparecem na visão de coordenador." />
      </>
    );
  const { horas, limiteMes } = await regrasGuarnicao();
  return (
    <>
      <CabecalhoApp u={u} sobre="Coordenação" titulo="Configurações" />
      <FormConfig horasInicial={horas} limiteInicial={limiteMes} />
    </>
  );
}
