"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CircleCheck, X } from "lucide-react";

type Item = { id: number; texto: string; tipo: "erro" | "ok" };

let contador = 0;
let itens: Item[] = [];
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

/** Mostra uma mensagem rápida no topo da tela (some sozinha). `ok` = confirmação em verde. */
export function toast(texto: string, tipo: "erro" | "ok" = "erro") {
  const item: Item = { id: ++contador, texto, tipo };
  itens = [...itens.slice(-2), item];
  emitir();
  setTimeout(() => {
    itens = itens.filter((i) => i.id !== item.id);
    emitir();
  }, 4500);
}

/** Marca um campo como inválido (borda vermelha), leva o foco até ele e avisa com um toast. */
export function avisarCampo(onde: ParentNode, nome: string, mensagem: string) {
  const el = onde.querySelector<HTMLElement>(`[name="${nome}"]`);
  if (el) destacar(el);
  toast(mensagem);
}

function destacar(el: HTMLElement) {
  el.setAttribute("aria-invalid", "true");
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "center", behavior: "smooth" });
}

function nomeDoCampo(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const texto = el.labels?.[0]?.textContent ?? el.getAttribute("aria-label") ?? el.getAttribute("placeholder") ?? "";
  return texto.replace(/\*/g, "").trim();
}

function mensagemDe(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const nome = nomeDoCampo(el);
  const v = el.validity;
  if (v.valueMissing) return nome ? `Preencha o campo “${nome}”.` : "Preencha os campos obrigatórios.";
  if (v.typeMismatch && el instanceof HTMLInputElement && el.type === "email") return "Informe um e-mail válido.";
  if (v.tooShort) return nome ? `“${nome}” está curto demais.` : el.validationMessage;
  return el.validationMessage || "Confira os dados informados.";
}

/**
 * Avisos de formulário em todo o app: em vez do balão do navegador, o campo obrigatório ganha borda vermelha
 * e a mensagem aparece num toast. Basta o campo ter `required` (ou usar `avisarCampo` nas validações próprias).
 */
export function Toaster() {
  const [lista, setLista] = useState<Item[]>([]);

  useEffect(() => {
    const atualizar = () => setLista(itens);
    ouvintes.add(atualizar);

    let primeiro = true;
    const invalido = (e: Event) => {
      e.preventDefault();
      const el = e.target as HTMLInputElement;
      // O navegador dispara um evento por campo inválido: avisamos só do primeiro
      if (!primeiro) return el.setAttribute("aria-invalid", "true");
      primeiro = false;
      setTimeout(() => (primeiro = true), 0);
      destacar(el);
      toast(mensagemDe(el));
    };
    const limpar = (e: Event) => (e.target as HTMLElement)?.removeAttribute?.("aria-invalid");
    document.addEventListener("invalid", invalido, true);
    document.addEventListener("input", limpar, true);
    document.addEventListener("change", limpar, true);
    return () => {
      ouvintes.delete(atualizar);
      document.removeEventListener("invalid", invalido, true);
      document.removeEventListener("input", limpar, true);
      document.removeEventListener("change", limpar, true);
    };
  }, []);

  if (!lista.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3" aria-live="assertive">
      {lista.map((i) => (
        <div
          key={i.id}
          role={i.tipo === "erro" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md animate-surgir items-start gap-2.5 rounded-2xl border bg-white px-4 py-3 text-sm font-medium shadow-elevado ${
            i.tipo === "erro" ? "border-red-200 text-red-800" : "border-emerald-200 text-emerald-800"
          }`}
        >
          {i.tipo === "erro" ? <AlertCircle size={18} className="mt-px shrink-0 text-red-600" /> : <CircleCheck size={18} className="mt-px shrink-0 text-emerald-600" />}
          <span className="min-w-0">{i.texto}</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => {
              itens = itens.filter((x) => x.id !== i.id);
              emitir();
            }}
            className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
