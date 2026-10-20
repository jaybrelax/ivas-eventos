"use client";

import { startTransition, useActionState } from "react";
import { entrar } from "./actions";
import { ArrowRight } from "lucide-react";
import { Aviso, Carregando } from "@/components/ui";
import { BotaoGoogle } from "@/components/BotaoGoogle";

export function LoginForm({ semPerfil, erroGoogle, next }: { semPerfil: boolean; erroGoogle?: boolean; next?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <div className="space-y-3.5 lg:space-y-5">
      {semPerfil && <Aviso tipo="info">Sua conta ainda não tem perfil (Admin, Coordenador ou Normal). Peça a um Admin.</Aviso>}
      {erroGoogle && <Aviso>Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.</Aviso>}

      <BotaoGoogle next={next} />
      <div className="flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" /> ou <span className="h-px flex-1 bg-stone-200" />
      </div>

      <form
        className="space-y-3.5 lg:space-y-5"
        onSubmit={(e) => {
          // Envia sem limpar o formulário (mantém o e-mail se a senha estiver errada)
          e.preventDefault();
          const dados = new FormData(e.currentTarget);
          startTransition(() => acao(dados));
        }}
      >
        {estado?.erro && <Aviso>{estado.erro}</Aviso>}
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label className="rotulo" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" className="campo h-11" />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" required autoComplete="current-password" placeholder="••••••••" className="campo h-11" />
        </div>
        <button type="submit" className="btn-primario h-11 w-full" disabled={pendente}>
          {pendente ? <><Carregando /> Entrando…</> : <>Entrar <ArrowRight size={17} /></>}
        </button>
      </form>
    </div>
  );
}
