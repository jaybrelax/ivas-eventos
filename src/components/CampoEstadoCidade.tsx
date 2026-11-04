"use client";

import { useEffect, useState } from "react";
import { Building2, MapPinned } from "lucide-react";
import { UFS } from "@/lib/perfil-extra";
import { CampoMD } from "./CampoMD";

/** Cidades por estado, buscadas na API pública do IBGE (guardadas por estado durante a visita). */
const cache = new Map<string, string[]>();

async function cidadesDe(uf: string): Promise<string[]> {
  const salvo = cache.get(uf);
  if (salvo) return salvo;
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
  if (!r.ok) throw new Error(`IBGE ${r.status}`);
  const lista = ((await r.json()) as { nome: string }[]).map((m) => m.nome);
  cache.set(uf, lista);
  return lista;
}

/**
 * Estado e cidade: a cidade só libera depois do estado. Envia `estado` (sigla) e `cidade`.
 * Se a lista do IBGE não carregar, a cidade vira um campo de texto livre.
 */
export function CampoEstadoCidade({
  id, estadoInicial, cidadeInicial, obrigatorio = false, moderno = false, emLinha = false,
}: { id: string; estadoInicial?: string | null; cidadeInicial?: string | null; obrigatorio?: boolean; moderno?: boolean; /** Sempre lado a lado, também no celular. */ emLinha?: boolean }) {
  const [uf, setUf] = useState(estadoInicial ?? "");
  const [cidade, setCidade] = useState(cidadeInicial ?? "");
  const [cidades, setCidades] = useState<string[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!uf) {
      setCidades(null);
      return;
    }
    let ativo = true;
    setCarregando(true);
    setFalhou(false);
    cidadesDe(uf)
      .then((l) => ativo && setCidades(l))
      .catch(() => ativo && setFalhou(true))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [uf]);

  const marca = obrigatorio ? <span className="text-red-600"> *</span> : null;
  // Cidade gravada antes que não esteja na lista (grafia antiga, digitada à mão): mantém como opção.
  const opcoes = cidades && cidade && !cidades.includes(cidade) ? [cidade, ...cidades] : cidades;

  if (moderno)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoMD id={`${id}-estado`} rotulo="Estado" icone={MapPinned} obrigatorio={obrigatorio}>
          <select
            id={`${id}-estado`}
            name="estado"
            value={uf}
            onChange={(e) => {
              setUf(e.target.value);
              setCidade("");
            }}
            className="campo-md"
          >
            <option value="">Selecione</option>
            {UFS.map((u) => <option key={u.uf} value={u.uf}>{u.nome}</option>)}
          </select>
        </CampoMD>
        <CampoMD id={`${id}-cidade`} rotulo="Cidade" icone={Building2} obrigatorio={obrigatorio}>
          {falhou ? (
            <input id={`${id}-cidade`} name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={100} className="campo-md" placeholder="Digite a cidade" />
          ) : (
            <select id={`${id}-cidade`} name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={!uf || carregando} className="campo-md">
              <option value="">{!uf ? "Selecione o estado" : carregando ? "Carregando cidades…" : "Selecione"}</option>
              {opcoes?.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </CampoMD>
      </div>
    );

  return (
    <div className={`grid gap-4 ${emLinha ? "grid-cols-2" : "sm:grid-cols-2"}`}>
      <div>
        <label className="rotulo" htmlFor={`${id}-estado`}>Estado{marca}</label>
        <select
          id={`${id}-estado`}
          name="estado"
          value={uf}
          onChange={(e) => {
            setUf(e.target.value);
            setCidade("");
          }}
          className="campo h-11"
        >
          <option value="">Selecione</option>
          {UFS.map((u) => <option key={u.uf} value={u.uf}>{u.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="rotulo" htmlFor={`${id}-cidade`}>Cidade{marca}</label>
        {falhou ? (
          <input id={`${id}-cidade`} name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={100} className="campo h-11" placeholder="Digite a cidade" />
        ) : (
          <select
            id={`${id}-cidade`}
            name="cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            disabled={!uf || carregando}
            className="campo h-11 disabled:bg-stone-100 disabled:text-stone-500"
          >
            <option value="">{!uf ? "Selecione o estado" : carregando ? "Carregando cidades…" : "Selecione"}</option>
            {opcoes?.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
