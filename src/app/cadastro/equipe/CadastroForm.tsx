"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { cadastrar } from "./actions";
import { Aviso, Carregando } from "@/components/ui";
import { CampoGenero } from "@/components/CampoGenero";
import { InputTelefone } from "@/components/InputTelefone";
import { CampoFoto } from "@/components/CampoFoto";
import { CampoEstadoCidade } from "@/components/CampoEstadoCidade";
import { CamposSobreVoce } from "@/components/CamposSobreVoce";

/** `estadoPadrao`/`cidadePadrao`: os do Instituto (Configurações), já escolhidos no formulário. */
export function CadastroForm({ funcao, loginHref = "/login", cadastroHref = "/cadastro", estadoPadrao, cidadePadrao }: { funcao: "mestre" | "guardiao" | null; loginHref?: string; cadastroHref?: string; estadoPadrao?: string | null; cidadePadrao?: string | null }) {
  const [estado, acao, pendente] = useActionState(cadastrar, undefined);
  const [nome, setNome] = useState("");

  if (estado?.ok)
    return (
      <div className="animate-surgir rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white"><CircleCheck size={24} /></span>
        <h3 className="text-lg font-semibold text-stone-900">Cadastro enviado!</h3>
        <p className="mt-1.5 text-sm text-stone-600">
          Agora é só aguardar: a coordenação vai analisar e liberar o seu acesso. Depois disso, entre com o e-mail e a senha que você escolheu.
        </p>
        <Link href={loginHref} className="btn-secundario mt-5">Ir para o login</Link>
      </div>
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        // Envia sem limpar o formulário (se houver erro, nada do que foi digitado se perde)
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
    >
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {/* Função vinda do link (oculta) e campo-armadilha para robôs */}
      {funcao && <input type="hidden" name="funcao" value={funcao} />}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <div className="flex justify-center pb-1">
        <CampoFoto nome={nome} tamanho={88} />
      </div>
      <div>
        <label className="rotulo" htmlFor="nome">Nome completo</label>
        <input id="nome" name="nome" required autoComplete="name" maxLength={128} value={nome} onChange={(e) => setNome(e.target.value)} className="campo h-11" placeholder="Seu nome e sobrenome" />
      </div>
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="campo h-11" placeholder="voce@exemplo.com" />
      </div>
      <div>
        <label className="rotulo" htmlFor="telefone">WhatsApp</label>
        <InputTelefone id="telefone" name="telefone" required className="campo h-11" />
      </div>
      <div>
        <label className="rotulo" htmlFor="endereco">Endereço</label>
        <input id="endereco" name="endereco" required minLength={8} maxLength={255} autoComplete="street-address" className="campo h-11" placeholder="Rua, número, bairro e cidade" />
      </div>
      <CampoEstadoCidade id="cad" obrigatorio estadoInicial={estadoPadrao} cidadeInicial={cidadePadrao} />
      <CampoGenero id="cad-sexo" />
      <CamposSobreVoce id="cad" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" className="campo h-11" placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className="rotulo" htmlFor="confirmar">Confirmar senha</label>
          <input id="confirmar" name="confirmar" type="password" required minLength={8} autoComplete="new-password" className="campo h-11" placeholder="Repita a senha" />
        </div>
      </div>
      <button type="submit" className="btn-primario h-11 w-full" disabled={pendente}>
        {pendente ? <><Carregando /> Enviando…</> : <>Enviar cadastro <ArrowRight size={17} /></>}
      </button>
      <p className="text-center text-sm text-stone-500">
        Já tem acesso? <Link href={loginHref} className="font-medium text-mata-700 hover:underline">Entrar</Link>
      </p>
      <p className="text-center text-xs text-stone-400">
        Só vai participar dos rituais? <Link href={cadastroHref} className="font-medium text-stone-600 hover:underline">Cadastro de participante</Link>
      </p>
    </form>
  );
}
