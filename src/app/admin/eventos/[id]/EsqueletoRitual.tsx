function Bloco({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-xl bg-stone-200/80 motion-reduce:animate-none ${className}`} />;
}

export function EsqueletoRitual() {
  return <main aria-label="Carregando ritual" aria-busy="true" className="mx-auto w-full max-w-[720px] space-y-4 px-2 pb-28 sm:px-4 md:pb-8">
    <div className="flex h-11 items-center justify-between"><Bloco className="h-4 w-24" /><Bloco className="size-10 rounded-full" /></div>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-[15rem_minmax(0,1fr)]">
      <Bloco className="aspect-square rounded-2xl" />
      <div className="flex min-h-40 flex-col justify-center gap-4 rounded-2xl border border-stone-200 bg-white/80 p-4">
        <div className="flex items-center gap-3"><Bloco className="h-14 w-20" /><div className="flex-1 space-y-2"><Bloco className="h-3 w-4/5" /><Bloco className="h-3 w-3/5" /></div></div>
        <Bloco className="h-7 w-2/3" />
        <div className="flex gap-2"><Bloco className="h-8 w-20 rounded-full" /><Bloco className="h-8 w-24 rounded-full" /></div>
      </div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 md:p-6">
      <div className="mb-5 flex gap-5 border-b border-stone-100 pb-3"><Bloco className="h-8 w-28" /><Bloco className="h-8 w-24" /><Bloco className="h-8 w-24" /></div>
      <div className="flex items-center justify-between"><Bloco className="h-6 w-40" /><Bloco className="h-10 w-36 rounded-full" /></div>
      <div className="mt-5 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-3 rounded-xl border border-stone-100 p-3"><Bloco className="size-10 rounded-full" /><div className="flex-1 space-y-2"><Bloco className="h-3 w-2/5" /><Bloco className="h-3 w-1/4" /></div><Bloco className="h-7 w-16 rounded-full" /></div>)}</div>
    </section>
    <p className="sr-only">Carregando informações do ritual</p>
  </main>;
}
