const detectado = $input.first().json;
const nomes = {
  white: '#ffffff', black: '#000000', green: '#008000', darkgreen: '#006400',
  forestgreen: '#228b22', olive: '#808000', yellow: '#ffff00', gold: '#ffd700',
  brown: '#a52a2a', beige: '#f5f5dc', blue: '#0000ff', gray: '#808080', grey: '#808080',
};
const corHex = (valor, padrao) => {
  let cor = String(valor || '').trim().toLowerCase();
  cor = nomes[cor] || cor;
  if (/^[0-9a-f]{6}$/.test(cor)) cor = '#' + cor;
  if (/^#[0-9a-f]{3}$/.test(cor)) cor = '#' + [...cor.slice(1)].map(c => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(cor) ? cor : padrao;
};
const rgb = cor => [1, 3, 5].map(i => parseInt(cor.slice(i, i + 2), 16));
const misturar = (a, b, peso) => '#' + rgb(a).map((v, i) => Math.round(v * (1 - peso) + rgb(b)[i] * peso).toString(16).padStart(2, '0')).join('');
const luminancia = cor => {
  const canais = rgb(cor).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
  return canais[0] * .2126 + canais[1] * .7152 + canais[2] * .0722;
};
const contraste = (a, b) => { const x = luminancia(a), y = luminancia(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

const fundoDetectado = corHex(detectado.dominantColorBackground, '#4f734a');
const destaque = corHex(detectado.accentColor, '#b78435');
const corCard = misturar('#fffefb', fundoDetectado, .055);
const candidatoTexto = misturar('#20302a', fundoDetectado, .12);
const corTexto = contraste(candidatoTexto, corCard) >= 7 ? candidatoTexto : '#17271f';
const corRodape = misturar('#1e352d', fundoDetectado, .24);
const candidatoRodape = corHex(detectado.dominantColorForeground, '#fffcec');
const corTextoRodape = contraste(candidatoRodape, corRodape) >= 4.5 ? candidatoRodape : '#fffcec';

return [{ json: {
  cor_fundo: misturar('#fbfaf3', destaque, .08),
  cor_card: corCard,
  cor_texto: corTexto,
  cor_rodape: corRodape,
  cor_rodape_rgb: rgb(corRodape).join(','),
  cor_texto_rodape: corTextoRodape,
  cor_destaque: destaque,
  cor_borda: misturar('#e2dfd3', fundoDetectado, .12),
  cores_detectadas: detectado,
}}];
