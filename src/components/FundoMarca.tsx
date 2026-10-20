/** Fundo do painel da marca nas telas de login e cadastro: arte do IVAS no topo, parte lisa embaixo para o texto. */
export function FundoMarca({ imagem = "/fundo_login.webp", posicao = "bg-top" }: { imagem?: string; posicao?: string }) {
  return (
    <>
      <div aria-hidden className={`absolute inset-0 bg-cover bg-no-repeat ${posicao}`} style={{ backgroundImage: `url(${imagem})` }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-mata-950 via-mata-950/80 to-transparent" />
    </>
  );
}
