"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { ASPECTOS, type Notas } from "@/lib/depoimentos-regras";
import { atualizarAvaliacao, atualizarTextoDepoimento, excluirAvaliacao, excluirTextoDepoimento } from "./actions";

type Depoimento = { id: string; texto: string; criadoEm: string };

export function EditarAvaliacao({ inscricaoId, inicial }: { inscricaoId: string; inicial: Notas }) {
  const [editando, setEditando] = useState(false);
  const [notas, setNotas] = useState<Notas>(inicial);
  const [erro, setErro] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  function salvar() { setErro(""); iniciar(async () => { const r = await atualizarAvaliacao(inscricaoId, notas); if ("erro" in r) setErro(r.erro ?? "Falha ao salvar."); else { setEditando(false); router.refresh(); } }); }
  function excluir() { setErro(""); iniciar(async () => { const r = await excluirAvaliacao(inscricaoId); if ("erro" in r) setErro(r.erro ?? "Falha ao excluir."); else router.refresh(); }); }
  return <div className="mt-4">
    {editando ? <div className="space-y-3">{ASPECTOS.map(([chave, titulo]) => <div key={chave} className="rounded-xl bg-stone-50 p-3"><div className="flex justify-between gap-3 text-sm"><label htmlFor={`editar-${inscricaoId}-${chave}`}>{titulo}</label><output className="font-bold tabular-nums text-mata-800">{notas[chave].toFixed(1).replace(".", ",")}</output></div><input id={`editar-${inscricaoId}-${chave}`} type="range" min="1" max="10" step="0.5" value={notas[chave]} onChange={(e) => setNotas((n) => ({ ...n, [chave]: Number(e.target.value) }))} aria-valuetext={`${notas[chave]} de 10`} className="mt-2 w-full accent-mata-700" /></div>)}<div className="flex gap-2"><button type="button" onClick={salvar} disabled={pendente} className="btn-primario min-h-10"><Check size={16} /> {pendente ? "Salvando…" : "Salvar notas"}</button><button type="button" onClick={() => { setNotas(inicial); setEditando(false); }} className="btn-secundario min-h-10"><X size={16} /> Cancelar</button></div></div> : <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditando(true)} className="btn-secundario min-h-10"><Pencil size={15} /> Editar avaliação</button>{confirmarExclusao ? <><span className="self-center text-sm">Excluir suas notas?</span><button type="button" onClick={excluir} disabled={pendente} className="btn-secundario min-h-10 text-red-700"><Trash2 size={15} /> Excluir</button><button type="button" onClick={() => setConfirmarExclusao(false)} className="btn-secundario min-h-10">Manter</button></> : <button type="button" onClick={() => setConfirmarExclusao(true)} className="btn-secundario min-h-10"><Trash2 size={15} /> Excluir avaliação</button>}</div>}
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </div>;
}

export function EditarDepoimento({ inscricaoId, item }: { inscricaoId: string; item: Depoimento }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(item.texto);
  const [erro, setErro] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  function salvar() { setErro(""); iniciar(async () => { const r = await atualizarTextoDepoimento(inscricaoId, item.id, texto); if ("erro" in r) setErro(r.erro ?? "Falha ao salvar."); else { setEditando(false); router.refresh(); } }); }
  function excluir() { setErro(""); iniciar(async () => { const r = await excluirTextoDepoimento(inscricaoId, item.id); if ("erro" in r) setErro(r.erro ?? "Falha ao excluir."); else router.refresh(); }); }
  return <li className="rounded-xl bg-stone-50 p-3">
    <time className="mb-1 block text-xs text-stone-500">{new Date(item.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
    {editando ? <><label htmlFor={`editar-relato-${item.id}`} className="text-sm font-medium">Editar depoimento</label><textarea id={`editar-relato-${item.id}`} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={4} className="campo mt-2 h-auto min-h-24 py-3" /><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={salvar} disabled={pendente || texto.trim().length < 10} className="btn-primario min-h-10"><Check size={16} /> {pendente ? "Salvando…" : "Salvar"}</button><button type="button" onClick={() => { setTexto(item.texto); setEditando(false); }} className="btn-secundario min-h-10"><X size={16} /> Cancelar</button></div></> : <><p className="whitespace-pre-wrap text-sm">{item.texto}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditando(true)} className="btn-secundario min-h-9 px-3 text-xs"><Pencil size={14} /> Editar</button>{confirmarExclusao ? <><span className="self-center text-sm">Excluir este depoimento?</span><button type="button" onClick={excluir} disabled={pendente} className="btn-secundario min-h-9 px-3 text-xs text-red-700"><Trash2 size={14} /> Excluir</button><button type="button" onClick={() => setConfirmarExclusao(false)} className="btn-secundario min-h-9 px-3 text-xs">Manter</button></> : <button type="button" onClick={() => setConfirmarExclusao(true)} className="btn-secundario min-h-9 px-3 text-xs"><Trash2 size={14} /> Excluir</button>}</div></>}
    {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
  </li>;
}
