import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Payment } from "mercadopago";
import dotenv from "dotenv";
import fs from "node:fs";
import { createCanvas, loadImage, Path2D, GlobalFonts } from "@napi-rs/canvas";
import QRCode from "qrcode";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Registrar fonte Inter (para funcionar no Linux / Vercel)
const fontDir = path.resolve(__dirname, "fonts");
try {
  GlobalFonts.registerFromPath(path.join(fontDir, "Inter-Regular.woff"), "Inter");
  GlobalFonts.registerFromPath(path.join(fontDir, "Inter-Bold.woff"), "Inter");
  console.log("[Fonts] Inter registrada com sucesso.");
} catch (e) {
  console.warn("[Fonts] Não foi possível registrar a fonte Inter. Usando fallback.");
}

const imageCache = new Map<string, Promise<any>>();

async function safeLoadImage(url: string): Promise<any> {
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  const fetchImage = async () => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return await loadImage(Buffer.from(arrayBuffer));
    }
    return await loadImage(url);
  };

  const promise = fetchImage().catch(err => {
    imageCache.delete(url); // Remove do cache em caso de erro para tentar novamente depois
    throw err;
  });

  imageCache.set(url, promise);
  return promise;
}

const app = express();
app.use(cors());
app.use(express.json());

// Proxy para testar webhook (evitar CORS no front)
app.post("/api/webhook-test-proxy", async (req, res) => {
  console.log("[DEBUG] Proxy Webhook disparado para:", req.body.url);
  try {
    const { url, payload } = req.body;
    if (!url) return res.status(400).json({ error: "URL ausente" });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      const status = response.status;
      res.status(status).json({ error: `Erro no Webhook: Status ${status}` });
    }
  } catch (error: any) {
    console.error("[DEBUG] Erro no Proxy:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper para gerar ID secundário aleatório
function gerarDisplayId(tamanho: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removido I, O, 0, 1 para evitar confusão
  let result = '';
  for (let i = 0; i < tamanho; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Rota de Teste Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.VERCEL ? "serverless" : "local",
    time: new Date().toISOString()
  });
});

// Helper Evolution API
async function enviarMensagemWhatsApp(telefone: string, texto: string) {
  try {
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: config } = await supabaseAdmin.from("configuracoes").select("*").eq("id", 1).single();

    if (!config?.evolution_enabled || !config?.evolution_api_url || !config?.evolution_api_key || !config?.evolution_instance) {
      console.log("[Evolution] Envio IGNORADO. Verifique se evolution_enabled está marcado e se URL, KEY e INSTANCE estão preenchidas no banco.");
      return;
    }

    const numLimpo = telefone.replace(/\D/g, "");
    if (!numLimpo.startsWith("55")) {
      telefone = "55" + numLimpo;
    } else {
      telefone = numLimpo;
    }

    const baseUrl = config.evolution_api_url.endsWith('/')
      ? config.evolution_api_url.slice(0, -1)
      : config.evolution_api_url;

    const url = `${baseUrl}/message/sendText/${config.evolution_instance}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolution_api_key
      },
      body: JSON.stringify({
        number: telefone,
        text: texto,
        linkPreview: false,
        delay: 1500
      })
    });

    if (!response.ok) {
      const resData = await response.json();
      console.error(`[Evolution] Erro da API (${response.status}) para ${telefone}:`, JSON.stringify(resData));
    }
  } catch (error) {
    console.error("[Evolution] Erro crítico no processo de envio para " + telefone + ":", error);
  }
}

// ── GERAÇÃO DE COMPROVANTE (imagem PNG com QR Code) ──
async function gerarImagemComprovante(dados: {
  nomeEvento: string;
  nomeParticipante: string;
  displayId: string;
  dataEvento?: string;
  localEvento?: string;
  dataCompra?: string;
  convidadoId: string;
  logoUrl?: string;
  nomeSistema?: string;
  imagemEventoUrl?: string;
  numeroConvidado?: string | number;
}): Promise<string> {
  const W = 520, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as any;

  // 1. Fundo (Gradiente Suave)
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#e8f0fc');
  bgGrad.addColorStop(1, '#ecfdf5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Cabeçalho Azul Escuro
  ctx.fillStyle = '#1c2741ff';
  ctx.fillRect(0, 0, W, 120);

  // Logo e Textos do lado esquerdo
  let textStartX = 36;
  let logoCarregada = false;
  if (dados.logoUrl) {
    try {
      const logoImg = await safeLoadImage(dados.logoUrl);
      const logoH = 56;
      const logoW = Math.min(Math.round((logoImg.width / logoImg.height) * logoH), 120);
      ctx.drawImage(logoImg, 30, (120 - logoH) / 2, logoW, logoH);
      textStartX = 30 + logoW + 14;
      logoCarregada = true;
    } catch (err: any) {
      console.error('❌ [Comprovante] Logo falhou ao carregar. URL:', dados.logoUrl);
      console.error('❌ Detalhes:', err.message);
    }
  }

  if (!logoCarregada) {
    // Fallback: barra verde + nome do sistema em destaque
    ctx.fillStyle = '#10b981';
    ctx.fillRect(30, 32, 5, 56);
    textStartX = 50;
  }

  // Textos do lado esquerdo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(dados.nomeSistema || 'Eventos', textStartX, 58);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '15px Inter';
  ctx.fillText('Instituto das Virtudes', textStartX, 88);

  // Textos do lado direito (Data)
  if (dados.dataCompra) {
    try {
      const dtCompra = new Date(dados.dataCompra).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px Inter';
      ctx.fillText('DATA DA COMPRA', W - 36, 52);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter';
      ctx.fillText(dtCompra, W - 36, 78);
    } catch (_) { }
  }

  // 3. Faixa Verde de Confirmação
  const greenBarGrad = ctx.createLinearGradient(0, 120, W, 120);
  greenBarGrad.addColorStop(0, '#1fb577');
  greenBarGrad.addColorStop(1, '#4bd599');
  ctx.fillStyle = greenBarGrad;
  ctx.fillRect(0, 120, W, 56);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Inter';
  ctx.textBaseline = 'middle';

  try {
    const iconPath = path.join(__dirname, '..', 'public', 'check-icon.png');
    const checkImg = await loadImage(fs.readFileSync(iconPath));
    const textStr = 'COMPROVANTE DE INSCRIÇÃO';
    const textWidth = ctx.measureText(textStr).width;
    const iconSize = 24;
    const gap = 12;
    const totalWidth = iconSize + gap + textWidth;
    const startX = (W - totalWidth) / 2;

    ctx.drawImage(checkImg, startX, 148 - (iconSize / 2), iconSize, iconSize);
    ctx.textAlign = 'left';
    ctx.fillText(textStr, startX + iconSize + gap, 148);
  } catch (err) {
    ctx.textAlign = 'center';
    ctx.fillText('COMPROVANTE DE INSCRIÇÃO', W / 2, 148);
  }

  // 4. Imagem do evento como background do card QR + Cartão
  const cardW = 280;
  const cardH = 300;
  const cardX = (W - cardW) / 2;
  const cardY = 205;

  // Carregar imagem do evento (reusada também no ícone da lista)
  let eventoImgObj: any = null;
  if (dados.imagemEventoUrl) {
    try {
      eventoImgObj = await safeLoadImage(dados.imagemEventoUrl);
    } catch (err: any) {
      console.error('❌ [Comprovante] Erro ao carregar imagem do evento:', err.message);
    }
  }

  // Background: imagem do evento — da barra verde até a linha tracejada, sem cobrir as infos
  if (eventoImgObj) {
    const bgY = 176;
    // dashY = cardY + cardH + 45 + 58 = 608; bgH = dashY - bgY
    const bgH = (cardY + cardH + 103) - bgY; // termina na linha tracejada

    ctx.save();
    ctx.globalAlpha = 0.3;

    // Crop centralizado (cover)
    const ratio = eventoImgObj.width / eventoImgObj.height;
    const targetRatio = W / bgH;
    let sw = eventoImgObj.width, sh = eventoImgObj.height;
    let sx = 0, sy = 0;
    if (ratio > targetRatio) {
      sw = sh * targetRatio;
      sx = (eventoImgObj.width - sw) / 2;
    } else {
      sh = sw / targetRatio;
      sy = (eventoImgObj.height - sh) / 2;
    }
    ctx.drawImage(eventoImgObj, sx, sy, sw, sh, 0, bgY, W, bgH);
    ctx.restore();

    // Gradiente bottom: funde a base com o fundo do comprovante (altura aumentada)
    const fadeHeight = 160;
    const fadeBottom = ctx.createLinearGradient(0, bgY + bgH - fadeHeight, 0, bgY + bgH);
    fadeBottom.addColorStop(0, 'rgba(236,253,245,0)');
    fadeBottom.addColorStop(1, '#ecfdf5');
    ctx.fillStyle = fadeBottom;
    ctx.fillRect(0, bgY + bgH - fadeHeight, W, fadeHeight);
  }

  // Cartão do QR Code (branco semi-transparente por cima)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = eventoImgObj ? 'rgba(255,255,255,0.85)' : '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // QR Code
  const qrSize = 200;
  const qrX = cardX + (cardW - qrSize) / 2;
  const qrY = cardY + 20;
  const qrDataUrl = await QRCode.toDataURL(dados.convidadoId, {
    width: qrSize, margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' }
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Escaneie para validar
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('ESCANEIE PARA VALIDAR', W / 2, cardY + cardH - 52);

  // ID do convidado com traços laterais
  const numStr = dados.numeroConvidado ? String(dados.numeroConvidado).padStart(2, '0') : null;
  const displayId = numStr ? `#${numStr}-${dados.displayId}` : `#${dados.displayId}`;
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 22px Inter';
  ctx.fillText(displayId, W / 2, cardY + cardH - 22);

  const idW = ctx.measureText(displayId).width;
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - idW / 2 - 30, cardY + cardH - 22);
  ctx.lineTo(W / 2 - idW / 2 - 10, cardY + cardH - 22);
  ctx.moveTo(W / 2 + idW / 2 + 10, cardY + cardH - 22);
  ctx.lineTo(W / 2 + idW / 2 + 30, cardY + cardH - 22);
  ctx.stroke();

  // 5. Avatar e Nome
  const participantSectionY = cardY + cardH + 45;
  ctx.font = 'bold 24px Inter';
  const nameWidth = ctx.measureText(dados.nomeParticipante).width;
  const avatarRadius = 22;
  const gap = 16;
  const totalBlockWidth = (avatarRadius * 2) + gap + nameWidth;
  const startAvatarX = (W - totalBlockWidth) / 2;

  ctx.beginPath();
  ctx.arc(startAvatarX + avatarRadius, participantSectionY, avatarRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#ecfdf5';
  ctx.fill();
  ctx.strokeStyle = '#d1fae5';
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.save();
  ctx.translate(startAvatarX + avatarRadius - 12, participantSectionY - 12);
  ctx.fill(new Path2D('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'));
  ctx.restore();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(dados.nomeParticipante, startAvatarX + (avatarRadius * 2) + gap, participantSectionY);

  // Divisor tracejado
  const dashY = participantSectionY + 58;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(45, dashY);
  ctx.lineTo(W - 45, dashY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 6. Lista de Detalhes
  const drawRow = (y: number, iconSource: string | any, label: string, value: string) => {
    const isImage = typeof iconSource !== 'string' && iconSource;
    const r = isImage ? 34 : 22; // Círculo maior para a imagem do evento
    
    ctx.beginPath();
    ctx.arc(65, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    
    // Desenha borda apenas se não for imagem (para a imagem ficar mais "clean" ou com borda sutil)
    if (!isImage) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.stroke();
    }

    if (typeof iconSource === 'string') {
      ctx.fillStyle = '#10b981';
      ctx.save();
      ctx.translate(65 - 12, y - 12);
      ctx.fill(new Path2D(iconSource));
      ctx.restore();
    } else if (iconSource) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(65, y, r, 0, Math.PI * 2);
      ctx.clip();
      
      const ratio = iconSource.width / iconSource.height;
      let sw = iconSource.width, sh = iconSource.height;
      let sx = 0, sy = 0;
      if (ratio > 1) {
        sw = sh;
        sx = (iconSource.width - sw) / 2;
      } else {
        sh = sw;
        sy = (iconSource.height - sh) / 2;
      }
      ctx.drawImage(iconSource, sx, sy, sw, sh, 65 - r, y - r, r * 2, r * 2);
      ctx.restore();
    }

    const textX = 115; // Afasta o texto para dar espaço ao círculo maior

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter';
    ctx.fillText(label, textX, y - 8);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px Inter';
    const displayVal = value.length > 40 ? value.substring(0, 40) + '…' : value;
    ctx.fillText(displayVal, textX, y + 10);
  };

  const fireIcon = 'M19.48,12.35c-1.57-4.08-7.16-4.3-5.81-10.23c0.1-0.44-0.37-0.78-0.75-0.55C9.29,3.71,6.68,8,7,12.36c0.19,2.68,1.4,5.11,3.44,6.74 A6.85,6.85,0,0,0,12,20.59c2.27,0,4.39-1.23,5.55-3.23C18.22,16.2,19.8,14.66,19.48,12.35z';
  const calIcon = 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z';
  const locIcon = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';

  // eventoImgObj já foi carregado acima (antes do card)
  const row1Y = dashY + 45;
  drawRow(row1Y, eventoImgObj || fireIcon, 'EVENTO', dados.nomeEvento);

  const line1Y = row1Y + 35;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath(); ctx.moveTo(45, line1Y); ctx.lineTo(W - 45, line1Y); ctx.stroke();

  const row2Y = line1Y + 35;
  let dataEv = '';
  if (dados.dataEvento) {
    try {
      const d = new Date(dados.dataEvento);
      const dStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const hStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      dataEv = `${dStr} às ${hStr}`;
    } catch (_) { }
  }
  drawRow(row2Y, calIcon, 'DATA DO EVENTO', dataEv || 'Data não informada');

  const line2Y = row2Y + 35;
  ctx.beginPath(); ctx.moveTo(45, line2Y); ctx.lineTo(W - 45, line2Y); ctx.stroke();

  const row3Y = line2Y + 35;
  drawRow(row3Y, locIcon, 'LOCAL', dados.localEvento || 'Local não informado');

  // 7. Rodapé
  const footerY = H - 56;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, footerY, W, 56);
  ctx.beginPath(); ctx.moveTo(0, footerY); ctx.lineTo(W, footerY); ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.save();
  ctx.translate(W / 2 - 170, footerY + 28 - 12);
  // Shield Lock Icon
  ctx.fill(new Path2D('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'));
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Inter';
  ctx.fillText('Apresente este comprovante na entrada do evento', W / 2 - 135, footerY + 28);


  const buffer = await canvas.encode('png');
  return buffer.toString('base64');
}

// ── ENVIO DE IMAGEM VIA WHATSAPP (Evolution API) ──
async function enviarImagemWhatsApp(telefone: string, base64Png: string, caption: string) {
  try {
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: config } = await supabaseAdmin.from("configuracoes").select("*").eq("id", 1).single();

    if (!config?.evolution_enabled || !config?.evolution_api_url || !config?.evolution_api_key || !config?.evolution_instance) return;

    const numLimpo = telefone.replace(/\D/g, "");
    const number = numLimpo.startsWith("55") ? numLimpo : "55" + numLimpo;
    const baseUrl = config.evolution_api_url.endsWith('/') ? config.evolution_api_url.slice(0, -1) : config.evolution_api_url;
    const url = `${baseUrl}/message/sendMedia/${config.evolution_instance}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': config.evolution_api_key },
      body: JSON.stringify({ number, mediatype: 'image', mimetype: 'image/png', caption, media: base64Png })
    });

    if (!response.ok) {
      const resData = await response.json();
      console.error(`[Evolution Media] Erro (${response.status}):`, JSON.stringify(resData));
    }
  } catch (error) {
    console.error("[Evolution Media] Erro crítico:", error);
  }
}

// --- API ROUTES ---

// Página HTML de depuração para visualizar o comprovante
app.get("/api/comprovante/debug", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Debug Comprovante</title>
      <style>
        body { background: #1f2937; display: flex; justify-content: center; padding: 40px; font-family: sans-serif; }
        .container { text-align: center; }
        img { border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); max-width: 100%; height: auto; }
        button { margin-bottom: 20px; padding: 12px 24px; cursor: pointer; font-size: 16px; border-radius: 8px; border: none; background: #10b981; color: white; font-weight: bold; transition: background 0.2s; }
        button:hover { background: #059669; }
      </style>
    </head>
    <body>
      <div class="container">
        <button onclick="refreshImg()">🔄 Atualizar Comprovante</button>
        <br/>
        <img id="ticketImg" src="/api/comprovante/preview" alt="Comprovante gerado" />
      </div>
      <script>
        function refreshImg() {
          const img = document.getElementById('ticketImg');
          img.src = '/api/comprovante/preview?t=' + new Date().getTime();
        }
      </script>
    </body>
    </html>
  `);
});

// Preview do comprovante (para ajuste de layout)
app.get("/api/comprovante/preview", async (req, res) => {
  try {
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: config } = await supabaseAdmin.from("configuracoes").select("logo_url, nome_sistema").eq("id", 1).single();
    
    // Buscar um evento real para o preview
    const { data: evento } = await supabaseAdmin.from("eventos").select("titulo, data_evento, local_evento, imagem_url").not("imagem_url", "is", null).limit(1).single();

    const imgBase64 = await gerarImagemComprovante({
      nomeEvento: evento?.titulo || "Show de Verão 2025 - Exemplo de Evento",
      nomeParticipante: "João da Silva Santos",
      displayId: "AB3X7K",
      dataEvento: evento?.data_evento || new Date().toISOString(),
      localEvento: evento?.local_evento || "Arena dos Eventos, Rua das Flores, 123",
      dataCompra: new Date().toISOString(),
      convidadoId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      logoUrl: config?.logo_url || "",
      nomeSistema: config?.nome_sistema || "Eventos",
      imagemEventoUrl: evento?.imagem_url || "" 
    });

    const buf = Buffer.from(imgBase64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch (err: any) {
    res.status(500).send("Erro ao gerar preview: " + err.message);
  }
});

// Checkout Unificado - Compra de Ingressos
app.post("/api/pagamento/pix", async (req, res) => {
  try {
    const { evento_id, cliente, quantidade, convidados, vendedor_ref } = req.body;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Configuração do Supabase ausente." });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const cpfLimpo = cliente.cpf.replace(/\D/g, "");
    let clienteId;

    const { data: existingCliente } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("cpf", cpfLimpo)
      .maybeSingle();

    if (existingCliente) {
      clienteId = existingCliente.id;
    } else {
      const { data: newCliente, error: clientError } = await supabaseAdmin
        .from("clientes")
        .insert({
          nome_completo: cliente.nome,
          cpf: cpfLimpo,
          email: cliente.email,
          telefone: cliente.telefone
        })
        .select()
        .single();
      if (clientError) throw clientError;
      clienteId = newCliente.id;
    }

    // 0. Limpeza: Cancelar pedidos PENDENTES anteriores desse cliente para este evento
    const { data: oldOrders } = await supabaseAdmin
      .from("pedidos")
      .select("id")
      .eq("cliente_id", clienteId)
      .eq("evento_id", evento_id)
      .eq("status", "pendente");

    if (oldOrders && oldOrders.length > 0) {
      const oldIds = oldOrders.map(o => o.id);
      await supabaseAdmin.from("pedidos").update({ status: "cancelado" }).in("id", oldIds);
    }

    // Buscar dados do evento
    const { data: evento } = await supabaseAdmin
      .from("eventos")
      .select("titulo, valor_ingresso, timeout_reserva, off_price, qtd_off, capacidade")
      .eq("id", evento_id)
      .single();

    if (!evento) {
      return res.status(404).json({ error: "Evento não encontrado." });
    }

    // Verificar capacidade restante
    const { data: pedidosPagos } = await supabaseAdmin
      .from("pedidos")
      .select("quantidade")
      .eq("evento_id", evento_id)
      .in("status", ["pago", "pendente"]);

    const totalVendidos = pedidosPagos?.reduce((acc, p) => acc + (p.quantidade || 0), 0) || 0;
    const qtdIngressos = quantidade || 1;

    if (totalVendidos + qtdIngressos > evento.capacidade) {
      return res.status(400).json({ error: `Ingressos insuficientes. Restam apenas ${evento.capacidade - totalVendidos} ingressos disponíveis.` });
    }

    let precoUnitario = Number(evento.valor_ingresso || 0);
    if (evento.off_price && evento.qtd_off && qtdIngressos >= evento.qtd_off) {
      precoUnitario = Number(evento.off_price);
    }

    const valorTotal = qtdIngressos * precoUnitario;
    const timeout = evento.timeout_reserva || 15;
    const expiraEm = new Date();
    expiraEm.setMinutes(expiraEm.getMinutes() + timeout);

    let vendedorIdDB = null;
    let vendaDireta = false;

    if (vendedor_ref) {
      const { data: vInfo } = await supabaseAdmin.from('vendedores').select('id').eq('codigo_ref', vendedor_ref).maybeSingle();
      if (vInfo) vendedorIdDB = vInfo.id;
    } else {
      vendaDireta = true;
      // Atribuir para o primeiro admin encontrado
      const { data: vAdmin } = await supabaseAdmin.from('vendedores').select('id').eq('is_admin', true).limit(1).maybeSingle();
      if (vAdmin) vendedorIdDB = vAdmin.id;
    }

    const displayId = gerarDisplayId();

    const { data: config } = await supabaseAdmin.from("configuracoes").select("mp_access_token").eq("id", 1).single();
    if (!config?.mp_access_token) throw new Error("Mercado Pago não configurado.");

    const mpClient = new MercadoPagoConfig({ accessToken: config.mp_access_token });
    const payment = new Payment(mpClient);

    const mpResponse = await payment.create({
      body: {
        transaction_amount: valorTotal,
        description: `Evento - Pedido ${displayId}`,
        payment_method_id: "pix",
        payer: {
          email: cliente.email,
          first_name: cliente.nome.split(" ")[0],
          last_name: cliente.nome.split(" ").slice(1).join(" "),
          identification: { type: "CPF", number: cpfLimpo }
        }
      }
    });

    if (!mpResponse.id) {
      throw new Error("Falha ao gerar o PIX no Mercado Pago.");
    }

    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .insert({
        evento_id,
        cliente_id: clienteId,
        vendedor_id: vendedorIdDB,
        venda_direta: vendaDireta,
        quantidade: qtdIngressos,
        valor_total: valorTotal,
        status: "pendente",
        expira_em: expiraEm.toISOString(),
        display_id: displayId,
        mp_payment_id: mpResponse.id.toString(),
        mp_qr_code: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
        mp_pix_copy_paste: mpResponse.point_of_interaction?.transaction_data?.qr_code
      })
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    // Salvar convidados (acompanhantes)
    if (convidados && convidados.length > 0) {
      const convidadosParaInserir = convidados.map((nome: string) => ({
        pedido_id: pedido.id,
        nome_completo: nome.trim()
      }));

      const { error: convidadosError } = await supabaseAdmin
        .from("convidados")
        .insert(convidadosParaInserir);

      if (convidadosError) {
        console.error("[Convidados] Erro ao salvar:", convidadosError);
      }
    }

    // Captura dados para WhatsApp antes de responder
    const pixCode = mpResponse.point_of_interaction?.transaction_data?.qr_code;
    const listaConvidados = convidados && convidados.length > 0
      ? `\n👥 *Participantes:* ${convidados.join(', ')}`
      : '';
    const msgPix = `📌 *PEDIDO REALIZADO: #${displayId}*\n\nOlá *${cliente.nome}*!\n\nSua reserva para o evento *${evento?.titulo || 'Evento'}* foi gerada com sucesso.\n\n🎫 *INGRESSOS:* ${qtdIngressos}${listaConvidados}\n💰 *TOTAL:* R$ ${valorTotal.toFixed(2).replace('.', ',')}\n\n⚠️ _Sua reserva expira em ${timeout} minutos._\n\n*💸 CÓDIGO PIX COPIA E COLA:* 👇`;
    const telefoneCliente = cliente.telefone;

    // 📲 Dispara WhatsApp em segundo plano para liberar o checkout do cliente instantaneamente
    (async () => {
      try {
        await enviarMensagemWhatsApp(telefoneCliente, msgPix);
        if (pixCode) {
          await new Promise(r => setTimeout(r, 500));
          await enviarMensagemWhatsApp(telefoneCliente, pixCode.trim());
        }
      } catch (err) {
        console.error("[WhatsApp] Erro ao enviar mensagem inicial em segundo plano:", err);
      }
    })();

    // ✅ Responde com o QR Code
    res.json({
      qr_code_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code: pixCode,
      payment_id: mpResponse.id,
      pedido_id: pedido.id
    });

  } catch (error: any) {
    console.error("ERRO CRITICO:", error);
    res.status(500).json({ error: error.message || "Erro interno" });
  }
});



// Helper para confirmar convidados e gerar números sequenciais
async function confirmarEGerarNumeros(supabaseAdmin: any, pedidoId: string, eventoId: string) {
  const { data: convidadosList } = await supabaseAdmin
    .from("convidados")
    .select("id, nome_completo, numero, confirmado")
    .eq("pedido_id", pedidoId)
    .order("created_at", { ascending: true });

  if (!convidadosList || convidadosList.length === 0) return [];

  const { data: confirmados } = await supabaseAdmin
    .from("convidados")
    .select("numero, pedidos!inner(evento_id)")
    .eq("pedidos.evento_id", eventoId)
    .eq("confirmado", true);

  let maxNum = 0;
  if (confirmados) {
    confirmados.forEach((c: any) => {
      if (c.numero !== null && c.numero !== undefined) {
        const n = Number(c.numero);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
  }

  for (const convidado of convidadosList) {
    if (!convidado.confirmado) {
      maxNum++;
      await supabaseAdmin
        .from("convidados")
        .update({ confirmado: true, numero: maxNum })
        .eq("id", convidado.id);
      convidado.numero = maxNum;
      convidado.confirmado = true;
    }
  }

  return convidadosList;
}


// Helper para confirmar convidados e gerar números sequenciais
async function confirmarEGerarNumeros(supabaseAdmin: any, pedidoId: string, eventoId: string) {
  const { data: convidadosList } = await supabaseAdmin
    .from("convidados")
    .select("id, nome_completo, numero, confirmado")
    .eq("pedido_id", pedidoId)
    .order("created_at", { ascending: true });

  if (!convidadosList || convidadosList.length === 0) return [];

  const { data: confirmados } = await supabaseAdmin
    .from("convidados")
    .select("numero, pedidos!inner(evento_id)")
    .eq("pedidos.evento_id", eventoId)
    .eq("confirmado", true);

  let maxNum = 0;
  if (confirmados) {
    confirmados.forEach((c: any) => {
      if (c.numero !== null && c.numero !== undefined) {
        const n = Number(c.numero);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
  }

  for (const convidado of convidadosList) {
    if (!convidado.confirmado) {
      maxNum++;
      await supabaseAdmin
        .from("convidados")
        .update({ confirmado: true, numero: maxNum })
        .eq("id", convidado.id);
      convidado.numero = maxNum;
      convidado.confirmado = true;
    }
  }

  return convidadosList;
}

// STATUS WEBHOOKS
app.get("/api/pagamento/status/:pedido_id", async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await supabaseAdmin.from("pedidos").select("status").eq("id", pedido_id).single();
    res.json({ status: data?.status });
  } catch (error) { res.status(500).json({ error: "Erro" }); }
});

app.post("/api/webhooks/mercadopago", async (req, res) => {
  try {
    const { action, data } = req.body;
    const paymentId = data?.id;
    console.log(`[MP Webhook] Recebido: ${action} | ID: ${paymentId}`);

    if (action === "payment.updated" || action === "payment.created") {
      const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: config } = await supabaseAdmin.from("configuracoes").select("mp_access_token, webhook_pago, logo_url, nome_sistema").single();
      const payment = new Payment(new MercadoPagoConfig({ accessToken: config!.mp_access_token }));
      const info = await payment.get({ id: paymentId });

      console.log(`[MP Webhook] Status MP para ${paymentId}: ${info.status}`);

      if (info.status === "approved") {
        const { data: p } = await supabaseAdmin.from("pedidos").select("id").eq("mp_payment_id", paymentId.toString()).single();
        console.log(`[MP Webhook] Pedido no DB encontrado:`, p ? "SIM" : "NÃO");

        if (p) {
          const pixTransactionId = (info as any).point_of_interaction?.transaction_data?.transaction_id;
          await supabaseAdmin.from("pedidos").update({
            status: "pago",
            pago_em: new Date().toISOString(),
            pix_transaction_id: pixTransactionId
          }).eq("id", p.id);

          const { data: pedidoFull } = await supabaseAdmin
            .from("pedidos")
            .select("*, cliente:clientes(nome_completo, telefone, cpf, email), evento:eventos(id, titulo, data_evento, local_evento, imagem_url), vendedor:vendedores(nome, whatsapp)")
            .eq("id", p.id)
            .single();

          if (pedidoFull) {
            const pedidoIdCurto = pedidoFull.display_id || pedidoFull.id.substring(0, 8).toUpperCase();

            // Buscar convidados do pedido e confirmar/gerar número
            const convidadosList = await confirmarEGerarNumeros(supabaseAdmin, p.id, pedidoFull.evento.id);

            const nomesConvidados = convidadosList?.map((c: any) => c.nome_completo) || [];
            const convidadosTexto = nomesConvidados.length > 0
              ? `\n👥 *Participantes:*\n ${nomesConvidados.join(', ')}`
              : '';

            // Envio de WhatsApp: mensagem de texto + comprovante por convidado
            if (pedidoFull.cliente?.telefone) {
              const msgConfirm = `✅ *PAGAMENTO CONFIRMADO!*\n\nOlá *${pedidoFull.cliente.nome_completo}*!\n\nConfirmamos o pagamento da sua inscrição *#${pedidoIdCurto}*.\n\n🎉 *Evento:* ${pedidoFull.evento?.titulo}\n🎫 *N° de ingressos:* ${pedidoFull.quantidade}${convidadosTexto}\n\nNos vemos no evento! 🎶`;
              await enviarMensagemWhatsApp(pedidoFull.cliente.telefone, msgConfirm);

              // Envia um comprovante com QR Code por convidado
              for (const convidado of (convidadosList || [])) {
                try {
                  await new Promise(r => setTimeout(r, 800));
                  const imgBase64 = await gerarImagemComprovante({
                    nomeEvento: pedidoFull.evento?.titulo || 'Evento',
                    nomeParticipante: convidado.nome_completo,
                    displayId: pedidoIdCurto,
                    dataEvento: pedidoFull.evento?.data_evento,
                    localEvento: pedidoFull.evento?.local_evento,
                    dataCompra: pedidoFull.created_at,
                    convidadoId: convidado.id,
                    logoUrl: config?.logo_url || '',
                    nomeSistema: config?.nome_sistema || 'Eventos',
                    imagemEventoUrl: pedidoFull.evento?.imagem_url || '',
                    numeroConvidado: convidado.numero
                  });
                  await enviarImagemWhatsApp(pedidoFull.cliente.telefone, imgBase64, `🎫 Ingresso de ${convidado.nome_completo}`);
                } catch (imgErr) {
                  console.error('[Comprovante] Erro ao gerar/enviar imagem:', imgErr);
                }
              }
            }
          }
        }
      }
    }
  } catch (e) { console.error(`[WEBHOOK] Erro:`, e); }
  res.send("OK");
});

// APROVAÇÃO MANUAL
app.post("/api/pedidos/aprovar-manual/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Atualiza status
    await supabaseAdmin.from("pedidos").update({
      status: "pago",
      pago_em: new Date().toISOString()
    }).eq("id", id);

    // Busca detalhes
    const { data: config } = await supabaseAdmin.from("configuracoes").select("logo_url, nome_sistema").eq("id", 1).single();

    const { data: pedidoFull } = await supabaseAdmin
      .from("pedidos")
      .select("*, cliente:clientes(nome_completo, telefone, cpf, email), evento:eventos(id, titulo, data_evento, local_evento, imagem_url), vendedor:vendedores(nome, whatsapp)")
      .eq("id", id)
      .single();

    if (pedidoFull) {
      const pedidoIdCurto = pedidoFull.display_id || pedidoFull.id.substring(0, 8).toUpperCase();
      const convidadosList = await confirmarEGerarNumeros(supabaseAdmin, id, pedidoFull.evento.id);

      const nomesConvidados = convidadosList?.map((c: any) => c.nome_completo) || [];
      const convidadosTexto = nomesConvidados.length > 0
        ? `\n👥 *Participantes:* ${nomesConvidados.join(', ')}`
        : '';

      if (pedidoFull.cliente?.telefone) {
        const msgConfirm = `✅ *PAGAMENTO CONFIRMADO!*\n\nOlá *${pedidoFull.cliente.nome_completo}*!\n\nConfirmamos o pagamento da sua inscrição *#${pedidoIdCurto}*.\n\n🎉Evento: *${pedidoFull.evento?.titulo}*\n🎫 N° de ingressos: *${pedidoFull.quantidade}*${convidadosTexto}\n\nNos vemos no evento! 🎶`;
        await enviarMensagemWhatsApp(pedidoFull.cliente.telefone, msgConfirm);

        // Envia um comprovante com QR Code por convidado
        for (const convidado of (convidadosList || [])) {
          try {
            await new Promise(r => setTimeout(r, 800));
            const imgBase64 = await gerarImagemComprovante({
              nomeEvento: pedidoFull.evento?.titulo || 'Evento',
              nomeParticipante: convidado.nome_completo,
              displayId: pedidoIdCurto,
              dataEvento: pedidoFull.evento?.data_evento,
              localEvento: pedidoFull.evento?.local_evento,
              dataCompra: pedidoFull.created_at,
              convidadoId: convidado.id,
              logoUrl: config?.logo_url || '',
              nomeSistema: config?.nome_sistema || 'Eventos',
              imagemEventoUrl: pedidoFull.evento?.imagem_url || '',
              numeroConvidado: convidado.numero
            });
            await enviarImagemWhatsApp(pedidoFull.cliente.telefone, imgBase64, `🎫 Ingresso de ${convidado.nome_completo}`);
          } catch (imgErr) {
            console.error('[Comprovante] Erro ao gerar/enviar imagem:', imgErr);
          }
        }
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro na aprovação manual:", error);
    res.status(500).json({ error: error.message });
  }
});


// REENVIAR COMPROVANTE
app.post("/api/pedidos/reenviar-comprovante/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: config } = await supabaseAdmin.from("configuracoes").select("logo_url, nome_sistema").eq("id", 1).single();

    const { data: pedidoFull } = await supabaseAdmin
      .from("pedidos")
      .select("*, cliente:clientes(nome_completo, telefone, cpf, email), evento:eventos(id, titulo, data_evento, local_evento, imagem_url)")
      .eq("id", id)
      .single();

    if (!pedidoFull) return res.status(404).json({ error: "Pedido não encontrado" });
    if (pedidoFull.status !== 'pago') return res.status(400).json({ error: "Pedido ainda não foi pago." });

    const pedidoIdCurto = pedidoFull.display_id || pedidoFull.id.substring(0, 8).toUpperCase();

    const { data: convidadosList } = await supabaseAdmin
      .from("convidados")
      .select("id, nome_completo, numero, confirmado")
      .eq("pedido_id", id);

    if (!pedidoFull.cliente?.telefone) {
      return res.status(400).json({ error: "Telefone do cliente não encontrado." });
    }

    for (const convidado of (convidadosList || [])) {
      try {
        await new Promise(r => setTimeout(r, 800));
        const imgBase64 = await gerarImagemComprovante({
          nomeEvento: pedidoFull.evento?.titulo || 'Evento',
          nomeParticipante: convidado.nome_completo,
          displayId: pedidoIdCurto,
          dataEvento: pedidoFull.evento?.data_evento,
          localEvento: pedidoFull.evento?.local_evento,
          dataCompra: pedidoFull.created_at,
          convidadoId: convidado.id,
          logoUrl: config?.logo_url || '',
          nomeSistema: config?.nome_sistema || 'Eventos',
          imagemEventoUrl: pedidoFull.evento?.imagem_url || '',
          numeroConvidado: convidado.numero
        });
        await enviarImagemWhatsApp(pedidoFull.cliente.telefone, imgBase64, `🎫 Ingresso de ${convidado.nome_completo}`);
      } catch (imgErr) {
        console.error('[Reenviar Comprovante] Erro ao gerar/enviar:', imgErr);
      }
    }

    res.json({ success: true, message: `Comprovante(s) reenviado(s) para ${pedidoFull.cliente.telefone}` });
  } catch (error: any) {
    console.error("Erro ao reenviar comprovante:", error);
    res.status(500).json({ error: error.message });
  }
});

// ── CONFIGURAÇÃO DE AMBIENTE ──

if (process.env.VERCEL) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath, { index: false }));
}

if (!process.env.VERCEL) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// Catch-all para SPA
app.get("*", async (req, res) => {
  const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
  const rootIndex = path.join(process.cwd(), "index.html");
  const distIndex = path.join(process.cwd(), "dist", "index.html");

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (isDev) {
    if (fs.existsSync(rootIndex)) return res.sendFile(rootIndex);
  } else {
    if (fs.existsSync(distIndex)) return res.sendFile(distIndex);
    if (fs.existsSync(rootIndex)) return res.sendFile(rootIndex);
  }

  res.status(404).send("Página não encontrada");
});

// Inicialização
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`[ADMIN API] Servidor em http://localhost:${PORT}`));
}

export default app;
