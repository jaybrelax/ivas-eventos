"use client";

import { startTransition, useActionState } from "react";
import { entrar } from "./actions";
import { ArrowRight } from "lucide-react";
import { Aviso, Carregando } from "@/components/ui";

export function LoginForm({ semPerfil }: { semPerfil: boolean }) {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        // Envia sem limpar o formulário (mantém o e-mail se a senha estiver errada)
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
    >
      {semPerfil && <Aviso tipo="info">Sua conta ainda não tem perfil (Admin, Coordenador ou Normal). Peça a um Admin.</Aviso>}
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" autoFocus placeholder="voce@exemplo.com" className="campo h-11" />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password" placeholder="••••••••" className="campo h-11" />
      </div>
      <button type="submit" className="btn-primario h-11 w-full" disabled={pendente}>
        {pendente ? <><Carregando /> Entrando…</> : <>Entrar <ArrowRight size={17} /></>}
      </button>
    </form>
  );
}
