"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { Aviso, Carregando } from "@/components/ui";
import { CampoGenero } from "@/components/CampoGenero";
import { InputTelefone } from "@/components/InputTelefone";
import { InputCPF } from "@/components/InputCPF";
import { CampoEstadoCidade } from "@/components/CampoEstadoCidade";
import { CamposSobreVoce } from "@/components/CamposSobreVoce";
import type { Genero } from "@/components/genero";
import type { Experiencia } from "@/lib/perfil-extra";
import { editarParticipante } from "../actions";

export type DadosEdicao = {
  nome: string; email: string; telefone: string | null; sexo: Genero | null; cpf: string | null; dataNascimento: string | null;
  endereco: string | null; estado: string | null; cidade: string | null; profissao: string | null;
  experiencia: Experiencia | null; motivacao: string | null; expectativas: string | null;
};

/** Botão "Editar dados" da ficha: abre o formulário de correção dos dados do participante. */
export function EditarParticipante({ userId, dados }: { userId: string; dados: DadosEdicao }) {
  const [aberto, setAberto] = useState(false);
  // Chave nova a cada abertura: o formulário sempre começa com os dados atuais.
  const [versao, setVersao] = useState(0);

  return (
    <>
      <button type="button" onClick={() => { setVersao((v) => v + 1); setAberto(true); }} className="btn-secundario w-full">
        <Pencil size={15} /> Editar dados
      </button>
      {aberto && <Formulario key={versao} userId={userId} dados={dados} fechar={() => setAberto(false)} />}
    </>
  );
}

function Formulario({ userId, dados, fechar }: { userId: string; dados: DadosEdicao; fechar: () => void }) {
  const [resultado, acao, pendente] = useActionState(editarParticipante.bind(null, userId), undefined);

  useEffect(() => {
    if (resultado?.ok) fechar();
  }, [resultado, fechar]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [fechar]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Editar dados do participante" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={fechar} />
      <form
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl animate-surgir flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          startTransition(() => acao(f));
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Editar dados</h3>
            <p className="text-sm text-stone-500">Use para corrigir o cadastro de {dados.nome}.</p>
          </div>
          <button type="button" onClick={fechar} className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {resultado?.erro && <Aviso>{resultado.erro}</Aviso>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="rotulo" htmlFor="ed-nome">Nome completo</label>
              <input id="ed-nome" name="nome" required maxLength={128} defaultValue={dados.nome} className="campo h-11" />
            </div>
            <div>
              <label className="rotulo" htmlFor="ed-email">E-mail</label>
              <input id="ed-email" name="email" type="email" required defaultValue={dados.email} className="campo h-11" />
            </div>
            <div>
              <label className="rotulo" htmlFor="ed-telefone">WhatsApp</label>
              <InputTelefone id="ed-telefone" name="telefone" defaultValue={dados.telefone} className="campo h-11" />
            </div>
            <div>
              <label className="rotulo" htmlFor="ed-cpf">CPF</label>
              <InputCPF id="ed-cpf" name="cpf" defaultValue={dados.cpf} className="campo h-11" />
            </div>
            <div>
              <label className="rotulo" htmlFor="ed-nasc">Data de nascimento</label>
              <input id="ed-nasc" name="data_nascimento" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={dados.dataNascimento ?? ""} className="campo h-11" />
            </div>
            <div>
              <label className="rotulo" htmlFor="ed-endereco">Endereço</label>
              <input id="ed-endereco" name="endereco" maxLength={255} defaultValue={dados.endereco ?? ""} className="campo h-11" placeholder="Rua, número, bairro" />
            </div>
          </div>
          <CampoEstadoCidade id="ed" estadoInicial={dados.estado} cidadeInicial={dados.cidade} />
          <CampoGenero id="ed-sexo" inicial={dados.sexo} />
          <CamposSobreVoce id="ed" profissao={dados.profissao} experiencia={dados.experiencia} motivacao={dados.motivacao} expectativas={dados.expectativas} />
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <button type="button" onClick={fechar} className="btn-secundario">Cancelar</button>
          <button type="submit" disabled={pendente} className="btn-primario">
            {pendente ? <><Carregando /> Salvando…</> : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
