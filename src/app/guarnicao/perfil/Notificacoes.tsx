"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "@/components/Toaster";
import { ativarNotificacoes, desativarNotificacoes, testarNotificacao } from "../actions";

type Estado = "carregando" | "sem-suporte" | "bloqueado" | "desligado" | "ligado";

/** Converte a chave VAPID (base64 url) para o formato que o navegador pede. */
function chaveVapid(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Liga/desliga os avisos deste aparelho: vaga aberta, saída da espera e lembrete do ritual. */
export function Notificacoes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return setEstado("sem-suporte");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setEstado(sub ? "ligado" : "desligado");
    })().catch(() => setEstado("sem-suporte"));
  }, []);

  const ligar = () =>
    iniciar(async () => {
      try {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") {
          setEstado(permissao === "denied" ? "bloqueado" : "desligado");
          return;
        }
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveVapid(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const r = await ativarNotificacoes(json);
        if (r.erro) return toast(r.erro);
        setEstado("ligado");
        toast(r.ok ?? "Notificações ativadas.", "ok");
      } catch (e) {
        console.error(e);
        toast("Não foi possível ativar. No iPhone, instale o app na tela de início primeiro.");
      }
    });

  const desligar = () =>
    iniciar(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await desativarNotificacoes(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("desligado");
      toast("Notificações desativadas neste aparelho.", "ok");
    });

  if (estado === "carregando") return null;

  return (
    <section className="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${estado === "ligado" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
          {estado === "ligado" ? <BellRing size={21} /> : estado === "bloqueado" ? <BellOff size={21} /> : <Bell size={21} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-stone-900">Notificações</h2>
          <p className="mt-0.5 text-sm leading-snug text-stone-500">
            {estado === "sem-suporte"
              ? "Este navegador não recebe notificações. No iPhone, instale o app na tela de início e abra por ele."
              : estado === "bloqueado"
                ? "As notificações estão bloqueadas para este site. Libere nas configurações do navegador."
                : "Avisos de vaga aberta, quando você sair da lista de espera e lembrete na véspera do ritual."}
          </p>
        </div>
      </div>
      {(estado === "desligado" || estado === "ligado") && (
        <div className="mt-4 flex gap-2">
          {estado === "desligado" ? (
            <button type="button" disabled={pendente} onClick={ligar} className="h-11 flex-1 rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-60">
              Ativar neste aparelho
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await testarNotificacao();
                    if (r.erro) toast(r.erro);
                    else toast(r.ok ?? "Enviado.", "ok");
                  })
                }
                className="h-11 flex-1 rounded-2xl bg-emerald-50 text-sm font-semibold text-emerald-700 active:scale-[0.98] disabled:opacity-60"
              >
                Enviar teste
              </button>
              <button type="button" disabled={pendente} onClick={desligar} className="h-11 flex-1 rounded-2xl bg-stone-100 text-sm font-semibold text-stone-700 active:scale-[0.98] disabled:opacity-60">
                Desativar
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
