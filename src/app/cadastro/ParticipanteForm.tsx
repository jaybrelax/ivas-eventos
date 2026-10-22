"use client";

import { startTransition, useActionState, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, IdCard, Lock, LockKeyhole, Mail, MapPin, MessageCircle, UserRound } from "lucide-react";
import { cadastrarParticipante, completarCadastroGoogle } from "./actions";
import { Aviso, Carregando } from "@/components/ui";
import { avisarCampo } from "@/components/Toaster";
import { CampoGenero } from "@/components/CampoGenero";
import { CampoMD } from "@/components/CampoMD";
import { InputTelefone } from "@/components/InputTelefone";
import { CampoFoto } from "@/components/CampoFoto";
import { BotaoGoogle } from "@/components/BotaoGoogle";
import { CampoEstadoCidade } from "@/components/CampoEstadoCidade";
import { CamposSobreVoce } from "@/components/CamposSobreVoce";
import { InputCPF } from "@/components/InputCPF";

type Etapa = "escolha" | "dados" | "sobre" | "perfil";

/**
 * Cadastro de participante: a conta já nasce ativa e, ao enviar, a pessoa já entra direto.
 * `completar`: voltou do botão "Continuar com Google" (a conta já existe e já está logada) — continua
 * na própria tela para completar os dados que faltam, sem e-mail nem senha.
 */
export function ParticipanteForm({
  next, guardiao, completar, nomeInicial, fotoInicial, estadoPadrao, cidadePadrao,
}: {
  next?: string; guardiao?: boolean; completar?: boolean; nomeInicial?: string; fotoInicial?: string | null;
  estadoPadrao?: string | null; cidadePadrao?: string | null;
}) {
  const [estadoSenha, acaoSenha, pendenteSenha] = useActionState(cadastrarParticipante, undefined);
  const [estadoGoogle, acaoGoogle, pendenteGoogle] = useActionState(completarCadastroGoogle, undefined);
  const estado = completar ? estadoGoogle : estadoSenha;
  const acao = completar ? acaoGoogle : acaoSenha;
  const pendente = completar ? pendenteGoogle : pendenteSenha;
  const [etapa, setEtapa] = useState<Etapa>(completar ? "dados" : "escolha");
  const [nome, setNome] = useState(nomeInicial ?? "");

  if (etapa === "escolha")
    return (
      <div data-etapa="escolha" className="space-y-3.5">
        <BotaoGoogle next={next} guardiao={guardiao} origem="cadastro" texto="Criar cadastro com o Google" recomendado />
        <div className="flex items-center gap-3 text-base font-medium text-stone-500">
          <span className="h-px flex-1 bg-stone-300" /> ou <span className="h-px flex-1 bg-stone-300" />
        </div>
        <button type="button" onClick={() => setEtapa("dados")} className="btn-secundario h-11 w-full">
          Fazer cadastro manualmente
        </button>
      </div>
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const alvo = e.currentTarget;
        if (etapa === "dados") {
          const f = new FormData(alvo);
          if (!completar) {
            const nomeOk = String(f.get("nome") ?? "").trim();
            const emailOk = String(f.get("email") ?? "").trim();
            if (nomeOk.split(" ").filter(Boolean).length < 2) return avisarCampo(alvo, "nome", "Informe nome e sobrenome.");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOk)) return avisarCampo(alvo, "email", "Informe um e-mail válido.");
          }
          if (!String(f.get("telefone") ?? "").trim()) return avisarCampo(alvo, "telefone", "Informe o WhatsApp.");
          if (String(f.get("cpf") ?? "").replace(/\D/g, "").length !== 11) return avisarCampo(alvo, "cpf", "Informe o CPF completo.");
          setEtapa("sobre");
          return;
        }
        if (etapa === "sobre") {
          const f = new FormData(alvo);
          if (!String(f.get("estado") ?? "")) return avisarCampo(alvo, "estado", "Escolha o estado.");
          if (!String(f.get("cidade") ?? "").trim()) return avisarCampo(alvo, "cidade", "Escolha a cidade.");
          if (String(f.get("endereco") ?? "").trim().length < 8) return avisarCampo(alvo, "endereco", "Informe o endereço completo (rua, número, bairro e cidade).");
          if (!String(f.get("data_nascimento") ?? "")) return avisarCampo(alvo, "data_nascimento", "Informe a data de nascimento.");
          setEtapa("perfil");
          return;
        }
        // Envia sem limpar o formulário (se houver erro, nada do que foi digitado se perde)
        const dados = new FormData(alvo);
        startTransition(() => acao(dados));
      }}
    >
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {next && <input type="hidden" name="next" value={next} />}
      {guardiao && <input type="hidden" name="guardiao" value="1" />}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {/* Sem `required` nos campos: as etapas escondidas travariam o envio da etapa atual; a conferência é feita acima e no servidor */}
      <div hidden={etapa !== "dados"} className="space-y-4">
        <p className="text-xs font-semibold tracking-wider text-mata-700 uppercase">Etapa 1 de 3</p>
        {!completar && (
          <>
            <CampoMD id="nome" rotulo="Nome completo" icone={UserRound}>
              <input id="nome" name="nome" autoComplete="name" maxLength={128} value={nome} onChange={(e) => setNome(e.target.value)} className="campo-md" placeholder="Seu nome e sobrenome" />
            </CampoMD>
            <CampoMD id="email" rotulo="E-mail" icone={Mail}>
              <input id="email" name="email" type="email" autoComplete="email" className="campo-md" placeholder="voce@exemplo.com" />
            </CampoMD>
          </>
        )}
        <CampoMD id="telefone" rotulo="WhatsApp" icone={MessageCircle}>
          <InputTelefone id="telefone" name="telefone" className="campo-md" />
        </CampoMD>
        <CampoMD id="cpf" rotulo="CPF" icone={IdCard}>
          <InputCPF id="cpf" name="cpf" className="campo-md" />
        </CampoMD>
        <button type="submit" className="btn-primario h-11 w-full">Continuar <ArrowRight size={17} /></button>
      </div>

      <div hidden={etapa !== "sobre"} className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => { setEtapa("dados"); }} className="-ml-1 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800">
            <ChevronLeft size={14} /> Voltar
          </button>
          <p className="text-xs font-semibold tracking-wider text-mata-700 uppercase">Etapa 2 de 3</p>
        </div>
        <CampoEstadoCidade id="cad" obrigatorio moderno estadoInicial={estadoPadrao} cidadeInicial={cidadePadrao} />
        <CampoMD id="endereco" rotulo="Endereço" icone={MapPin}>
          <input id="endereco" name="endereco" maxLength={255} autoComplete="street-address" className="campo-md" placeholder="Rua, número, bairro e cidade" />
        </CampoMD>
        <CampoMD id="data_nascimento" rotulo="Data de nascimento" icone={CalendarDays}>
          <input id="data_nascimento" name="data_nascimento" type="date" max={new Date().toISOString().slice(0, 10)} className="campo-md" />
        </CampoMD>
        <CamposSobreVoce id="cad" moderno />
        <button type="submit" className="btn-primario h-11 w-full">Continuar <ArrowRight size={17} /></button>
      </div>

      <div hidden={etapa !== "perfil"} className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => { setEtapa("sobre"); }} className="-ml-1 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800">
            <ChevronLeft size={14} /> Voltar
          </button>
          <p className="text-xs font-semibold tracking-wider text-mata-700 uppercase">Etapa 3 de 3</p>
        </div>
        <div className="flex justify-center pb-1">
          <CampoFoto nome={nome} fotoAtual={fotoInicial} tamanho={88} />
        </div>
        <CampoGenero id="cad-sexo" />
        {!completar && (
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoMD id="senha" rotulo="Senha" icone={Lock}>
              <input id="senha" name="senha" type="password" autoComplete="new-password" className="campo-md" placeholder="Mínimo 8 caracteres" />
            </CampoMD>
            <CampoMD id="confirmar" rotulo="Confirmar senha" icone={LockKeyhole}>
              <input id="confirmar" name="confirmar" type="password" autoComplete="new-password" className="campo-md" placeholder="Repita a senha" />
            </CampoMD>
          </div>
        )}
        <button type="submit" className="btn-primario h-11 w-full" disabled={pendente}>
          {pendente ? <><Carregando /> {completar ? "Concluindo…" : "Criando conta…"}</> : <>{completar ? "Concluir cadastro" : "Criar cadastro"} <ArrowRight size={17} /></>}
        </button>
        {!completar && (
          <p className="text-center text-xs leading-relaxed text-stone-500">
            Ao continuar, você concorda com os{" "}
            <a href="/termos" target="_blank" className="font-medium text-mata-700 underline-offset-2 hover:underline">Termos de uso</a> e a{" "}
            <a href="/privacidade" target="_blank" className="font-medium text-mata-700 underline-offset-2 hover:underline">Política de privacidade</a>.
          </p>
        )}
      </div>
    </form>
  );
}
