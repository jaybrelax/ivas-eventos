"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { salvarDadosPessoais } from "../usuarios/actions";
import { Aviso, BotaoEnviar } from "@/components/ui";
import { CampoFoto } from "@/components/CampoFoto";

type Props = { nome: string; email: string; telefone: string | null; foto: string | null; perfil: string; funcao: string; sexo: string | null };

export function PerfilForm({ nome, email, telefone, foto, perfil, funcao, sexo }: Props) {
  const [estado, acao] = useActionState(salvarDadosPessoais, undefined);
  return (
    <form action={acao} className="cartao max-w-2xl space-y-6">
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <CampoFoto nome={nome} fotoAtual={foto} tamanho={96} />
        <div className="flex flex-col items-end gap-1.5">
          <span className="chip bg-stone-100 text-stone-600">Acesso: {perfil}</span>
          <span className="chip bg-mata-50 text-mata-700 ring-1 ring-mata-200 ring-inset">Nos rituais: {funcao}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="pf-nome">Nome</label>
          <input id="pf-nome" name="nome" defaultValue={nome} required maxLength={128} className="campo" autoComplete="name" />
        </div>
        <div>
          <label className="rotulo" htmlFor="pf-tel">Telefone</label>
          <input id="pf-tel" name="telefone" type="tel" inputMode="tel" defaultValue={telefone ?? ""} placeholder="(43) 99999-0000" className="campo" autoComplete="tel" />
          <p className="ajuda">Com DDD. Usado para contato pela equipe.</p>
        </div>
      </div>

      <div className="max-w-xs">
        <label className="rotulo" htmlFor="pf-sexo">Categoria</label>
        <select id="pf-sexo" name="sexo" defaultValue={sexo ?? ""} className="campo">
          <option value="">Não informada</option>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
        </select>
        <p className="ajuda">Separa mestres e guardiões na escala dos eventos.</p>
      </div>

      <div>
        <span className="rotulo">E-mail de acesso</span>
        <p className="flex h-10 items-center gap-2 rounded-xl bg-stone-50 px-3 text-sm text-stone-600 ring-1 ring-stone-200">
          <Mail size={15} className="text-stone-400" /> {email}
        </p>
        <p className="ajuda">Para trocar o e-mail, a senha ou a função nos rituais, fale com um Admin.</p>
      </div>

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar meu perfil</BotaoEnviar>
      </div>
    </form>
  );
}
