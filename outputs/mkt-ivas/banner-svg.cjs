const htmlGerado = $('Gerar HTML do banner').first().json;
const config = $('Personalizar banner').first().json;
const paleta = $('Definir paleta do banner').first().json;
const { rituais, contatos, html } = htmlGerado;
const fotoFundo = await this.helpers.getBinaryDataBuffer(0, 'fundo');
const tipoFundo = $input.first().binary.fundo.mimeType || 'image/png';
const fundo = `data:${tipoFundo};base64,${fotoFundo.toString('base64')}`;
const marca = html.match(/<div class="brand"><img src="([^"]+)"/)?.[1] || '';
const cartoesHtml = html.split('<article class="ritual-card">').slice(1).map(s => s.split('</article>')[0]);
const imagens = cartoesHtml.map(s => ({
  capa: s.match(/<div class="cover"><img src="([^"]+)"/)?.[1] || '',
  local: s.match(/<img class="place-photo" src="([^"]+)"/)?.[1] || '',
}));
const fonte = html.match(/@font-face[^}]*data:font\/woff2;base64,([^)]+)/)?.[1] || '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
const cor = (valor, padrao) => /^#[0-9a-f]{6}$/i.test(String(valor || '')) ? valor : padrao;
const cores = {
  texto: cor(paleta.cor_texto, '#20302a'), card: cor(paleta.cor_card, '#fffefb'),
  fundo: cor(paleta.cor_fundo, '#fbfaf3'), rodape: cor(paleta.cor_rodape, '#1e352d'),
  textoRodape: cor(paleta.cor_texto_rodape, '#fffcec'),
  destaque: cor(paleta.cor_destaque, '#b78435'), borda: cor(paleta.cor_borda, '#e2dfd3'),
};
const cortar = (valor, max) => {
  const linhas = [];
  for (const parte of String(valor || '').split('\n')) {
    let linha = '';
    for (const palavra of parte.trim().split(/\s+/).filter(Boolean)) {
      if (linha && (linha + ' ' + palavra).length > max) { linhas.push(linha); linha = palavra; }
      else linha += (linha ? ' ' : '') + palavra;
    }
    if (linha) linhas.push(linha);
  }
  return linhas;
};
const texto = (linhas, x, y, opts = {}) => {
  const { size = 24, weight = 400, fill = cores.texto, line = size * 1.22, anchor = 'start', max = 5 } = opts;
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${linhas.slice(0, max).map((s, i) => `<tspan x="${x}" dy="${i ? line : 0}">${esc(s)}</tspan>`).join('')}</text>`;
};
const icone = (nome, x, y, corIcone = cores.texto, tamanho = 28) => {
  const desenhos = {
    calendario: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M7 15h2M12 15h2M7 18h2"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    local: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    whatsapp: '<path d="M20.5 11.7a8.8 8.8 0 0 1-13 7.7L3 21l1.5-4.4A8.8 8.8 0 1 1 20.5 11.7Z"/><path d="m9 7-2 1c0 5 4 9 9 9l1-2-3-2-1 1c-2-1-3-2-4-4l1-1-1-2Z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
  };
  return `<g transform="translate(${x} ${y}) scale(${tamanho / 24})" fill="none" stroke="${corIcone}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${desenhos[nome]}</g>`;
};
const mostrarTema = config.tema_na_imagem === true || config.tema_na_imagem === 'true';
const desenharCard = (r, i) => {
  const x = i ? 554 : 48, y = 260, w = 478, img = imagens[i] || {};
  const data = String(r.data || '');
  const dataCurta = data.slice(8, 10) + '/' + data.slice(5, 7);
  const dia = new Date(data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).toUpperCase();
  const apelido = String(r.local?.apelido || '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim();
  const endereco = r.local?.endereco || r.endereco_livre || 'Local a confirmar';
  const cidade = r.local?.cidade || '';
  const titulo = String(config['titulo_card_' + (i + 1)] || r.titulo || 'Ritual da Ayahuasca').trim();
  const linhasTitulo = cortar(titulo, 23).slice(0, 3);
  const linhasEndereco = cortar(endereco, 30).slice(0, 2);
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="750" rx="28" fill="${cores.card}" stroke="#ffffff" stroke-width="2"/>
    <clipPath id="card${i}"><rect x="${x}" y="${y}" width="${w}" height="750" rx="28"/></clipPath>
    <g clip-path="url(#card${i})">
      ${img.capa ? `<image href="${img.capa}" x="${x}" y="${y}" width="${w}" height="384" preserveAspectRatio="xMidYMin slice"/>` : `<rect x="${x}" y="${y}" width="${w}" height="384" fill="${cores.rodape}"/>`}
      ${mostrarTema ? `<rect x="${x}" y="${y + 260}" width="${w}" height="124" fill="#071b17" opacity=".84"/>` : ''}
    </g>
    ${mostrarTema ? `<rect x="${x + 26}" y="${y + 270 - linhasTitulo.length * 38}" width="190" height="29" rx="6" fill="#f1dfaa"/>${texto(['TEMA DO RITUAL'], x + 38, y + 291 - linhasTitulo.length * 38, {size:16,weight:700})}${texto(linhasTitulo, x + 26, y + 324 - linhasTitulo.length * 38, {size:31,weight:750,fill:'#ffffff',line:37})}` : ''}
    ${icone('calendario', x + 26, y + 422, cores.texto, 31)}
    ${texto([dataCurta], x + 68, y + 464, {size:44,weight:800})}
    ${texto([dia], x + 26, y + 486, {size:22,weight:700})}
    <line x1="${x + 282}" y1="${y + 410}" x2="${x + 282}" y2="${y + 490}" stroke="${cores.borda}"/>
    ${icone('relogio', x + 302, y + 425, cores.texto, 30)}
    ${texto([r.hora_inicio], x + 344, y + 465, {size:42,weight:800})}
    <line x1="${x + 26}" y1="${y + 518}" x2="${x + 452}" y2="${y + 518}" stroke="${cores.borda}"/>
    <clipPath id="local${i}"><rect x="${x + 26}" y="${y + 519}" width="426" height="150" rx="12"/></clipPath>
    <g clip-path="url(#local${i})">${img.local ? `<image href="${img.local}" x="${x + 178}" y="${y + 519}" width="274" height="150" preserveAspectRatio="xMidYMid slice"/>` : ''}<rect x="${x + 26}" y="${y + 519}" width="426" height="150" fill="url(#localFade)"/></g>
    ${icone('local', x + 27, y + 535, cores.destaque, 30)}
    ${apelido ? texto([apelido], x + 68, y + 557, {size:24,weight:750}) : ''}
    ${texto(linhasEndereco, x + 68, y + (apelido ? 585 : 557), {size:21,line:26})}
    ${cidade ? texto([cidade], x + 68, y + (apelido ? 585 : 557) + linhasEndereco.length * 26, {size:20,fill:'#6b6d61'}) : ''}
    <line x1="${x + 26}" y1="${y + 669}" x2="${x + 452}" y2="${y + 669}" stroke="${cores.borda}"/>
    ${texto(['RITUAL'], x + 26, y + 717, {size:21,fill:'#6c695a'})}
    ${texto(['Nº ' + (r.numero ?? '—')], x + 112, y + 717, {size:21,weight:800})}
    <line x1="${x + 312}" y1="${y + 695}" x2="${x + 312}" y2="${y + 720}" stroke="${cores.borda}"/>
    ${texto([`${r.numero_ano ?? '—'}º de ${r.ano ?? data.slice(0,4)}`], x + 326, y + 717, {size:21,weight:600})}
  </g>`;
};
const tituloBanner = String(config.titulo_banner || '').trim();
const convite = cortar(config.texto_apoio || 'Um encontro de presença, autoconhecimento e conexão.', 58).slice(0, 2);
const site = String(contatos.site || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const mesmoTelefone = String(contatos.telefone || '').replace(/\D/g, '') === String(contatos.whatsapp || '').replace(/\D/g, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <linearGradient id="localFade"><stop offset="0" stop-color="${cores.card}"/><stop offset=".52" stop-color="${cores.card}" stop-opacity=".98"/><stop offset=".78" stop-color="${cores.card}" stop-opacity=".72"/><stop offset="1" stop-color="${cores.card}" stop-opacity=".08"/></linearGradient>
    <filter id="sombra"><feGaussianBlur stdDeviation="12"/></filter>
    <style>${fonte ? `@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fonte}) format('woff2')}` : ''}</style>
  </defs>
  <rect width="1080" height="1440" fill="${cores.fundo}"/>
  <image href="${fundo}" x="0" y="0" width="1080" height="1440" preserveAspectRatio="xMidYMid slice"/>
  ${marca ? `<image href="${marca}" x="55" y="64" width="355" height="150" preserveAspectRatio="xMidYMid meet"/>` : texto(['IVAS'], 64, 165, {size:80,weight:800})}
  <line x1="443" y1="63" x2="443" y2="209" stroke="#b79b48" opacity=".4"/>
  ${tituloBanner ? texto(cortar(tituloBanner, 18), 775, 120, {size:60,weight:800,anchor:'middle',line:68}) : ''}
  ${rituais.slice(0,2).map(desenharCard).join('')}
  ${texto(convite, 540, 1080, {size:30,weight:600,anchor:'middle',line:40})}
  <rect x="509" y="1143" width="62" height="3" rx="2" fill="${cores.destaque}"/>
  <line x1="48" y1="1160" x2="1032" y2="1160" stroke="${cores.borda}"/>
  ${texto([config.chamada_site || 'Para mais informações e agendamento acesse:'], 540, 1206, {size:25,anchor:'middle',fill:'#625637'})}
  ${texto([site], 540, 1260, {size:46,weight:800,anchor:'middle'})}
  <rect x="0" y="1320" width="1080" height="120" fill="${cores.rodape}" opacity=".76"/>
  <line x1="0" y1="1320" x2="1080" y2="1320" stroke="#f5df9f" opacity=".55"/>
  <line x1="583" y1="1339" x2="583" y2="1421" stroke="#ffffff" opacity=".2"/>
  ${icone('whatsapp', 48, 1360, cores.destaque, 40)}
  ${texto([mesmoTelefone ? 'TELEFONE E WHATSAPP' : 'WHATSAPP'], 104, 1366, {size:15,weight:700,fill:'#e6d9ae'})}
  ${texto([contatos.whatsapp], 104, 1403, {size:32,weight:700,fill:cores.textoRodape})}
  ${icone('instagram', 612, 1360, cores.destaque, 40)}
  ${texto(['INSTAGRAM'], 669, 1366, {size:15,weight:700,fill:'#e6d9ae'})}
  ${texto([String(contatos.instagram || '').replace(/^@/, '')], 669, 1403, {size:32,weight:700,fill:cores.textoRodape})}
</svg>`;
const data = await this.helpers.prepareBinaryData(Buffer.from(svg), 'ivas-banner.svg', 'image/svg+xml');
return [{ json: { nome_arquivo: htmlGerado.nome_arquivo, largura:1080, altura:1440, paleta }, binary: { data } }];
