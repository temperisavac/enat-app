// server.ts
import http from "http";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import webpush from "web-push";
function classifyMaterialCategory(nameOrDesc, fallbackCategory) {
  if (!nameOrDesc || typeof nameOrDesc !== "string") {
    return fallbackCategory || "Outros";
  }
  const s = nameOrDesc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const equipamentosRegex = /\b(bomba\s*de?\s*calor|bomba\s*calor|inversor|microinversor|vmc|ar\s*condicionado|ar\s*cond\b|ar\s*condicionado\b|unidade\s*exterior|unidade\s*interior|unid\s*ext\b|unid\s*int\b|mural|mono\s*split|multisplit|multi-split|split\b|splits\b|conduta|ventiloconvector|ventiloconvectores|ventiloconvectora|cassete|termoacumulador|cilindro|deposito\s*(de\s*)?(aqs|agua|inercia)|deposito|painel\s*solar|paineis\s*solares|modulo\s*fotovoltaico|modulo\s*solar|aerotermia|recuperador\s*de?\s*calor|recuperador|caldeira|chiller|ventilador\s*centrifugo|extrator\s*de?\s*ar|desumidificador|grupo\s*termico|grupo\s*hidraulico|permutador|bateria\s*de\s*litio|baterias?\s*(solar|acumulacao)|mitsubishi|daikin|panasonic|haier|baxi|ariston|vaillant|daitsu|gree|midea|toshiba|hitachi|carrier|fujitsu|vulcano|junkers|atlantic|ecodan|altherma|aquarea|therma\s*v|msz|muz|mxz|mfz|ftx)\b/;
  if (equipamentosRegex.test(s)) {
    return "M\xE1quinas & Equipamentos";
  }
  const fixacaoRegex = /\b(bucha|buchas|abracadeira|abracadeiras|abrac|parafuso|parafusos|porca|porcas|anilha|anilhas|varao|varao\s*roscado|fita\s*cola|fita\s*isoladora|fita\s*aluminio|fita\s*adesiva|fita\s*teflon|teflon|cola\s*veda|cola-veda|silicone|massa\s*refrataria|espuma\s*pu|espuma\s*poliuretano|suporte\s*mural|suporte\s*chao|suporte\s*para|amortecedor|amortecedores|silentblock|silent\s*blocks|cantoneira|taco|tacos|rebite|rebites|grampo|grampos|gancho|ganchos|perfil\s*omega|calha\s*de\s*fixacao|bracadeira|bracadeiras)\b/;
  if (fixacaoRegex.test(s)) {
    return "Acess\xF3rios & Fixa\xE7\xE3o";
  }
  const canalizacaoRegex = /\b(tubo|tubos|tubagem|multicamada|pex|pvc|cobre|esgoto|ppr|pp-r|polietileno|pead|curva|joelho|te\b|uniao|casquilho|valvula|passador|torneira|coletor|caixa\s*coletora|sifao|ralo|filtro\s*de?\s*agua|purgador|redutora\s*de?\s*pressao|manometro|vaso\s*de?\s*expansao|vaso\s*expansao|coquilha|isolamento\s*termico|armacell|kaiflex|racord|flange|manga|bicha\s*flexivel|valvula\s*seguranca|valvula\s*retencao|fluxostato|pressostato)\b/;
  if (canalizacaoRegex.test(s)) {
    return "Canaliza\xE7\xE3o & Tubagens";
  }
  const eletricoRegex = /\b(cabo|cabos|fio|fios|disjuntor|disjuntores|diferencial|diferenciais|quadro\s*eletrico|interruptor|interruptores|tomada|tomadas|bornes?|barramento|tubo\s*corrugado|tubo\s*vd|corrugado|vd\s*20|vd\s*25|vd\s*16|anelado|contador\s*eletrico|rele|contactor|fusivel|ligador|ligadores|wago|ponteira|ponteiras|terminais|ficha\s*macho|ficha\s*femea|transformador|fita\s*led|foco\s*led|projetor|balastro|condensador\s*eletrico)\b/;
  if (eletricoRegex.test(s)) {
    return "Material El\xE9trico";
  }
  const ferramentasRegex = /\b(alicate|chave\s*de\s*fendas|chave\s*inglesa|berbequim|rebarbadora|bomba\s*de\s*vacuo|manifold|balanca|macarico|disco\s*de\s*corte|broca|brocas|escada|nivel\s*laser|manometro\s*digital)\b/;
  if (ferramentasRegex.test(s)) {
    return "Ferramentas & Equipamento";
  }
  const construcaoRegex = /\b(cimento|argamassa|gesso|pladur|tijolo|areia|cola\s*azulejo|reboco|tinta|primario|massa\s*de\s*juntas)\b/;
  if (construcaoRegex.test(s)) {
    return "Constru\xE7\xE3o Civil";
  }
  const combustivelRegex = /\b(gasoleo|gasolina|combustivel|via\s*verde|portagem|estacionamento)\b/;
  if (combustivelRegex.test(s)) {
    return "Combust\xEDvel & Transporte";
  }
  const refeicoesRegex = /\b(almoco|jantar|refeicao|cafe|pequeno\s*almoco|hotel|alojamento|dormida)\b/;
  if (refeicoesRegex.test(s)) {
    return "Refei\xE7\xF5es & Estadia";
  }
  if (fallbackCategory && fallbackCategory !== "Outros") {
    return fallbackCategory;
  }
  return "Outros";
}
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = Number(process.env.PORT) || 3e3;
var distExists = fs.existsSync(path.resolve(__dirname, "dist", "index.html"));
var isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENV !== "development" && distExists;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/gemini/analyze-invoice", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", images, detectedQr } = req.body;
    const rawImagesList = [];
    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img) => {
        if (typeof img === "string") {
          rawImagesList.push({ imageBase64: img, mimeType: "image/jpeg" });
        } else if (img && img.imageBase64) {
          rawImagesList.push({ imageBase64: img.imageBase64, mimeType: img.mimeType || "image/jpeg" });
        }
      });
    } else if (imageBase64) {
      rawImagesList.push({ imageBase64, mimeType });
    }
    if (rawImagesList.length === 0) {
      return res.status(400).json({ error: "Nenhum ficheiro, p\xE1gina ou imagem fornecido para leitura." });
    }
    const imageParts = [];
    for (const item of rawImagesList) {
      const commaIdx = item.imageBase64.indexOf(",");
      const cleanBase64 = commaIdx !== -1 ? item.imageBase64.substring(commaIdx + 1) : item.imageBase64;
      let detectedMime = item.mimeType || "image/jpeg";
      if (item.imageBase64.startsWith("data:")) {
        const mimeMatch = item.imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        if (mimeMatch) {
          detectedMime = mimeMatch[1].toLowerCase();
        }
      }
      const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
      if (!validMimes.includes(detectedMime)) {
        detectedMime = "image/jpeg";
      }
      imageParts.push({
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64
        }
      });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Chave GEMINI_API_KEY n\xE3o configurada no servidor. Por favor configure a chave para processamento com Gemini."
      });
    }
    let fiscalContext = "";
    if (detectedQr) {
      fiscalContext = `

[DADOS FISCAIS CERTIFICADOS PELO C\xD3DIGO QR DA AUTORIDADE TRIBUT\xC1RIA (AT)]:
- NIF Emitente (Fornecedor): ${detectedQr.taxId || ""} (${detectedQr.storeName || ""})
- N\xBA Documento: ${detectedQr.invoiceNumber || ""}
- Data Emiss\xE3o: ${detectedQr.date || ""}
- Total c/ IVA: ${detectedQr.totalWithTax || 0} \u20AC
- Total de IVA: ${detectedQr.taxAmount || 0} \u20AC
- Subtotal s/ IVA: ${detectedQr.subtotalWithoutTax || 0} \u20AC
ATEN\xC7\xC3O: O c\xF3digo QR da AT comprova de forma certificada o NIF do emitente e os totais finais.`;
    }
    const prompt = `\xC9s um extrator contabil\xEDstico especializado em faturas e tal\xF5es comerciais em Portugal (ex: TOCOnline, Moloni, PHC, Primavera, tal\xF5es t\xE9rmicos).
${fiscalContext}

Analisa a imagem e extrai os dados estritamente em formato JSON com base nas seguintes regras obrigat\xF3rias:

1. DISTIN\xC7\xC3O FISCAL (MUITO IMPORTANTE):
   - EMITENTE (Fornecedor/Comerciante): \xC9 quem vende e emite a fatura. Procura no cabe\xE7alho ou dados da empresa (ex: ERGES SOL, ENAT, Rexel, Sanitop, Pecomark, Worten, Leroy Merlin, etc.). O NIF do emitente \xE9 o que acompanha a morada da empresa e registo comercial (ex: 507718275).
   - CLIENTE (Adquirente): \xC9 quem compra (ex: Jo\xE3o Alberto...). O NIF do cliente \xE9 o que vem no campo 'Cliente' / 'Adquirente' (ex: 223714984).
   - NUNCA troques os dois NIFs. O emitente/fornecedor NUNCA pode ser o cliente comprador.

2. PREVEN\xC7\xC3O DE DUPLICADOS (VIAS DO DOCUMENTO):
   - O documento pode conter 'Original', 'Duplicado' e 'Triplicado'. Extrai os artigos da tabela APENAS UMA VEZ. Ignora as p\xE1ginas seguintes se forem c\xF3pias/vias repetidas da mesma fatura.

3. TABELA DE PRODUTOS E LINHAS:
   - Extrai cada artigo com:
     * referencia: c\xF3digo do artigo (ex: '10011', '9130'). Se n\xE3o existir, coloca "".
     * descricao: descri\xE7\xE3o completa do artigo (ex: 'L010MVDVFLEX9 COND CORRUG...', 'Grelha circular c/malha aluminio...').
     * quantidade: n\xFAmero decimal (ex: 200.0, 2.0).
     * unidade: unidade de medida se existir (ex: 'un', 'm', 'm2', 'kg', 'cx', 'rolo').
     * preco_unitario: pre\xE7o unit\xE1rio base (antes do desconto).
     * desconto_percentual: valor da coluna '% Desc' (ex: 45.0). Se n\xE3o existir, coloca 0.
     * taxa_iva: taxa de IVA indicada na linha (ex: 23).
     * total_linha_sem_iva: valor da coluna 'Valor sem iva' (ex: 749.10, 45.50).
     * total_linha_com_iva: valor da coluna com IVA (ex: total_linha_sem_iva * (1 + taxa_iva/100)).
   - Textos soltos como 'Referente \xE0 obra...' ou observa\xE7\xF5es de transporte/pagamento devem ser guardados no campo observacoes e NUNCA como linha de produto.

4. RESUMO FISCAL E TOTAIS:
   - Retira os valores da caixa de resumo do documento:
     * base_incidencia_23: soma da base tribut\xE1vel a 23% ou total il\xEDquido sem IVA (ex: 794.60).
     * total_iva: valor total do IVA (ex: 182.76).
     * descontos_linha: total de descontos comerciais concedidos (ex: 650.12).
     * total_documento: valor final pago com IVA (ex: 977.36).
     * acerto_arredondamento: acerto de c\xEAntimos ou arredondamento final.

5. NORMALIZA\xC7\xC3O:
   - Converte todas as v\xEDrgulas decimais para ponto (749,10 -> 749.10).
   - Datas sempre em formato YYYY-MM-DD (ex: '2026-10-14').`;
    const invoiceSchema = {
      type: Type.OBJECT,
      properties: {
        emitente: {
          type: Type.OBJECT,
          description: "Dados da entidade emitente / vendedor (fornecedor)",
          properties: {
            nome: { type: Type.STRING, description: "Nome comercial ou denomina\xE7\xE3o social do emitente" },
            nif: { type: Type.STRING, description: "NIF/NIPC do emitente (9 d\xEDgitos, ex: 507718275)" }
          },
          required: ["nome", "nif"]
        },
        cliente: {
          type: Type.OBJECT,
          description: "Dados do adquirente / comprador (cliente)",
          properties: {
            nome: { type: Type.STRING, description: "Nome do cliente/adquirente (ex: Jo\xE3o Alberto...)" },
            nif: { type: Type.STRING, description: "NIF do cliente adquirente (ex: 223714984)" }
          }
        },
        numero_documento: { type: Type.STRING, description: "N\xFAmero do documento e s\xE9rie (ex: FT 2026/1842)" },
        data_emissao: { type: Type.STRING, description: "Data de emiss\xE3o da fatura (YYYY-MM-DD)" },
        observacoes: { type: Type.STRING, description: 'Textos soltos como "Referente \xE0 obra...", notas ou condi\xE7\xF5es' },
        resumo_fiscal: {
          type: Type.OBJECT,
          description: "Totais fiscais e financeiros da fatura",
          properties: {
            base_incidencia_23: { type: Type.NUMBER, description: "Soma da base de incid\xEAncia tribut\xE1vel a 23% / total sem IVA" },
            total_iva: { type: Type.NUMBER, description: "Valor total do IVA faturado" },
            descontos_linha: { type: Type.NUMBER, description: "Total de descontos concedidos em euros" },
            total_documento: { type: Type.NUMBER, description: "Valor total final a pagar com IVA" },
            acerto_arredondamento: { type: Type.NUMBER, description: "Acerto de c\xEAntimos ou arredondamento" }
          },
          required: ["total_documento"]
        },
        itens: {
          type: Type.ARRAY,
          description: "Lista obrigat\xF3ria de cada linha de produto discriminado na tabela da fatura",
          items: {
            type: Type.OBJECT,
            properties: {
              referencia: { type: Type.STRING, description: "C\xF3digo ou refer\xEAncia do artigo" },
              descricao: { type: Type.STRING, description: "Descri\xE7\xE3o completa do artigo" },
              categoria: { type: Type.STRING, description: "Categoria do material" },
              quantidade: { type: Type.NUMBER, description: "Quantidade faturada (n\xFAmero decimal)" },
              unidade: { type: Type.STRING, description: "Unidade de medida (un, m, m2, kg, cx, etc.)" },
              preco_unitario: { type: Type.NUMBER, description: "Pre\xE7o unit\xE1rio base antes do desconto" },
              desconto_percentual: { type: Type.NUMBER, description: "Valor da coluna % Desc (0 se n\xE3o existir)" },
              taxa_iva: { type: Type.NUMBER, description: "Taxa de IVA indicada na linha (ex: 23)" },
              total_linha_sem_iva: { type: Type.NUMBER, description: "Valor da coluna sem IVA" },
              total_linha_com_iva: { type: Type.NUMBER, description: "Valor da linha com IVA" }
            },
            required: ["referencia", "descricao", "quantidade", "preco_unitario", "taxa_iva", "total_linha_sem_iva"]
          }
        }
      },
      required: ["emitente", "numero_documento", "data_emissao", "resumo_fiscal", "itens"]
    };
    const candidateModels = ["gemini-2.5-pro", "gemini-2.5-flash"];
    let lastError = null;
    let parsedData = null;
    let modelUsed = "";
    for (const model of candidateModels) {
      try {
        console.log(`[Gemini Multimodal] A enviar fatura (${imageParts.length} p\xE1gina(s)) para ${model} com temperature: 0.0...`);
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                ...imageParts,
                {
                  text: prompt
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: invoiceSchema,
            temperature: 0
          }
        });
        const textOutput = response.text || "";
        if (textOutput) {
          try {
            const cleanJson = textOutput.trim();
            const codeFenceMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            const toParse = codeFenceMatch ? codeFenceMatch[1].trim() : cleanJson;
            parsedData = JSON.parse(toParse);
          } catch {
            const firstBrace = textOutput.indexOf("{");
            const lastBrace = textOutput.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              parsedData = JSON.parse(textOutput.substring(firstBrace, lastBrace + 1));
            }
          }
          if (parsedData) {
            modelUsed = model;
            const itemsCount = parsedData.itens?.length || parsedData.items?.length || 0;
            console.log(`[Gemini Multimodal] Fatura analisada com sucesso pelo ${model}! Artigos extra\xEDdos: ${itemsCount}`);
            break;
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini Multimodal] Tentativa com ${model} falhou (${err?.message || err}). A tentar modelo alternativo...`);
      }
    }
    if (!parsedData) {
      const errorMsg = lastError?.message || "Falha ao processar o documento com o modelo Gemini.";
      console.error("[Gemini Multimodal] Todos os modelos falharam na extra\xE7\xE3o:", errorMsg);
      return res.status(500).json({
        success: false,
        error: errorMsg
      });
    }
    let storeName = parsedData.emitente?.nome || parsedData.storeName || "Loja / Fornecedor";
    let taxId = (parsedData.emitente?.nif || parsedData.taxId || "").replace(/^PT/i, "").replace(/[^0-9]/g, "").trim();
    if (detectedQr) {
      if (detectedQr.taxId && detectedQr.taxId.length === 9) {
        taxId = detectedQr.taxId;
      }
      if (detectedQr.storeName && (!storeName || storeName === "Loja / Fornecedor")) {
        storeName = detectedQr.storeName;
      }
    }
    const clientData = parsedData.cliente || null;
    const clientNif = (clientData?.nif || "").replace(/^PT/i, "").replace(/[^0-9]/g, "").trim();
    if (taxId && clientNif && taxId === clientNif) {
      if (detectedQr?.taxId && detectedQr.taxId !== clientNif) {
        taxId = detectedQr.taxId;
      }
    }
    let invoiceNumber = parsedData.numero_documento || parsedData.invoiceNumber || "";
    if (!invoiceNumber || invoiceNumber.startsWith("FT-")) {
      invoiceNumber = detectedQr?.invoiceNumber || `FT-${Date.now().toString().slice(-6)}`;
    }
    let date = parsedData.data_emissao || parsedData.date || "";
    if (!date) {
      date = detectedQr?.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    }
    const resumo = parsedData.resumo_fiscal || {};
    let totalWithTax = Number(resumo.total_documento ?? parsedData.totalWithTax ?? detectedQr?.totalWithTax ?? 0);
    let subtotalWithoutTax = Number(resumo.base_incidencia_23 ?? parsedData.subtotalWithoutTax ?? detectedQr?.subtotalWithoutTax ?? 0);
    let taxAmount = Number(resumo.total_iva ?? parsedData.taxAmount ?? detectedQr?.taxAmount ?? 0);
    const globalDiscountAmount = Number(resumo.descontos_linha ?? parsedData.globalDiscountAmount ?? 0);
    const roundAdjustmentAmount = Number(resumo.acerto_arredondamento ?? parsedData.roundAdjustmentAmount ?? 0);
    const notes = parsedData.observacoes || parsedData.notes || "";
    const rawItems = parsedData.itens || parsedData.items || [];
    const normalizedItems = rawItems.map((item) => {
      const qty = Number(item.quantidade ?? item.quantity) > 0 ? Number(item.quantidade ?? item.quantity) : 1;
      let taxRate = typeof item.taxa_iva === "number" ? item.taxa_iva : typeof item.taxRate === "number" ? item.taxRate : 23;
      if (taxRate < 0) taxRate = 23;
      let listPrice = Number(item.preco_unitario ?? item.listPriceWithoutTax) || 0;
      let discount = Number(item.desconto_percentual ?? item.discountPercent) || 0;
      let totalWithoutTax = Number(item.total_linha_sem_iva ?? item.totalWithoutTax) || 0;
      let unitPriceWithoutTax = Number(item.unitPriceWithoutTax) || 0;
      if (totalWithoutTax > 0) {
        unitPriceWithoutTax = Number((totalWithoutTax / qty).toFixed(2));
      } else if (listPrice > 0) {
        unitPriceWithoutTax = discount > 0 ? Number((listPrice * (1 - discount / 100)).toFixed(2)) : listPrice;
        totalWithoutTax = Number((qty * unitPriceWithoutTax).toFixed(2));
      }
      if (listPrice <= 0 && unitPriceWithoutTax > 0) {
        listPrice = unitPriceWithoutTax;
      }
      let totalWithTax2 = Number(item.total_linha_com_iva ?? item.totalWithTax) || 0;
      let unitPriceWithTax = Number(item.unitPriceWithTax) || 0;
      if (totalWithTax2 > 0) {
        unitPriceWithTax = Number((totalWithTax2 / qty).toFixed(2));
      } else if (unitPriceWithoutTax > 0) {
        unitPriceWithTax = Number((unitPriceWithoutTax * (1 + taxRate / 100)).toFixed(2));
        totalWithTax2 = Number((qty * unitPriceWithTax).toFixed(2));
      }
      const desc = item.descricao || item.name || "Produto";
      const ref = item.referencia || item.reference || "";
      const smartCategory = classifyMaterialCategory(desc, item.categoria || item.category);
      return {
        reference: ref,
        name: desc,
        category: smartCategory,
        quantity: qty,
        unit: item.unidade || item.unit || "un",
        listPriceWithoutTax: listPrice,
        discountPercent: discount,
        taxRate,
        unitPriceWithoutTax,
        unitPriceWithTax,
        totalWithoutTax,
        totalWithTax: totalWithTax2,
        // Preserved Portuguese fields
        referencia: ref,
        descricao: desc,
        quantidade: qty,
        preco_unitario: listPrice,
        desconto_percentual: discount,
        taxa_iva: taxRate,
        total_linha_sem_iva: totalWithoutTax,
        total_linha_com_iva: totalWithTax2
      };
    });
    if (totalWithTax <= 0 && normalizedItems.length > 0) {
      totalWithTax = Number(normalizedItems.reduce((s, i) => s + (Number(i.totalWithTax) || 0), 0).toFixed(2));
    }
    if (subtotalWithoutTax <= 0 && normalizedItems.length > 0) {
      subtotalWithoutTax = Number(normalizedItems.reduce((s, i) => s + (Number(i.totalWithoutTax) || 0), 0).toFixed(2));
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
        acerto_arredondamento: roundAdjustmentAmount
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
      confidenceScore: 0.98
    };
    return res.json({
      success: true,
      source: "gemini_multimodal",
      model: modelUsed,
      data: finalResult
    });
  } catch (error) {
    console.error("Erro ao processar fatura com Gemini:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Falha ao processar o documento. Verifique a imagem ou tente novamente."
    });
  }
});
app.post("/api/sync/test-webhook", async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string") {
      return res.status(400).json({ error: "URL do Google Sheets Webhook n\xE3o fornecido." });
    }
    const trimmedUrl = webhookUrl.trim();
    if (trimmedUrl.includes("docs.google.com/spreadsheets") && !trimmedUrl.includes("script.google.com")) {
      return res.status(400).json({
        error: 'Detetou-se o link direto da folha Google Sheets (docs.google.com). Para permitir que a folha receba dados automaticamente em tempo real sem login manual constante, use o URL do Webhook do Apps Script (terminado em /exec). Siga o guia passo-a-passo no separador "C\xF3digo do Google Apps Script" abaixo.',
        isSpreadsheetUrl: true
      });
    }
    const response = await fetch(trimmedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    const resultText = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(resultText);
    } catch {
    }
    if (resultText.includes("accounts.google.com") || resultText.includes("Sign in") || resultText.includes("ServiceLogin")) {
      return res.status(403).json({
        error: 'Aceder ao Apps Script requer in\xEDcio de sess\xE3o. Na implementa\xE7\xE3o do Google Apps Script, defina "Quem tem acesso: Qualquer pessoa" (Anyone) para permitir sincroniza\xE7\xE3o autom\xE1tica cont\xEDnua.'
      });
    }
    if (!response.ok) {
      return res.status(response.status).json({
        error: `O Google Sheets respondeu com erro (${response.status}): ${parsed?.message || resultText.slice(0, 160)}`
      });
    }
    return res.json({
      success: true,
      message: "Dados enviados com sucesso para a folha Google Sheets!",
      response: parsed || resultText
    });
  } catch (err) {
    return res.status(500).json({ error: `Erro na sincroniza\xE7\xE3o: ${err.message}` });
  }
});
app.post("/api/gemini/analyze-obra", async (req, res) => {
  try {
    const { obraName, clientName, budget, totalGasto, totalRecebido, saldoAReceber, breakdown } = req.body;
    const numBudget = Number(budget) || 0;
    const numGasto = Number(totalGasto) || 0;
    const numRecebido = Number(totalRecebido) || 0;
    const numSaldo = Number(saldoAReceber) || numBudget - numRecebido;
    const prompt = `\xC9s um Diretor Financeiro e Engenheiro Especialista em Obras de AVAC, Climatiza\xE7\xE3o, Eletricidade e Constru\xE7\xE3o em Portugal.
Analisa os dados financeiros e a distribui\xE7\xE3o de custos desta obra e produz uma avalia\xE7\xE3o t\xE9cnica e executiva rigorosa.

DADOS DA OBRA:
- Nome da Obra: ${obraName || "Obra"}
- Cliente: ${clientName || "Cliente"}
- Or\xE7amento Aprovado: ${numBudget.toFixed(2)} \u20AC
- Total Real Gasto at\xE9 agora: ${numGasto.toFixed(2)} \u20AC
- Total J\xE1 Recebido do Cliente: ${numRecebido.toFixed(2)} \u20AC
- Saldo Restante a Receber do Cliente: ${numSaldo.toFixed(2)} \u20AC

DECOMPOSI\xC7\xC3O DE CUSTOS REAIS GASTOS:
- Material de M\xE1quinas & Equipamentos: ${Number(breakdown?.maquinas?.amount || 0).toFixed(2)} \u20AC (${breakdown?.maquinas?.percentageOfTotal || 0}%)
- Acess\xF3rios & Fixa\xE7\xE3o: ${Number(breakdown?.acessorios?.amount || 0).toFixed(2)} \u20AC (${breakdown?.acessorios?.percentageOfTotal || 0}%)
- Liga\xE7\xF5es El\xE9tricas ou Componentes: ${Number(breakdown?.eletrico?.amount || 0).toFixed(2)} \u20AC (${breakdown?.eletrico?.percentageOfTotal || 0}%)
- Tubos de Refrigera\xE7\xE3o & G\xE1s: ${Number(breakdown?.refrigeracao?.amount || 0).toFixed(2)} \u20AC (${breakdown?.refrigeracao?.percentageOfTotal || 0}%)
- Tubos de \xC1gua / Canaliza\xE7\xE3o: ${Number(breakdown?.agua?.amount || 0).toFixed(2)} \u20AC (${breakdown?.agua?.percentageOfTotal || 0}%)
- M\xE3o de Obra: ${Number(breakdown?.maodeobra?.amount || 0).toFixed(2)} \u20AC (${breakdown?.maodeobra?.percentageOfTotal || 0}%)
- Despesas Diretas sem Fatura: ${Number(breakdown?.despesasManuais?.amount || 0).toFixed(2)} \u20AC (${breakdown?.despesasManuais?.percentageOfTotal || 0}%)

INSTRU\xC7\xD5ES:
Devolve EXCLUSIVAMENTE um objeto JSON v\xE1lido com:
{
  "status": "excelente" | "adequada" | "alerta" | "prejuizo",
  "headline": "Frase curta de diagn\xF3stico (ex: Margem s\xF3lida com 65% cobrado ao cliente)",
  "summary": "Resumo anal\xEDtico de 2 a 3 frases com tom profissional portugu\xEAs europeu, destacando se o cashflow atual cobre os gastos e se a propor\xE7\xE3o de m\xE1quinas vs consum\xEDveis/m\xE3o de obra est\xE1 equilibrada.",
  "keyObservations": [
    "Ponto-chave 1 sobre custos de m\xE1quinas ou tubagens",
    "Ponto-chave 2 sobre recebimentos do cliente e saldo pendente",
    "Ponto-chave 3 sobre m\xE3o de obra ou consum\xEDveis"
  ],
  "recommendations": [
    "Recomenda\xE7\xE3o pr\xE1tica 1 (ex: solicitar pr\xF3xima tranche ao cliente)",
    "Recomenda\xE7\xE3o pr\xE1tica 2 (ex: controlo de consum\xEDveis ou horas)"
  ]
}`;
    let parsedResult = null;
    if (process.env.GEMINI_API_KEY) {
      const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          });
          const textOutput = response.text || "";
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
          console.warn(`An\xE1lise com modelo ${model} falhou:`, mErr);
        }
      }
    }
    if (!parsedResult || !parsedResult.headline) {
      const budgetConsumedPct = numBudget > 0 ? numGasto / numBudget * 100 : 0;
      const billedPct = numBudget > 0 ? numRecebido / numBudget * 100 : 0;
      const netCashflow = numRecebido - numGasto;
      let calcStatus = "adequada";
      let headline = "";
      if (numBudget > 0 && numGasto > numBudget) {
        calcStatus = "prejuizo";
        headline = `Custos ultrapassaram o or\xE7amento em ${(numGasto - numBudget).toFixed(2)} \u20AC`;
      } else if (budgetConsumedPct > 85) {
        calcStatus = "alerta";
        headline = `Consumo cr\xEDtico do or\xE7amento (${budgetConsumedPct.toFixed(1)}% gasto)`;
      } else if (netCashflow >= 0 && budgetConsumedPct <= 65) {
        calcStatus = "excelente";
        headline = `Margem protegida e cashflow positivo (+${netCashflow.toFixed(2)} \u20AC)`;
      } else {
        calcStatus = "adequada";
        headline = `Obra em progresso controlado com ${budgetConsumedPct.toFixed(1)}% do or\xE7amento gasto`;
      }
      parsedResult = {
        status: calcStatus,
        headline,
        summary: `A obra "${obraName}" apresenta um custo acumulado de ${numGasto.toFixed(2)} \u20AC contra um or\xE7amento de ${numBudget.toFixed(2)} \u20AC. O valor recebido at\xE9 agora \xE9 de ${numRecebido.toFixed(2)} \u20AC (${billedPct.toFixed(1)}% faturado), deixando um saldo pendente de ${numSaldo.toFixed(2)} \u20AC a cobrar ao cliente.`,
        keyObservations: [
          `Custos em equipamentos e materiais representam ${Number(breakdown?.maquinas?.percentageOfTotal || 0)}% dos gastos totais.`,
          `M\xE3o de obra e subempreitadas totalizam ${Number(breakdown?.maodeobra?.amount || 0).toFixed(2)} \u20AC (${Number(breakdown?.maodeobra?.percentageOfTotal || 0)}% do gasto).`,
          netCashflow < 0 ? `Cashflow temporariamente adiantado pela empresa no montante de ${Math.abs(netCashflow).toFixed(2)} \u20AC face aos pagamentos do cliente.` : `Cashflow favor\xE1vel com pagamentos do cliente a cobrir antecipadamente as despesas efetuadas.`
        ],
        recommendations: [
          numSaldo > 0 ? `Emitir auto de medi\xE7\xE3o e solicitar a cobran\xE7a da tranche pendente (${numSaldo.toFixed(2)} \u20AC).` : "Fatura\xE7\xE3o ao cliente integralmente regularizada.",
          "Manter registo cont\xEDnuo das faturas de materiais e horas de t\xE9cnicos para assegurar o apuramento final de margem real."
        ]
      };
    }
    return res.json({ success: true, analysis: parsedResult });
  } catch (error) {
    console.error("Erro ao analisar obra com Gemini:", error);
    return res.status(500).json({ error: error.message || "Falha ao gerar an\xE1lise de IA da obra." });
  }
});
var vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
var vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
if (!vapidPublicKey || !vapidPrivateKey) {
  try {
    const generatedKeys = webpush.generateVAPIDKeys();
    vapidPublicKey = generatedKeys.publicKey;
    vapidPrivateKey = generatedKeys.privateKey;
  } catch (e) {
    console.warn("Failed to generate dynamic VAPID keys:", e);
  }
}
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      "mailto:contacto@enatapp.pt",
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (err) {
    console.warn("VAPID details setup warning:", err);
  }
}
var activePushSubscriptions = /* @__PURE__ */ new Map();
app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({
    success: true,
    publicKey: vapidPublicKey,
    hasConfiguredKeys: Boolean(vapidPublicKey && vapidPrivateKey)
  });
});
app.post("/api/push/subscribe", (req, res) => {
  try {
    const { subscription, userEmail, preferences } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Assinatura Push inv\xE1lida ou endpoint ausente." });
    }
    activePushSubscriptions.set(subscription.endpoint, {
      subscription,
      userEmail: userEmail || "geral",
      subscribedAt: (/* @__PURE__ */ new Date()).toISOString(),
      preferences: preferences || {
        budgetAlerts: true,
        monthlySummary: true,
        invoiceAlerts: true
      }
    });
    console.log(`[Push API] Nova subscri\xE7\xE3o guardada. Total ativas: ${activePushSubscriptions.size}`);
    return res.json({
      success: true,
      message: "Dispositivo subscrito com sucesso para notifica\xE7\xF5es Push.",
      totalSubscribers: activePushSubscriptions.size
    });
  } catch (err) {
    console.error("Erro ao registar subscri\xE7\xE3o push:", err);
    return res.status(500).json({ error: "Erro interno ao guardar subscri\xE7\xE3o." });
  }
});
app.post("/api/push/send-test", async (req, res) => {
  try {
    const { subscription, title, body } = req.body;
    const payload = JSON.stringify({
      title: title || "Enat app \u2022 Teste Nativo iOS",
      body: body || "Notifica\xE7\xF5es Push ativas! Receber\xE1 alertas cr\xEDticos de desvio de obras e resumos mensais de custos.",
      icon: "/pwa-192x192.png",
      badge: "/favicon-32x32.png",
      url: "/",
      type: "test"
    });
    const targets = [];
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
        message: "Nenhum dispositivo subscrito no momento. A notifica\xE7\xE3o foi registada localmente no service worker."
      });
    }
    let sentCount = 0;
    const errors = [];
    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          sentCount++;
        } catch (err) {
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
      errors: errors.length > 0 ? errors : void 0
    });
  } catch (err) {
    console.error("Erro ao disparar notifica\xE7\xE3o push de teste:", err);
    return res.status(500).json({ error: err.message || "Erro ao enviar notifica\xE7\xE3o." });
  }
});
app.post("/api/push/send-budget-alert", async (req, res) => {
  try {
    const { obraName, percentGasto, budget, totalGasto, obraId } = req.body;
    const payload = JSON.stringify({
      title: `\u{1F6A8} Alerta de Or\xE7amento: ${obraName || "Obra"}`,
      body: `Esta obra atingiu ${Number(percentGasto || 0).toFixed(1)}% do or\xE7amento (${Number(totalGasto || 0).toFixed(2)} \u20AC de ${Number(budget || 0).toFixed(2)} \u20AC). Verifique os custos!`,
      icon: "/pwa-192x192.png",
      badge: "/favicon-32x32.png",
      url: obraId ? `/?obra=${obraId}` : "/",
      type: "budget_alert",
      obraId
    });
    let sentCount = 0;
    for (const [endpoint, record] of activePushSubscriptions.entries()) {
      if (record.preferences?.budgetAlerts !== false) {
        try {
          await webpush.sendNotification(record.subscription, payload);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            activePushSubscriptions.delete(endpoint);
          }
        }
      }
    }
    return res.json({
      success: true,
      delivered: sentCount,
      message: `Alerta cr\xEDtico enviado para ${sentCount} dispositivo(s).`
    });
  } catch (err) {
    console.error("Erro ao enviar alerta cr\xEDtico de or\xE7amento:", err);
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/push/send-monthly-summary", async (req, res) => {
  try {
    const { monthName, totalGasto, totalObras, totalFaturas, topObraName } = req.body;
    const payload = JSON.stringify({
      title: `\u{1F4CA} Resumo Mensal de Custos (${monthName || "Este M\xEAs"})`,
      body: `Total registado: ${Number(totalGasto || 0).toFixed(2)} \u20AC em ${totalObras || 0} obra(s) e ${totalFaturas || 0} faturas.${topObraName ? ` Maior volume: ${topObraName}.` : ""} Toque para ver o balan\xE7o.`,
      icon: "/pwa-192x192.png",
      badge: "/favicon-32x32.png",
      url: "/?tab=dashboard",
      type: "monthly_summary"
    });
    let sentCount = 0;
    for (const [endpoint, record] of activePushSubscriptions.entries()) {
      if (record.preferences?.monthlySummary !== false) {
        try {
          await webpush.sendNotification(record.subscription, payload);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            activePushSubscriptions.delete(endpoint);
          }
        }
      }
    }
    return res.json({
      success: true,
      delivered: sentCount,
      message: `Resumo mensal enviado para ${sentCount} dispositivo(s).`
    });
  } catch (err) {
    console.error("Erro ao enviar resumo mensal push:", err);
    return res.status(500).json({ error: err.message });
  }
});
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.resolve(__dirname, "public/sw.js"));
});
app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.resolve(__dirname, "public/manifest.json"));
});
app.use(express.static(path.resolve(__dirname, "public")));
async function setupServer() {
  process.on("uncaughtException", (err) => {
    console.error("Process uncaughtException:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Process unhandledRejection:", reason);
  });
  const httpServer = http.createServer(app);
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist"), {
      setHeaders: (res, filePath) => {
        const isNoCacheFile = filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith("service-worker.js") || filePath.endsWith("registerSW.js") || filePath.includes("manifest");
        if (isNoCacheFile) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  httpServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`Port ${port} is currently in use, retrying in 1s...`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen(port, "0.0.0.0");
      }, 1e3);
    } else {
      console.error("HTTP server error:", err);
    }
  });
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}
setupServer().catch((err) => {
  console.error("Failed to setup server:", err);
});
