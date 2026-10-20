/** Fundo do painel da marca nas telas de login e cadastro: arte do IVAS no topo, parte lisa embaixo para o texto. */
export function FundoMarca() {
  return (
    <>
      <div aria-hidden className="absolute inset-0 bg-cover bg-top bg-no-repeat" style={{ backgroundImage: "url(/fundo_login.webp)" }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-mata-950 via-mata-950/80 to-transparent" />
    </>
  );
}
