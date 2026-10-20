"use client";

import { useEffect } from "react";

/**
 * Leva a classe do tema também para o <html>: os painéis que sobem de baixo e a barra flutuante
 * são desenhados fora do contêiner do app (em portais no <body>) e precisam do mesmo tema.
 * Ao sair do app, o site volta ao tema normal.
 */
export function TemaNoDocumento({ classe }: { classe: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const classes = ["app-guarnicao", ...classe.split(" ").filter(Boolean)];
    html.classList.add(...classes);
    return () => html.classList.remove(...classes);
  }, [classe]);
  return null;
}
