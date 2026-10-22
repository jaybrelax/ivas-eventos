"use client";

import { startTransition, useActionState } from "react";
import { CampoFoto } from "@/components/CampoFoto";
import { CampoGenero } from "@/components/CampoGenero";
import { InputTelefone } from "@/components/InputTelefone";
import { InputCPF } from "@/components/InputCPF";
import { CampoEstadoCidade } from "@/components/CampoEstadoCidade";
import { CamposSobreVoce } from "@/components/CamposSobreVoce";
import type { Experiencia } from "@/lib/perfil-extra";
import { Aviso, Carregando } from "@/components/ui";
import type { Genero } from "@/components/genero";
import { salvarMeusDados } from "./actions";
import { Cascata } from "@/components/Cascata";
import { Star } from "lucide-react";

function CampoEndereco({ endereco }: { endereco: string | null }) {
  return (
    <div>
      <label className="rotulo" htmlFor="endereco">Endereço</label>
      <input id="endereco" name="endereco" maxLength={255} autoComplete="street-address" defaultValue={endereco ?? ""} className="campo h-11" placeholder="Rua, número, bairro e cidade" />
    </div>
  );
}

export function MeusDadosForm({
  nome, email, telefone, endereco, sexo, foto, cpf, dataNascimento, estado, cidade, profissao, experiencia, motivacao, expectativas, completar, guardiao, next, semFoto, compacto = false,
}: {
  nome: string; email: string; telefone: string | null; endereco: string | null; sexo: Genero | null; foto: string | null;
  cpf: string | null; dataNascimento: string | null;
  estado: string | null; cidade: string | null; profissao: string | null;
  experiencia: Experiencia | null; motivacao: string | null; expectativas: string | null;
  /** Veio direto do cadastro pelo Google: pede pra completar o que não veio de lá (WhatsApp, CPF, endereço, nascimento). */
  completar?: boolean;
  /** Veio do cadastro com o link de divulgação para guardiões: ao salvar, vira guardião e segue para o login do app. */
  guardiao?: boolean;
  /** Sem o campo de foto (o app da Guarnição troca a foto pelo menu do cartão do perfil). */
  semFoto?: boolean;
  /** App da Guarnição: data e CPF lado a lado, estado e cidade lado a lado, e o bloco "Sobre você" em cascata. */
  compacto?: boolean;
  next?: string | null;
}) {
  const [resultado, acao, pendente] = useActionState(salvarMeusDados, undefined);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
    >
      {completar && !resultado && (
        <Aviso tipo="info">Falta pouco! Complete seu cadastro com WhatsApp, CPF, endereço e data de nascimento.</Aviso>
      )}
      {resultado && <Aviso tipo={resultado.erro ? "erro" : "ok"}>{resultado.erro ?? resultado.ok}</Aviso>}
      {next && <input type="hidden" name="next" value={next} />}
      {completar && guardiao && <input type="hidden" name="guardiao" value="1" />}

      {!semFoto && <CampoFoto nome={nome} fotoAtual={foto} />}

      <div>
        <label className="rotulo" htmlFor="nome">Nome completo</label>
        <input id="nome" name="nome" required autoComplete="name" maxLength={128} defaultValue={nome} className="campo h-11" />
      </div>
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" value={email} disabled className="campo h-11 bg-stone-50 text-stone-500" />
        <p className="mt-1 text-xs text-stone-400">O e-mail de acesso não pode ser alterado aqui.</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="telefone">WhatsApp</label>
        <InputTelefone id="telefone" name="telefone" defaultValue={telefone} className="campo h-11" />
      </div>
      {!compacto && <CampoEndereco endereco={endereco} />}
      <div className={`grid gap-4 ${compacto ? "grid-cols-2" : "sm:grid-cols-2"}`}>
        <div>
          <label className="rotulo" htmlFor="data_nascimento">Data de nascimento</label>
          <input id="data_nascimento" name="data_nascimento" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={dataNascimento ?? ""} className="campo h-11" />
        </div>
        <div>
          <label className="rotulo" htmlFor="cpf">CPF</label>
          <InputCPF id="cpf" name="cpf" defaultValue={cpf} className="campo h-11" />
        </div>
      </div>
      {compacto && <CampoEndereco endereco={endereco} />}
      <CampoEstadoCidade id="conta" estadoInicial={estado} cidadeInicial={cidade} emLinha={compacto} />
      <CampoGenero id="conta-sexo" inicial={sexo} />
      {compacto ? (
        <Cascata titulo="Sobre você" icone={Star}>
          <CamposSobreVoce id="conta" profissao={profissao} experiencia={experiencia} motivacao={motivacao} expectativas={expectativas} />
        </Cascata>
      ) : (
        <CamposSobreVoce id="conta" profissao={profissao} experiencia={experiencia} motivacao={motivacao} expectativas={expectativas} />
      )}

      <button type="submit" className="btn-primario h-11 w-full" disabled={pendente}>
        {pendente ? <><Carregando /> Salvando…</> : "Salvar dados"}
      </button>
    </form>
  );
}
