"use client";

import { useEffect } from "react";

/** Registra o service worker do app (só em produção, para não atrapalhar o recarregamento do desenvolvimento). */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
