"use client";

import { useActionState, useEffect, useState } from "react";
import { Mail, Pencil, Phone, User, X } from "lucide-react";
import { salvarDadosPessoais } from "../usuarios/actions";
import { Avatar } from "@/components/Avatar";
import { Aviso, BotaoEnviar } from "@/components/ui";
import { CampoFoto } from "@/components/CampoFoto";
import { CampoGenero } from "@/components/CampoGenero";
import { InputTelefone } from "@/components/InputTelefone";
import { InputCPF } from "@/components/InputCPF";
import { CampoEstadoCidade } from "@/components/CampoEstadoCidade";
import { CamposSobreVoce } from "@/components/CamposSobreVoce";
import { mascararCpf } from "@/lib/cpf";
import { mascararTelefone } from "@/lib/telefone";
import { rotuloExperiencia, UFS, type Experiencia } from "@/lib/perfil-extra";

type Props = {
  nome: string; email: string; telefone: string | null; foto: string | null; perfil: string; funcao: string; sexo: string | null;
  endereco: string | null; estado: string | null; cidade: string | null; cpf: string | null; dataNascimento: string | null;
  profissao: string | null; experiencia: Experiencia | null; motivacao: string | null; expectativas: string | null;
};

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Meu perfil: mostra os dados consolidados; o botão de editar abre o formulário. */
export function PerfilForm(p: Props) {
  const [editando, setEditando] = useState(false);
  const [resultado, acao] = useActionState(salvarDadosPessoais, undefined);
  const [salvo, setSalvo] = useState(false);

  // Depois de salvar com sucesso, volta para a visualização (já com os dados novos).
  useEffect(() => {
    if (resultado?.ok) {
      setEditando(false);
      setSalvo(true);
    }
  }, [resultado]);

  if (!editando) return <Visualizacao {...p} salvo={salvo} editar={() => { setSalvo(false); setEditando(true); }} />;

  const sexo = p.sexo === "masculino" || p.sexo === "feminino" ? p.sexo : null;
  return (
    <form action={acao} className="cartao max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="cartao-titulo">Editar meus dados</h2>
        <button type="button" onClick={() => setEditando(false)} className="btn-fantasma h-9 px-3 text-sm">
          <X size={15} /> Cancelar
        </button>
      </div>
      {resultado?.erro && <Aviso>{resultado.erro}</Aviso>}

      <CampoFoto nome={p.nome} fotoAtual={p.foto} tamanho={96} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo flex items-center gap-1.5" htmlFor="pf-nome"><User size={14} className="text-stone-400" aria-hidden />Nome</label>
          <input id="pf-nome" name="nome" defaultValue={p.nome} required maxLength={128} className="campo" autoComplete="name" />
        </div>
        <div>
          <label className="rotulo flex items-center gap-1.5" htmlFor="pf-tel"><Phone size={14} className="text-stone-400" aria-hidden />Telefone</label>
          <InputTelefone id="pf-tel" name="telefone" defaultValue={p.telefone} />
          <p className="ajuda">Com DDD. Usado para contato pela equipe.</p>
        </div>
        <div>
          <label className="rotulo" htmlFor="pf-endereco">Endereço</label>
          <input id="pf-endereco" name="endereco" maxLength={255} defaultValue={p.endereco ?? ""} autoComplete="street-address" className="campo" placeholder="Rua, número, bairro" />
        </div>
        <div>
          <label className="rotulo" htmlFor="pf-cpf">CPF</label>
          <InputCPF id="pf-cpf" name="cpf" defaultValue={p.cpf} />
        </div>
        <div>
          <label className="rotulo" htmlFor="pf-nasc">Data de nascimento</label>
          <input id="pf-nasc" name="data_nascimento" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={p.dataNascimento ?? ""} className="campo" />
        </div>
      </div>

      <CampoEstadoCidade id="pf" estadoInicial={p.estado} cidadeInicial={p.cidade} />

      <div>
        <CampoGenero id="pf-sexo" inicial={sexo} />
        <p className="ajuda">Separa mestres e guardiões na escala dos eventos.</p>
      </div>

      <CamposSobreVoce id="pf" profissao={p.profissao} experiencia={p.experiencia} motivacao={p.motivacao} expectativas={p.expectativas} />

      <div>
        <span className="rotulo">E-mail de acesso</span>
        <p className="flex h-10 items-center gap-2 rounded-xl bg-stone-50 px-3 text-sm text-stone-600 ring-1 ring-stone-200">
          <Mail size={15} className="text-stone-400" /> {p.email}
        </p>
        <p className="ajuda">Para trocar o e-mail, a senha ou a função nos rituais, fale com um Admin.</p>
      </div>

      <div className="flex justify-end gap-2 border-t border-stone-100 pt-5">
        <button type="button" onClick={() => setEditando(false)} className="btn-secundario">Cancelar</button>
        <BotaoEnviar>Salvar meu perfil</BotaoEnviar>
      </div>
    </form>
  );
}

function Visualizacao({ salvo, editar, ...p }: Props & { salvo: boolean; editar: () => void }) {
  const uf = UFS.find((u) => u.uf === p.estado)?.nome;
  const dados: [string, string | null][] = [
    ["E-mail", p.email],
    ["Telefone", p.telefone ? mascararTelefone(p.telefone) : null],
    ["Endereço", p.endereco],
    ["Cidade", p.cidade ? `${p.cidade}${p.estado ? ` - ${p.estado}` : ""}` : uf ?? null],
    ["CPF", p.cpf ? mascararCpf(p.cpf) : null],
    ["Data de nascimento", p.dataNascimento ? dataBR(p.dataNascimento) : null],
    ["Gênero", p.sexo === "masculino" ? "Masculino" : p.sexo === "feminino" ? "Feminino" : null],
    ["Profissão", p.profissao],
    ["Experiência com ayahuasca", rotuloExperiencia(p.experiencia)],
    ["Motivação para participar", p.motivacao],
    ["Expectativas", p.expectativas],
  ];

  return (
    <section className="cartao max-w-2xl space-y-6">
      {salvo && <Aviso tipo="ok">Dados salvos.</Aviso>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar nome={p.nome} foto={p.foto} tamanho={80} />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-stone-900">{p.nome}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="chip bg-stone-100 text-stone-600">Acesso: {p.perfil}</span>
              <span className="chip bg-mata-50 text-mata-700 ring-1 ring-mata-200 ring-inset">Função: {p.funcao}</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={editar} className="btn-secundario h-10 px-3.5 text-sm" aria-label="Editar meus dados">
          <Pencil size={15} /> Editar
        </button>
      </div>

      <dl className="grid gap-x-6 gap-y-4 border-t border-stone-100 pt-5 sm:grid-cols-2">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo} className={rotulo === "Motivação para participar" || rotulo === "Expectativas" ? "sm:col-span-2" : ""}>
            <dt className="text-xs text-stone-400">{rotulo}</dt>
            <dd className="mt-0.5 break-words whitespace-pre-line text-sm text-stone-800">{valor ?? <span className="text-stone-300">Não informado</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
