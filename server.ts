import http from 'http';
import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import webpush from 'web-push';

// Category Classifier for Materials and Equipment
function classifyMaterialCategory(nameOrDesc: string, fallbackCategory?: string): string {
  if (!nameOrDesc || typeof nameOrDesc !== 'string') {
    return fallbackCategory || 'Outros';
  }

  const s = nameOrDesc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. MÁQUINAS & EQUIPAMENTOS (High Priority)
  const equipamentosRegex = /\b(bomba\s*de?\s*calor|bomba\s*calor|inversor|microinversor|vmc|ar\s*condicionado|ar\s*cond\b|ar\s*condicionado\b|unidade\s*exterior|unidade\s*interior|unid\s*ext\b|unid\s*int\b|mural|mono\s*split|multisplit|multi-split|split\b|splits\b|conduta|ventiloconvector|ventiloconvectores|ventiloconvectora|cassete|termoacumulador|cilindro|deposito\s*(de\s*)?(aqs|agua|inercia)|deposito|painel\s*solar|paineis\s*solares|modulo\s*fotovoltaico|modulo\s*solar|aerotermia|recuperador\s*de?\s*calor|recuperador|caldeira|chiller|ventilador\s*centrifugo|extrator\s*de?\s*ar|desumidificador|grupo\s*termico|grupo\s*hidraulico|permutador|bateria\s*de\s*litio|baterias?\s*(solar|acumulacao)|mitsubishi|daikin|panasonic|haier|baxi|ariston|vaillant|daitsu|gree|midea|toshiba|hitachi|carrier|fujitsu|vulcano|junkers|atlantic|ecodan|altherma|aquarea|therma\s*v|msz|muz|mxz|mfz|ftx)\b/;
  if (equipamentosRegex.test(s)) {
    return 'Máquinas & Equipamentos';
  }

  // 2. ACESSÓRIOS & FIXAÇÃO
  const fixacaoRegex = /\b(bucha|buchas|abracadeira|abracadeiras|abrac|parafuso|parafusos|porca|porcas|anilha|anilhas|varao|varao\s*roscado|fita\s*cola|fita\s*isoladora|fita\s*aluminio|fita\s*adesiva|fita\s*teflon|teflon|cola\s*veda|cola-veda|silicone|massa\s*refrataria|espuma\s*pu|espuma\s*poliuretano|suporte\s*mural|suporte\s*chao|suporte\s*para|amortecedor|amortecedores|silentblock|silent\s*blocks|cantoneira|taco|tacos|rebite|rebites|grampo|grampos|gancho|ganchos|perfil\s*omega|calha\s*de\s*fixacao|bracadeira|bracadeiras)\b/;
  if (fixacaoRegex.test(s)) {
    return 'Acessórios & Fixação';
  }

  // 3. CANALIZAÇÃO & TUBAGENS
  const canalizacaoRegex = /\b(tubo|tubos|tubagem|multicamada|pex|pvc|cobre|esgoto|ppr|pp-r|polietileno|pead|curva|joelho|te\b|uniao|casquilho|valvula|passador|torneira|coletor|caixa\s*coletora|sifao|ralo|filtro\s*de?\s*agua|purgador|redutora\s*de?\s*pressao|manometro|vaso\s*de?\s*expansao|vaso\s*expansao|coquilha|isolamento\s*termico|armacell|kaiflex|racord|flange|manga|bicha\s*flexivel|valvula\s*seguranca|valvula\s*retencao|fluxostato|pressostato)\b/;
  if (canalizacaoRegex.test(s)) {
    return 'Canalização & Tubagens';
  }

  // 4. MATERIAL ELÉTRICO
  const eletricoRegex = /\b(cabo|cabos|fio|fios|disjuntor|disjuntores|diferencial|diferenciais|quadro\s*eletrico|interruptor|interruptores|tomada|tomadas|bornes?|barramento|tubo\s*corrugado|tubo\s*vd|corrugado|vd\s*20|vd\s*25|vd\s*16|anelado|contador\s*eletrico|rele|contactor|fusivel|ligador|ligadores|wago|ponteira|ponteiras|terminais|ficha\s*macho|ficha\s*femea|transformador|fita\s*led|foco\s*led|projetor|balastro|condensador\s*eletrico)\b/;
  if (eletricoRegex.test(s)) {
    return 'Material Elétrico';
  }

  // 5. FERRAMENTAS & EQUIPAMENTO DE TRABALHO
  const ferramentasRegex = /\b(alicate|chave\s*de\s*fendas|chave\s*inglesa|berbequim|rebarbadora|bomba\s*de\s*vacuo|manifold|balanca|macarico|disco\s*de\s*corte|broca|brocas|escada|nivel\s*laser|manometro\s*digital)\b/;
  if (ferramentasRegex.test(s)) {
    return 'Ferramentas & Equipamento';
  }

  // 6. CONSTRUÇÃO CIVIL
  const construcaoRegex = /\b(cimento|argamassa|gesso|pladur|tijolo|areia|cola\s*azulejo|reboco|tinta|primario|massa\s*de\s*juntas)\b/;
  if (construcaoRegex.test(s)) {
    return 'Construção Civil';
  }

  // 7. COMBUSTÍVEL & TRANSPORTE
  const combustivelRegex = /\b(gasoleo|gasolina|combustivel|via\s*verde|portagem|estacionamento)\b/;
  if (combustivelRegex.test(s)) {
    return 'Combustível & Transporte';
  }

  // 8. REFEIÇÕES & ESTADIA
  const refeicoesRegex = /\b(almoco|jantar|refeicao|cafe|pequeno\s*almoco|hotel|alojamento|dormida)\b/;
  if (refeicoesRegex.test(s)) {
    return 'Refeições & Estadia';
  }

  if (fallbackCategory && fallbackCategory !== 'Outros') {
    return fallbackCategory;
  }

  return 'Outros';
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port: number = Number(process.env.PORT) || 3000;
const distExists = fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));
const isProduction = process.env.NODE_ENV === 'production' || (process.env.NODE_ENV !== 'development' && distExists);

// Support JSON payloads up to 50mb for invoice photos and documents
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cross-device CORS support for mobile devices and desktop
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Google GenAI on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API Route: Check Server Health & Gemini status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// API Route: Invoice Analysis with Direct Multimodal Gemini (gemini-2.5-pro / gemini-2.5-flash)
app.post('/api/gemini/analyze-invoice', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', images, detectedQr } = req.body;

    const rawImagesList: Array<{ imageBase64: string; mimeType?: string }> = [];

    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img: any) => {
        if (typeof img === 'string') {
          rawImagesList.push({ imageBase64: img, mimeType: 'image/jpeg' });
        } else if (img && img.imageBase64) {
          rawImagesList.push({ imageBase64: img.imageBase64, mimeType: img.mimeType || 'image/jpeg' });
        }
      });
    } else if (imageBase64) {
      rawImagesList.push({ imageBase64, mimeType });
    }

    if (rawImagesList.length === 0) {
      return res.status(400).json({ error: 'Nenhum ficheiro, página ou imagem fornecido para leitura.' });
    }

    // 1. Prepare uncompressed, high-fidelity Base64 image parts for multimodal ingestion
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

    for (const item of rawImagesList) {
      const commaIdx = item.imageBase64.indexOf(',');
      const cleanBase64 = commaIdx !== -1 ? item.imageBase64.substring(commaIdx + 1) : item.imageBase64;

      let detectedMime = item.mimeType || 'image/jpeg';
      if (item.imageBase64.startsWith('data:')) {
        const mimeMatch = item.imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        if (mimeMatch) {
          detectedMime = mimeMatch[1].toLowerCase();
        }
      }

      const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (!validMimes.includes(detectedMime)) {
        detectedMime = 'image/jpeg';
      }

      imageParts.push({
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64,
        },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Chave GEMINI_API_KEY não configurada no servidor. Por favor configure a chave para processamento com Gemini.',
      });
    }

    let fiscalContext = '';
    if (detectedQr) {
      fiscalContext = `\n\n[DADOS FISCAIS CERTIFICADOS PELO CÓDIGO QR DA AUTORIDADE TRIBUTÁRIA (AT)]:
- NIF Emitente (Fornecedor): ${detectedQr.taxId || ''} (${detectedQr.storeName || ''})
- Nº Documento: ${detectedQr.invoiceNumber || ''}
- Data Emissão: ${detectedQr.date || ''}
- Total c/ IVA: ${detectedQr.totalWithTax || 0} €
- Total de IVA: ${detectedQr.taxAmount || 0} €
- Subtotal s/ IVA: ${detectedQr.subtotalWithoutTax || 0} €
ATENÇÃO: O código QR da AT comprova de forma certificada o NIF do emitente e os totais finais.`;
    }

    // Specialized Portuguese accounting prompt requested by user
    const prompt = `És um extrator contabilístico especializado em faturas e talões comerciais em Portugal (ex: TOCOnline, Moloni, PHC, Primavera, talões térmicos).
${fiscalContext}

Analisa a imagem e extrai os dados estritamente em formato JSON com base nas seguintes regras obrigatórias:

1. DISTINÇÃO FISCAL (MUITO IMPORTANTE):
   - EMITENTE (Fornecedor/Comerciante): É quem vende e emite a fatura. Procura no cabeçalho ou dados da empresa (ex: ERGES SOL, ENAT, Rexel, Sanitop, Pecomark, Worten, Leroy Merlin, etc.). O NIF do emitente é o que acompanha a morada da empresa e registo comercial (ex: 507718275).
   - CLIENTE (Adquirente): É quem compra (ex: João Alberto...). O NIF do cliente é o que vem no campo 'Cliente' / 'Adquirente' (ex: 223714984).
   - NUNCA troques os dois NIFs. O emitente/fornecedor NUNCA pode ser o cliente comprador.

2. PREVENÇÃO DE DUPLICADOS (VIAS DO DOCUMENTO):
   - O documento pode conter 'Original', 'Duplicado' e 'Triplicado'. Extrai os artigos da tabela APENAS UMA VEZ. Ignora as páginas seguintes se forem cópias/vias repetidas da mesma fatura.

3. TABELA DE PRODUTOS E LINHAS:
   - Extrai cada artigo com:
     * referencia: código do artigo (ex: '10011', '9130'). Se não existir, coloca "".
     * descricao: descrição completa do artigo (ex: 'L010MVDVFLEX9 COND CORRUG...', 'Grelha circular c/malha aluminio...').
     * quantidade: número decimal (ex: 200.0, 2.0).
     * unidade: unidade de medida se existir (ex: 'un', 'm', 'm2', 'kg', 'cx', 'rolo').
     * preco_unitario: preço unitário base (antes do desconto).
     * desconto_percentual: valor da coluna '% Desc' (ex: 45.0). Se não existir, coloca 0.
     * taxa_iva: taxa de IVA indicada na linha (ex: 23).
     * total_linha_sem_iva: valor da coluna 'Valor sem iva' (ex: 749.10, 45.50).
     * total_linha_com_iva: valor da coluna com IVA (ex: total_linha_sem_iva * (1 + taxa_iva/100)).
   - Textos soltos como 'Referente à obra...' ou observações de transporte/pagamento devem ser guardados no campo observacoes e NUNCA como linha de produto.

4. RESUMO FISCAL E TOTAIS:
   - Retira os valores da caixa de resumo do documento:
     * base_incidencia_23: soma da base tributável a 23% ou total ilíquido sem IVA (ex: 794.60).
     * total_iva: valor total do IVA (ex: 182.76).
     * descontos_linha: total de descontos comerciais concedidos (ex: 650.12).
     * total_documento: valor final pago com IVA (ex: 977.36).
     * acerto_arredondamento: acerto de cêntimos ou arredondamento final.

5. NORMALIZAÇÃO:
   - Converte todas as vírgulas decimais para ponto (749,10 -> 749.10).
   - Datas sempre em formato YYYY-MM-DD (ex: '2026-10-14').`;

    // Strict JSON schema matching Portuguese accounting structure
    const invoiceSchema = {
      type: Type.OBJECT,
      properties: {
        emitente: {
          type: Type.OBJECT,
          description: 'Dados da entidade emitente / vendedor (fornecedor)',
          properties: {
            nome: { type: Type.STRING, description: 'Nome comercial ou denominação social do emitente' },
            nif: { type: Type.STRING, description: 'NIF/NIPC do emitente (9 dígitos, ex: 507718275)' },
          },
          required: ['nome', 'nif'],
        },
        cliente: {
          type: Type.OBJECT,
          description: 'Dados do adquirente / comprador (cliente)',
          properties: {
            nome: { type: Type.STRING, description: 'Nome do cliente/adquirente (ex: João Alberto...)' },
            nif: { type: Type.STRING, description: 'NIF do cliente adquirente (ex: 223714984)' },
          },
        },
        numero_documento: { type: Type.STRING, description: 'Número do documento e série (ex: FT 2026/1842)' },
        data_emissao: { type: Type.STRING, description: 'Data de emissão da fatura (YYYY-MM-DD)' },
        observacoes: { type: Type.STRING, description: 'Textos soltos como "Referente à obra...", notas ou condições' },
        resumo_fiscal: {
          type: Type.OBJECT,
          description: 'Totais fiscais e financeiros da fatura',
          properties: {
            base_incidencia_23: { type: Type.NUMBER, description: 'Soma da base de incidência tributável a 23% / total sem IVA' },
            total_iva: { type: Type.NUMBER, description: 'Valor total do IVA faturado' },
            descontos_linha: { type: Type.NUMBER, description: 'Total de descontos concedidos em euros' },
            total_documento: { type: Type.NUMBER, description: 'Valor total final a pagar com IVA' },
            acerto_arredondamento: { type: Type.NUMBER, description: 'Acerto de cêntimos ou arredondamento' },
          },
          required: ['total_documento'],
        },
        itens: {
          type: Type.ARRAY,
          description: 'Lista obrigatória de cada linha de produto discriminado na tabela da fatura',
          items: {
            type: Type.OBJECT,
            properties: {
              referencia: { type: Type.STRING, description: 'Código ou referência do artigo' },
              descricao: { type: Type.STRING, description: 'Descrição completa do artigo' },
              categoria: { type: Type.STRING, description: 'Categoria do material' },
              quantidade: { type: Type.NUMBER, description: 'Quantidade faturada (número decimal)' },
              unidade: { type: Type.STRING, description: 'Unidade de medida (un, m, m2, kg, cx, etc.)' },
              preco_unitario: { type: Type.NUMBER, description: 'Preço unitário base antes do desconto' },
              desconto_percentual: { type: Type.NUMBER, description: 'Valor da coluna % Desc (0 se não existir)' },
              taxa_iva: { type: Type.NUMBER, description: 'Taxa de IVA indicada na linha (ex: 23)' },
              total_linha_sem_iva: { type: Type.NUMBER, description: 'Valor da coluna sem IVA' },
              total_linha_com_iva: { type: Type.NUMBER, description: 'Valor da linha com IVA' },
            },
            required: ['referencia', 'descricao', 'quantidade', 'preco_unitario', 'taxa_iva', 'total_linha_sem_iva'],
          },
        },
      },
      required: ['emitente', 'numero_documento', 'data_emissao', 'resumo_fiscal', 'itens'],
    };

    // Primary model: gemini-2.5-pro, with automatic fallback to gemini-2.5-flash
    const candidateModels = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    let lastError: any = null;
    let parsedData: any = null;
    let modelUsed = '';

    for (const model of candidateModels) {
      try {
        console.log(`[Gemini Multimodal] A enviar fatura (${imageParts.length} página(s)) para ${model} com temperature: 0.0...`);

        const response = await ai.models.generateContent({
          model: model,
          contents: [
            {
              role: 'user',
              parts: [
                ...imageParts,
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: invoiceSchema,
            temperature: 0.0,
          },
        });

        const textOutput = response.text || '';
        if (textOutput) {
          try {
            const cleanJson = textOutput.trim();
            const codeFenceMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            const toParse = codeFenceMatch ? codeFenceMatch[1].trim() : cleanJson;
            parsedData = JSON.parse(toParse);
          } catch {
            const firstBrace = textOutput.indexOf('{');
            const lastBrace = textOutput.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              parsedData = JSON.parse(textOutput.substring(firstBrace, lastBrace + 1));
            }
          }

          if (parsedData) {
            modelUsed = model;
            const itemsCount = parsedData.itens?.length || parsedData.items?.length || 0;
            console.log(`[Gemini Multimodal] Fatura analisada com sucesso pelo ${model}! Artigos extraídos: ${itemsCount}`);
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Multimodal] Tentativa com ${model} falhou (${err?.message || err}). A tentar modelo alternativo...`);
      }
    }

    if (!parsedData) {
      const errorMsg = lastError?.message || 'Falha ao processar o documento com o modelo Gemini.';
      console.error('[Gemini Multimodal] Todos os modelos falharam na extração:', errorMsg);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }

    // 1. Fiscal entity extraction & distinction (Emitente vs Cliente)
    let storeName = parsedData.emitente?.nome || parsedData.storeName || 'Loja / Fornecedor';
    let taxId = (parsedData.emitente?.nif || parsedData.taxId || '').replace(/^PT/i, '').replace(/[^0-9]/g, '').trim();

    // Reconcile with AT QR code if available (AT QR code field A is always the EMITENTE NIF)
    if (detectedQr) {
      if (detectedQr.taxId && detectedQr.taxId.length === 9) {
        taxId = detectedQr.taxId;
      }
      if (detectedQr.storeName && (!storeName || storeName === 'Loja / Fornecedor')) {
        storeName = detectedQr.storeName;
      }
    }

    // Customer / Adquirente
    const clientData = parsedData.cliente || null;
    const clientNif = (clientData?.nif || '').replace(/^PT/i, '').replace(/[^0-9]/g, '').trim();

    // Guard: under no circumstance can the customer's NIF be set as the supplier's NIF
    if (taxId && clientNif && taxId === clientNif) {
      if (detectedQr?.taxId && detectedQr.taxId !== clientNif) {
        taxId = detectedQr.taxId;
      }
    }

    // 2. Document numbers & dates
    let invoiceNumber = parsedData.numero_documento || parsedData.invoiceNumber || '';
    if (!invoiceNumber || invoiceNumber.startsWith('FT-')) {
      invoiceNumber = detectedQr?.invoiceNumber || `FT-${Date.now().toString().slice(-6)}`;
    }

    let date = parsedData.data_emissao || parsedData.date || '';
    if (!date) {
      date = detectedQr?.date || new Date().toISOString().split('T')[0];
    }

    // 3. Fiscal summary & totals
    const resumo = parsedData.resumo_fiscal || {};
    let totalWithTax = Number(resumo.total_documento ?? parsedData.totalWithTax ?? detectedQr?.totalWithTax ?? 0);
    let subtotalWithoutTax = Number(resumo.base_incidencia_23 ?? parsedData.subtotalWithoutTax ?? detectedQr?.subtotalWithoutTax ?? 0);
    let taxAmount = Number(resumo.total_iva ?? parsedData.taxAmount ?? detectedQr?.taxAmount ?? 0);
    const globalDiscountAmount = Number(resumo.descontos_linha ?? parsedData.globalDiscountAmount ?? 0);
    const roundAdjustmentAmount = Number(resumo.acerto_arredondamento ?? parsedData.roundAdjustmentAmount ?? 0);
    const notes = parsedData.observacoes || parsedData.notes || '';

    // 4. Products & lines normalization
    const rawItems = parsedData.itens || parsedData.items || [];
    const normalizedItems = rawItems.map((item: any) => {
      const qty = Number(item.quantidade ?? item.quantity) > 0 ? Number(item.quantidade ?? item.quantity) : 1;
      let taxRate = typeof item.taxa_iva === 'number' ? item.taxa_iva : typeof item.taxRate === 'number' ? item.taxRate : 23;
      if (taxRate < 0) taxRate = 23;

      let listPrice = Number(item.preco_unitario ?? item.listPriceWithoutTax) || 0;
      let discount = Number(item.desconto_percentual ?? item.discountPercent) || 0;

      let totalWithoutTax = Number(item.total_linha_sem_iva ?? item.totalWithoutTax) || 0;
      let unitPriceWithoutTax = Number(item.unitPriceWithoutTax) || 0;

      if (totalWithoutTax > 0) {
        unitPriceWithoutTax = Number((totalWithoutTax / qty).toFixed(2));
      } else if (listPrice > 0) {
        unitPriceWithoutTax = discount > 0
          ? Number((listPrice * (1 - discount / 100)).toFixed(2))
          : listPrice;
        totalWithoutTax = Number((qty * unitPriceWithoutTax).toFixed(2));
      }

      if (listPrice <= 0 && unitPriceWithoutTax > 0) {
        listPrice = unitPriceWithoutTax;
      }

      let totalWithTax = Number(item.total_linha_com_iva ?? item.totalWithTax) || 0;
      let unitPriceWithTax = Number(item.unitPriceWithTax) || 0;

      if (totalWithTax > 0) {
        unitPriceWithTax = Number((totalWithTax / qty).toFixed(2));
      } else if (unitPriceWithoutTax > 0) {
        unitPriceWithTax = Number((unitPriceWithoutTax * (1 + taxRate / 100)).toFixed(2));
        totalWithTax = Number((qty * unitPriceWithTax).toFixed(2));
      }

      const desc = item.descricao || item.name || 'Produto';
      const ref = item.referencia || item.reference || '';
      const smartCategory = classifyMaterialCategory(desc, item.categoria || item.category);

      return {
        reference: ref,
        name: desc,
        category: smartCategory,
        quantity: qty,
        unit: item.unidade || item.unit || 'un',
        listPriceWithoutTax: listPrice,
        discountPercent: discount,
        taxRate: taxRate,
        unitPriceWithoutTax: unitPriceWithoutTax,
        unitPriceWithTax: unitPriceWithTax,
        totalWithoutTax: totalWithoutTax,
        totalWithTax: totalWithTax,
        // Preserved Portuguese fields
        referencia: ref,
        descricao: desc,
        quantidade: qty,
        preco_unitario: listPrice,
        desconto_percentual: discount,
        taxa_iva: taxRate,
        total_linha_sem_iva: totalWithoutTax,
        total_linha_com_iva: totalWithTax,
      };
    });

    if (totalWithTax <= 0 && normalizedItems.length > 0) {
      totalWithTax = Number(normalizedItems.reduce((s: number, i: any) => s + (Number(i.totalWithTax) || 0), 0).toFixed(2));
    }
    if (subtotalWithoutTax <= 0 && normalizedItems.length > 0) {
      subtotalWithoutTax = Number(normalizedItems.reduce((s: number, i: any) => s + (Number(i.totalWithoutTax) || 0), 0).toFixed(2));
    }
    if (taxAmount <= 0 && totalWithTax > subtotalWithoutTax) {
      taxAmount = Number(Math.max(0, totalWithTax - subtotalWithoutTax).toFixed(2));
    }

    const finalResult = {
      emitente: { nome: storeName, nif: taxId },
      cliente: clientData,
      numero_documento: invoiceNumber,
      data_emissao: date,
      observacoes: notes,
      resumo_fiscal: {
        base_incidencia_23: subtotalWithoutTax,
        total_iva: taxAmount,
        descontos_linha: globalDiscountAmount,
        total_documento: totalWithTax,
        acerto_arredondamento: roundAdjustmentAmount,
      },
      storeName,
      taxId,
      invoiceNumber,
      date,
      subtotalWithoutTax,
      taxAmount,
      totalWithTax,
      globalDiscountAmount,
      roundAdjustmentAmount,
      notes,
      items: normalizedItems,
      itens: normalizedItems,
      confidenceScore: 0.98,
    };

    return res.json({
      success: true,
      source: 'gemini_multimodal',
      model: modelUsed,
      data: finalResult,
    });
  } catch (error: any) {
    console.error('Erro ao processar fatura com Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Falha ao processar o documento. Verifique a imagem ou tente novamente.',
    });
  }
});

// API Route: Google Sheets Sync Webhook Proxy / Test
app.post('/api/sync/test-webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return res.status(400).json({ error: 'URL do Google Sheets Webhook não fornecido.' });
    }

    const trimmedUrl = webhookUrl.trim();

    // Friendly validation: Detect if the user pasted a raw spreadsheet link instead of an Apps Script Webhook
    if (trimmedUrl.includes('docs.google.com/spreadsheets') && !trimmedUrl.includes('script.google.com')) {
      return res.status(400).json({
        error: 'Detetou-se o link direto da folha Google Sheets (docs.google.com). Para permitir que a folha receba dados automaticamente em tempo real sem login manual constante, use o URL do Webhook do Apps Script (terminado em /exec). Siga o guia passo-a-passo no separador "Código do Google Apps Script" abaixo.',
        isSpreadsheetUrl: true,
      });
    }

    // Attempt to post to user Google Apps Script Webhook
    const response = await fetch(trimmedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const resultText = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(resultText);
    } catch {
      // Returned HTML or text
    }

    if (resultText.includes('accounts.google.com') || resultText.includes('Sign in') || resultText.includes('ServiceLogin')) {
      return res.status(403).json({
        error: 'Aceder ao Apps Script requer início de sessão. Na implementação do Google Apps Script, defina "Quem tem acesso: Qualquer pessoa" (Anyone) para permitir sincronização automática contínua.',
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: `O Google Sheets respondeu com erro (${response.status}): ${parsed?.message || resultText.slice(0, 160)}`,
      });
    }

    return res.json({
      success: true,
      message: 'Dados enviados com sucesso para a folha Google Sheets!',
      response: parsed || resultText,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Erro na sincronização: ${err.message}` });
  }
});

// API Route: Obra Financial & Engineering AI Analysis with Gemini
app.post('/api/gemini/analyze-obra', async (req: Request, res: Response) => {
  try {
    const { obraName, clientName, budget, totalGasto, totalRecebido, saldoAReceber, breakdown } = req.body;
    const numBudget = Number(budget) || 0;
    const numGasto = Number(totalGasto) || 0;
    const numRecebido = Number(totalRecebido) || 0;
    const numSaldo = Number(saldoAReceber) || (numBudget - numRecebido);

    const prompt = `És um Diretor Financeiro e Engenheiro Especialista em Obras de AVAC, Climatização, Eletricidade e Construção em Portugal.
Analisa os dados financeiros e a distribuição de custos desta obra e produz uma avaliação técnica e executiva rigorosa.

DADOS DA OBRA:
- Nome da Obra: ${obraName || 'Obra'}
- Cliente: ${clientName || 'Cliente'}
- Orçamento Aprovado: ${numBudget.toFixed(2)} €
- Total Real Gasto até agora: ${numGasto.toFixed(2)} €
- Total Já Recebido do Cliente: ${numRecebido.toFixed(2)} €
- Saldo Restante a Receber do Cliente: ${numSaldo.toFixed(2)} €

DECOMPOSIÇÃO DE CUSTOS REAIS GASTOS:
- Material de Máquinas & Equipamentos: ${Number(breakdown?.maquinas?.amount || 0).toFixed(2)} € (${breakdown?.maquinas?.percentageOfTotal || 0}%)
- Acessórios & Fixação: ${Number(breakdown?.acessorios?.amount || 0).toFixed(2)} € (${breakdown?.acessorios?.percentageOfTotal || 0}%)
- Ligações Elétricas ou Componentes: ${Number(breakdown?.eletrico?.amount || 0).toFixed(2)} € (${breakdown?.eletrico?.percentageOfTotal || 0}%)
- Tubos de Refrigeração & Gás: ${Number(breakdown?.refrigeracao?.amount || 0).toFixed(2)} € (${breakdown?.refrigeracao?.percentageOfTotal || 0}%)
- Tubos de Água / Canalização: ${Number(breakdown?.agua?.amount || 0).toFixed(2)} € (${breakdown?.agua?.percentageOfTotal || 0}%)
- Mão de Obra: ${Number(breakdown?.maodeobra?.amount || 0).toFixed(2)} € (${breakdown?.maodeobra?.percentageOfTotal || 0}%)
- Despesas Diretas sem Fatura: ${Number(breakdown?.despesasManuais?.amount || 0).toFixed(2)} € (${breakdown?.despesasManuais?.percentageOfTotal || 0}%)

INSTRUÇÕES:
Devolve EXCLUSIVAMENTE um objeto JSON válido com:
{
  "status": "excelente" | "adequada" | "alerta" | "prejuizo",
  "headline": "Frase curta de diagnóstico (ex: Margem sólida com 65% cobrado ao cliente)",
  "summary": "Resumo analítico de 2 a 3 frases com tom profissional português europeu, destacando se o cashflow atual cobre os gastos e se a proporção de máquinas vs consumíveis/mão de obra está equilibrada.",
  "keyObservations": [
    "Ponto-chave 1 sobre custos de máquinas ou tubagens",
    "Ponto-chave 2 sobre recebimentos do cliente e saldo pendente",
    "Ponto-chave 3 sobre mão de obra ou consumíveis"
  ],
  "recommendations": [
    "Recomendação prática 1 (ex: solicitar próxima tranche ao cliente)",
    "Recomendação prática 2 (ex: controlo de consumíveis ou horas)"
  ]
}`;

    let parsedResult: any = null;

    if (process.env.GEMINI_API_KEY) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const textOutput = response.text || '';
          if (textOutput) {
            const cleanText = textOutput.trim();
            const codeFenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            const toParse = codeFenceMatch ? codeFenceMatch[1].trim() : cleanText;
            parsedResult = JSON.parse(toParse);
            if (parsedResult && parsedResult.headline) {
              break;
            }
          }
        } catch (mErr) {
          console.warn(`Análise com modelo ${model} falhou:`, mErr);
        }
      }
    }

    // High quality engineering heuristic fallback if AI model is unreachable
    if (!parsedResult || !parsedResult.headline) {
      const budgetConsumedPct = numBudget > 0 ? (numGasto / numBudget) * 100 : 0;
      const billedPct = numBudget > 0 ? (numRecebido / numBudget) * 100 : 0;
      const netCashflow = numRecebido - numGasto;
      
      let calcStatus: 'excelente' | 'adequada' | 'alerta' | 'prejuizo' = 'adequada';
      let headline = '';
      if (numBudget > 0 && numGasto > numBudget) {
        calcStatus = 'prejuizo';
        headline = `Custos ultrapassaram o orçamento em ${(numGasto - numBudget).toFixed(2)} €`;
      } else if (budgetConsumedPct > 85) {
        calcStatus = 'alerta';
        headline = `Consumo crítico do orçamento (${budgetConsumedPct.toFixed(1)}% gasto)`;
      } else if (netCashflow >= 0 && budgetConsumedPct <= 65) {
        calcStatus = 'excelente';
        headline = `Margem protegida e cashflow positivo (+${netCashflow.toFixed(2)} €)`;
      } else {
        calcStatus = 'adequada';
        headline = `Obra em progresso controlado com ${budgetConsumedPct.toFixed(1)}% do orçamento gasto`;
      }

      parsedResult = {
        status: calcStatus,
        headline,
        summary: `A obra "${obraName}" apresenta um custo acumulado de ${numGasto.toFixed(2)} € contra um orçamento de ${numBudget.toFixed(2)} €. O valor recebido até agora é de ${numRecebido.toFixed(2)} € (${billedPct.toFixed(1)}% faturado), deixando um saldo pendente de ${numSaldo.toFixed(2)} € a cobrar ao cliente.`,
        keyObservations: [
          `Custos em equipamentos e materiais representam ${Number(breakdown?.maquinas?.percentageOfTotal || 0)}% dos gastos totais.`,
          `Mão de obra e subempreitadas totalizam ${Number(breakdown?.maodeobra?.amount || 0).toFixed(2)} € (${Number(breakdown?.maodeobra?.percentageOfTotal || 0)}% do gasto).`,
          netCashflow < 0 
            ? `Cashflow temporariamente adiantado pela empresa no montante de ${Math.abs(netCashflow).toFixed(2)} € face aos pagamentos do cliente.`
            : `Cashflow favorável com pagamentos do cliente a cobrir antecipadamente as despesas efetuadas.`
        ],
        recommendations: [
          numSaldo > 0 ? `Emitir auto de medição e solicitar a cobrança da tranche pendente (${numSaldo.toFixed(2)} €).` : 'Faturação ao cliente integralmente regularizada.',
          'Manter registo contínuo das faturas de materiais e horas de técnicos para assegurar o apuramento final de margem real.'
        ]
      };
    }

    return res.json({ success: true, analysis: parsedResult });
  } catch (error: any) {
    console.error('Erro ao analisar obra com Gemini:', error);
    return res.status(500).json({ error: error.message || 'Falha ao gerar análise de IA da obra.' });
  }
});

// ================= WEB PUSH NOTIFICATIONS API (iOS 16.4+ & ANDROID / DESKTOP) =================
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!vapidPublicKey || !vapidPrivateKey) {
  try {
    const generatedKeys = webpush.generateVAPIDKeys();
    vapidPublicKey = generatedKeys.publicKey;
    vapidPrivateKey = generatedKeys.privateKey;
  } catch (e) {
    console.warn('Failed to generate dynamic VAPID keys:', e);
  }
}

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:contacto@enatapp.pt',
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (err) {
    console.warn('VAPID details setup warning:', err);
  }
}

// In-memory store for active push subscriptions
interface PushSubscriptionRecord {
  subscription: webpush.PushSubscription;
  userEmail?: string;
  subscribedAt: string;
  preferences?: {
    budgetAlerts: boolean;
    monthlySummary: boolean;
    invoiceAlerts: boolean;
  };
}
const activePushSubscriptions = new Map<string, PushSubscriptionRecord>();

// API Route: Get VAPID Public Key for client push registration
app.get('/api/push/vapid-public-key', (req: Request, res: Response) => {
  res.json({
    success: true,
    publicKey: vapidPublicKey,
    hasConfiguredKeys: Boolean(vapidPublicKey && vapidPrivateKey),
  });
});

// API Route: Register / Update Push Subscription
app.post('/api/push/subscribe', (req: Request, res: Response) => {
  try {
    const { subscription, userEmail, preferences } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Assinatura Push inválida ou endpoint ausente.' });
    }

    activePushSubscriptions.set(subscription.endpoint, {
      subscription,
      userEmail: userEmail || 'geral',
      subscribedAt: new Date().toISOString(),
      preferences: preferences || {
        budgetAlerts: true,
        monthlySummary: true,
        invoiceAlerts: true,
      },
    });

    console.log(`[Push API] Nova subscrição guardada. Total ativas: ${activePushSubscriptions.size}`);
    return res.json({
      success: true,
      message: 'Dispositivo subscrito com sucesso para notificações Push.',
      totalSubscribers: activePushSubscriptions.size,
    });
  } catch (err: any) {
    console.error('Erro ao registar subscrição push:', err);
    return res.status(500).json({ error: 'Erro interno ao guardar subscrição.' });
  }
});

// API Route: Dispatch Test Push Notification to the user
app.post('/api/push/send-test', async (req: Request, res: Response) => {
  try {
    const { subscription, title, body } = req.body;

    const payload = JSON.stringify({
      title: title || 'Enat app • Teste Nativo iOS',
      body: body || 'Notificações Push ativas! Receberá alertas críticos de desvio de obras e resumos mensais de custos.',
      icon: '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      url: '/',
      type: 'test',
    });

    // If client supplied specific subscription, send directly to it
    const targets: webpush.PushSubscription[] = [];
    if (subscription && subscription.endpoint) {
      targets.push(subscription);
    } else {
      for (const record of activePushSubscriptions.values()) {
        targets.push(record.subscription);
      }
    }

    if (targets.length === 0) {
      return res.json({
        success: true,
        delivered: 0,
        message: 'Nenhum dispositivo subscrito no momento. A notificação foi registada localmente no service worker.',
      });
    }

    let sentCount = 0;
    const errors: any[] = [];

    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          sentCount++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            activePushSubscriptions.delete(sub.endpoint);
          }
          errors.push(err.message);
        }
      })
    );

    return res.json({
      success: true,
      delivered: sentCount,
      totalTargets: targets.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Erro ao disparar notificação push de teste:', err);
    return res.status(500).json({ error: err.message || 'Erro ao enviar notificação.' });
  }
});

// API Route: Critical Budget Alert Push Notification
app.post('/api/push/send-budget-alert', async (req: Request, res: Response) => {
  try {
    const { obraName, percentGasto, budget, totalGasto, obraId } = req.body;

    const payload = JSON.stringify({
      title: `🚨 Alerta de Orçamento: ${obraName || 'Obra'}`,
      body: `Esta obra atingiu ${Number(percentGasto || 0).toFixed(1)}% do orçamento (${Number(totalGasto || 0).toFixed(2)} € de ${Number(budget || 0).toFixed(2)} €). Verifique os custos!`,
      icon: '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      url: obraId ? `/?obra=${obraId}` : '/',
      type: 'budget_alert',
      obraId: obraId,
    });

    let sentCount = 0;
    for (const [endpoint, record] of activePushSubscriptions.entries()) {
      if (record.preferences?.budgetAlerts !== false) {
        try {
          await webpush.sendNotification(record.subscription, payload);
          sentCount++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            activePushSubscriptions.delete(endpoint);
          }
        }
      }
    }

    return res.json({
      success: true,
      delivered: sentCount,
      message: `Alerta crítico enviado para ${sentCount} dispositivo(s).`,
    });
  } catch (err: any) {
    console.error('Erro ao enviar alerta crítico de orçamento:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API Route: Monthly Cost Summary Push Notification
app.post('/api/push/send-monthly-summary', async (req: Request, res: Response) => {
  try {
    const { monthName, totalGasto, totalObras, totalFaturas, topObraName } = req.body;

    const payload = JSON.stringify({
      title: `📊 Resumo Mensal de Custos (${monthName || 'Este Mês'})`,
      body: `Total registado: ${Number(totalGasto || 0).toFixed(2)} € em ${totalObras || 0} obra(s) e ${totalFaturas || 0} faturas.${topObraName ? ` Maior volume: ${topObraName}.` : ''} Toque para ver o balanço.`,
      icon: '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      url: '/?tab=dashboard',
      type: 'monthly_summary',
    });

    let sentCount = 0;
    for (const [endpoint, record] of activePushSubscriptions.entries()) {
      if (record.preferences?.monthlySummary !== false) {
        try {
          await webpush.sendNotification(record.subscription, payload);
          sentCount++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            activePushSubscriptions.delete(endpoint);
          }
        }
      }
    }

    return res.json({
      success: true,
      delivered: sentCount,
      message: `Resumo mensal enviado para ${sentCount} dispositivo(s).`,
    });
  } catch (err: any) {
    console.error('Erro ao enviar resumo mensal push:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PWA & Service Worker Endpoints (served with strict MIME types for Chrome & iOS PWA installability)
app.get('/sw.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.resolve(__dirname, 'public/sw.js'));
});

app.get(['/manifest.json', '/manifest.webmanifest'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.resolve(__dirname, 'public/manifest.json'));
});

// Serve public directory static files (PNG icons, screenshots, favicons)
app.use(express.static(path.resolve(__dirname, 'public')));

// Configure Vite or Static Serve
async function setupServer() {
  process.on('uncaughtException', (err) => {
    console.error('Process uncaughtException:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Process unhandledRejection:', reason);
  });

  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), {
      setHeaders: (res, filePath) => {
        const isNoCacheFile =
          filePath.endsWith('.html') ||
          filePath.endsWith('sw.js') ||
          filePath.endsWith('service-worker.js') ||
          filePath.endsWith('registerSW.js') ||
          filePath.includes('manifest');

        if (isNoCacheFile) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }));
    app.get('*', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is currently in use, retrying in 1s...`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen(port, '0.0.0.0');
      }, 1000);
    } else {
      console.error('HTTP server error:', err);
    }
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to setup server:', err);
});
