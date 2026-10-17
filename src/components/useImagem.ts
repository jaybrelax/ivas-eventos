"use client";

import { useEffect, useRef, useState } from "react";
import { colocarNoInput, otimizarImagem, type UsoImagem } from "@/lib/imagem";

const AGUARDE = "Aguarde a imagem terminar de ser otimizada.";

/**
 * Prévia local + redução da imagem antes do envio. `escolher` mostra a prévia na hora,
 * otimiza em segundo plano e troca o arquivo do input; enquanto isso o formulário fica
 * bloqueado (validação nativa) para não mandar o original pesado.
 */
export function useImagem(uso: UsoImagem) {
  const [local, setLocal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [otimizando, setOtimizando] = useState(false);
  const vez = useRef(0);
  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);

  async function escolher(input: HTMLInputElement, f?: File | null) {
    const minha = ++vez.current;
    setErro(null);
    if (!f) {
      input.setCustomValidity("");
      setLocal(null);
      setOtimizando(false);
      return;
    }
    if (input.files?.[0] !== f) colocarNoInput(input, f);
    setLocal(URL.createObjectURL(f));
    setOtimizando(true);
    input.setCustomValidity(AGUARDE);
    const atual = () => minha === vez.current && input.files?.[0] === f;
    try {
      const pronto = await otimizarImagem(f, uso);
      if (atual() && pronto !== f) colocarNoInput(input, pronto);
    } catch (e) {
      if (atual()) {
        colocarNoInput(input, null);
        setLocal(null);
        setErro(e instanceof Error ? e.message : "Não foi possível usar essa imagem.");
      }
    } finally {
      if (minha === vez.current) {
        input.setCustomValidity("");
        setOtimizando(false);
      }
    }
  }

  function limpar(input?: HTMLInputElement | null) {
    vez.current++;
    if (input) {
      input.value = "";
      input.setCustomValidity("");
    }
    setLocal(null);
    setErro(null);
    setOtimizando(false);
  }

  return { local, erro, otimizando, escolher, limpar };
}
