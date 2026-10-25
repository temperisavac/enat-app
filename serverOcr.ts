import sharp from 'sharp';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import { PDFParse } from 'pdf-parse';
import { classifyMaterialCategory } from './src/utils/categoryClassifier.js';

export interface ExtractedInvoiceResult {
  storeName: string;
  invoiceNumber: string;
  date: string;
  taxId: string;
  subtotalWithoutTax: number;
  taxAmount: number;
  totalWithTax: number;
  roundAdjustmentAmount?: number;
  globalDiscountAmount?: number;
  confidenceScore: number;
  notes?: string;
  items: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    listPriceWithoutTax: number;
    discountPercent: number;
    taxRate: number;
    unitPriceWithoutTax: number;
    unitPriceWithTax: number;
    totalWithoutTax: number;
    totalWithTax: number;
  }>;
}

// Known Portuguese suppliers by NIF / NIPC
export const KNOWN_NIFS: Record<string, string> = {
  '500742118': 'Ernes - Equipamentos de Climatização e Refrigeração',
  '500170068': 'Rexel Portugal',
  '501280387': 'Sanitop',
  '502931448': 'Pecomark Portugal',
  '502123546': 'Worten',
  '501524310': 'Leroy Merlin',
  '500147635': 'Würth Portugal',
  '503254920': 'Hilti Portugal',
  '501438968': 'Sonepar Portugal',
  '501725675': 'Electro Siluz',
  '500051042': 'Galp Energia',
  '500273762': 'Repsol',
  '502447937': 'Cepsa',
  '500164289': 'EDP Comercial',
  '503023243': 'Baxi Portugal',
  '500192894': 'Vulcano / Bosch Termotecnologia',
  '507439160': 'Daikin Airconditioning Portugal',
  '501314982': 'Mitsubishi Electric Europe',
  '506637375': 'Brico Depôt Portugal',
  '503004516': 'Maxmat',
  '500858167': 'Sanitana',
  '500192770': 'Cifial',
  '504100609': 'Giacomini Portugal',
  '505929283': 'Tece Portugal',
  '501869898': 'Roth Portugal',
  '502016251': 'Uponor Portugal',
};

// Singleton Tesseract worker for ultra-fast OCR without recreation overhead
let cachedWorker: any = null;
let isInitializingWorker = false;

export async function getTesseractWorker() {
  if (cachedWorker) return cachedWorker;
  if (isInitializingWorker) {
    while (isInitializingWorker) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (cachedWorker) return cachedWorker;
  }

  isInitializingWorker = true;
  try {
    cachedWorker = await createWorker(['eng']);
    return cachedWorker;
  } catch (err) {
    console.warn('Erro ao inicializar Tesseract worker:', err);
    return null;
  } finally {
    isInitializingWorker = false;
  }
}

/**
 * Parses a Portuguese AT QR Code string (standard AT format)
 * Example: A:500742118*B:999999990*C:PT*D:FT*E:N*F:20260210*G:FT 2026/1842*H:0*I1:PT*I7:3250.00*I8:747.50*N:747.50*O:3997.50*...
 */
export function parsePortugueseAtQr(qrText: string): Partial<ExtractedInvoiceResult> | null {
  if (!qrText || (!qrText.includes('*A:') && !qrText.startsWith('A:'))) {
    return null;
  }

  const parts = qrText.split('*');
  const fields: Record<string, string> = {};

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const key = part.substring(0, colonIdx).trim();
      const val = part.substring(colonIdx + 1).trim();
      fields[key] = val;
    }
  }

  const taxId = (fields['A'] || '').replace(/^PT/i, '').trim();
  const storeName = KNOWN_NIFS[taxId] || (taxId ? `Fornecedor NIF ${taxId}` : 'Loja / Fornecedor');

  let date = '';
  if (fields['F'] && fields['F'].length === 8) {
    const y = fields['F'].substring(0, 4);
    const m = fields['F'].substring(4, 6);
    const d = fields['F'].substring(6, 8);
    date = `${y}-${m}-${d}`;
  }

  const invoiceNumber = fields['G'] || (fields['D'] ? `${fields['D']} ${Date.now().toString().slice(-6)}` : '');

  // Base tributável (I7 or I2)
  const baseTributavel = parseFloat(fields['I7'] || fields['I2'] || '0') || 0;

  // Total IVA (N or I8 or I3)
  const totalIva = parseFloat(fields['N'] || fields['I8'] || fields['I3'] || '0') || 0;

  // Total da fatura (O)
  let totalWithTax = parseFloat(fields['O'] || '0') || 0;
  let subtotalWithoutTax =
    baseTributavel > 0
      ? baseTributavel
      : totalWithTax > 0
      ? Number((totalWithTax - totalIva).toFixed(2))
      : 0;

  if (totalWithTax <= 0 && subtotalWithoutTax > 0) {
    totalWithTax = Number((subtotalWithoutTax + totalIva).toFixed(2));
  }

  if (totalWithTax <= 0) return null;

  return {
    storeName,
    taxId,
    invoiceNumber: invoiceNumber.trim(),
    date: date || new Date().toISOString().split('T')[0],
    subtotalWithoutTax: Number(subtotalWithoutTax.toFixed(2)),
    taxAmount: totalIva > 0 ? Number(totalIva.toFixed(2)) : Number(Math.max(0, totalWithTax - subtotalWithoutTax).toFixed(2)),
    totalWithTax: Number(totalWithTax.toFixed(2)),
  };
}

/**
 * Decodes QR code from image buffer with multi-zone scans & binarization
 */
export async function tryDecodeQrCode(buffer: Buffer): Promise<Partial<ExtractedInvoiceResult> | null> {
  if (buffer.slice(0, 5).toString() === '%PDF-') {
    return null;
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 1600;

    // Helper to scan a raw buffer with jsQR
    const scanRaw = async (sharpInstance: any) => {
      try {
        const { data, info } = await sharpInstance
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        if (code && code.data) {
          const parsed = parsePortugueseAtQr(code.data);
          if (parsed) return parsed;
        }
      } catch {}
      return null;
    };

    // Pass 1: standard resize (1600px)
    const targetWidth = Math.min(1600, width);
    const targetHeight = Math.round((targetWidth * height) / width);
    const pass1 = await scanRaw(image.clone().resize(targetWidth, targetHeight, { fit: 'inside' }));
    if (pass1) return pass1;

    // Pass 2: High contrast binarization
    const pass2 = await scanRaw(
      image.clone().resize(targetWidth, targetHeight, { fit: 'inside' }).grayscale().normalize().threshold(128)
    );
    if (pass2) return pass2;

    // Pass 3: Crop bottom 50% (where 95% of Portuguese AT QR codes are printed)
    if (height > 300) {
      const bottomHalf = image.clone().extract({
        left: 0,
        top: Math.round(height * 0.5),
        width: width,
        height: Math.round(height * 0.5),
      });
      const pass3 = await scanRaw(bottomHalf.resize(1200, null, { withoutEnlargement: true }));
      if (pass3) return pass3;

      const pass3B = await scanRaw(
        bottomHalf.resize(1200, null, { withoutEnlargement: true }).grayscale().threshold(130)
      );
      if (pass3B) return pass3B;
    }

    // Pass 4: Crop top 40% (for faturas with QR at the header)
    if (height > 300) {
      const topHalf = image.clone().extract({
        left: 0,
        top: 0,
        width: width,
        height: Math.round(height * 0.4),
      });
      const pass4 = await scanRaw(topHalf.resize(1200, null, { withoutEnlargement: true }));
      if (pass4) return pass4;
    }

    // Pass 5: Rotate 90 degrees if photo was taken in landscape
    const rotated = image.clone().rotate(90).resize(1400, null, { withoutEnlargement: true });
    const pass5 = await scanRaw(rotated);
    if (pass5) return pass5;
  } catch (err) {
    console.warn('QR code scan attempt error:', err);
  }
  return null;
}

/**
 * Performs fast, reliable Tesseract OCR on image buffer
 */
export async function performTesseractOcr(buffer: Buffer, timeoutMs = 25000): Promise<string> {
  if (buffer.slice(0, 5).toString() === '%PDF-') {
    return '';
  }

  return new Promise(async (resolve) => {
    let timer: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<string>((res) => {
      timer = setTimeout(() => {
        console.warn(`Tesseract OCR excedeu limite de ${timeoutMs}ms.`);
        res('');
      }, timeoutMs);
    });

    const executionPromise = (async () => {
      try {
        const worker = await getTesseractWorker();
        if (!worker) return '';

        const preprocessed = await sharp(buffer)
          .resize(1600, null, { withoutEnlargement: true })
          .grayscale()
          .normalize()
          .sharpen()
          .toBuffer();

        const { data } = await worker.recognize(preprocessed);
        return data?.text || '';
      } catch (e) {
        console.warn('Tesseract OCR execution error:', e);
        return '';
      }
    })();

    const result = await Promise.race([executionPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);
    resolve(result);
  });
}

/**
 * Parses raw text extracted from an invoice into structured fields and lines
 */
export function parseInvoiceTextToData(
  text: string,
  qrFallback?: Partial<ExtractedInvoiceResult> | null
): ExtractedInvoiceResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let storeName = qrFallback?.storeName || '';
  let invoiceNumber = qrFallback?.invoiceNumber || '';
  let date = qrFallback?.date || '';
  let taxId = qrFallback?.taxId || '';
  let totalWithTax = qrFallback?.totalWithTax || 0;
  let subtotalWithoutTax = qrFallback?.subtotalWithoutTax || 0;
  let taxAmount = qrFallback?.taxAmount || 0;

  // 1. Supplier Detection from text
  if (!storeName || storeName.startsWith('Fornecedor NIF') || storeName === 'Loja / Fornecedor') {
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i];
      const upper = line.toUpperCase();

      for (const [nif, name] of Object.entries(KNOWN_NIFS)) {
        const keyword = name.split('-')[0].trim().toUpperCase();
        if (upper.includes(keyword)) {
          storeName = name;
          if (!taxId) taxId = nif;
          break;
        }
      }
      if (storeName && !storeName.startsWith('Fornecedor NIF')) break;

      if (
        (upper.includes(' LDA') ||
          upper.includes(' S.A.') ||
          upper.includes('UNIPESSOAL') ||
          upper.includes('MATERIAIS') ||
          upper.includes('CLIMATIZAÇÃO') ||
          upper.includes('EQUIPAMENTOS') ||
          upper.includes('REFRIGERAÇÃO') ||
          upper.includes('TUBAGENS') ||
          upper.includes('ELÉTRICO') ||
          upper.includes('ELETRICO') ||
          upper.includes('COMERCIAL') ||
          upper.includes('ENERGIA')) &&
        line.length > 4 &&
        line.length < 65
      ) {
        storeName = line.replace(/^[0-9\s.,-]+/, '').trim();
        break;
      }
    }
  }

  // 2. NIF / Tax ID
  if (!taxId) {
    for (const line of lines) {
      const nifMatch = line.match(/(?:NIF|NIPC|CONTRIBUINTE)[:\s]*([1-9]\d{8})\b/i) || line.match(/\b([125689]\d{8})\b/);
      if (nifMatch && nifMatch[1]) {
        taxId = nifMatch[1];
        if (KNOWN_NIFS[taxId] && (!storeName || storeName === 'Loja / Fornecedor' || storeName.startsWith('Fornecedor NIF'))) {
          storeName = KNOWN_NIFS[taxId];
        }
        break;
      }
    }
  }

  if (!storeName || storeName === 'Loja / Fornecedor') {
    if (lines[0] && lines[0].length < 45 && !lines[0].match(/fatura|recibo/i)) {
      storeName = lines[0];
    } else if (taxId && KNOWN_NIFS[taxId]) {
      storeName = KNOWN_NIFS[taxId];
    } else {
      storeName = taxId ? `Fornecedor NIF ${taxId}` : 'Loja / Fornecedor';
    }
  }

  // 3. Invoice Number
  if (!invoiceNumber || invoiceNumber.startsWith('FT-')) {
    for (const line of lines) {
      const match = line.match(/\b(?:FATURA(?:\s+SIMPLIFICADA)?|FACTURA|FT|FS|FR|DOC|VENDA|VD)\b[:\s./№#]*([A-Z0-9/_-]+(?:\s*[0-9/_-]+)?)/i);
      if (match && match[1] && match[1].length >= 3) {
        const candidate = match[1].trim();
        const candUpper = candidate.toUpperCase();
        if (
          !candUpper.includes('DATA') &&
          !candUpper.includes('NIF') &&
          !candUpper.includes('CLIENTE') &&
          !candUpper.includes('PAG') &&
          !candUpper.includes('VENCIMENTO')
        ) {
          invoiceNumber = candidate;
          break;
        }
      }
    }
    if (!invoiceNumber) {
      invoiceNumber = `FT-${Date.now().toString().slice(-6)}`;
    }
  }

  // 4. Date Detection
  if (!date) {
    for (const line of lines) {
      const dMatch =
        line.match(/\b(202[0-9])[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12][0-9]|3[01])\b/) ||
        line.match(/\b(0[1-9]|[12][0-9]|3[01])[-/.](0[1-9]|1[0-2])[-/.](202[0-9])\b/);
      if (dMatch) {
        if (dMatch[1].length === 4) {
          date = `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
        } else {
          date = `${dMatch[3]}-${dMatch[2]}-${dMatch[1]}`;
        }
        break;
      }
    }
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }
  }

  // 5. Total with Tax
  if (totalWithTax <= 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const upper = line.toUpperCase();
      if (
        upper.includes('TOTAL') ||
        upper.includes('A PAGAR') ||
        upper.includes('VALOR A PAGAR') ||
        upper.includes('TOTAL COM IVA') ||
        upper.includes('TOTAL DOCUMENTO')
      ) {
        const numbers = line.match(/[0-9]+[.,][0-9]{2}\b/g);
        if (numbers && numbers.length > 0) {
          const val = parseFloat(numbers[numbers.length - 1].replace(',', '.'));
          if (val > totalWithTax) {
            totalWithTax = val;
          }
        }
      }
    }
  }

  // 6. Subtotal & Tax Amount
  if (subtotalWithoutTax <= 0 && totalWithTax > 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const upper = line.toUpperCase();
      if (
        upper.includes('INCIDÊNCIA') ||
        upper.includes('INCIDENCIA') ||
        upper.includes('BASE') ||
        upper.includes('SUBTOTAL') ||
        upper.includes('TOTAL ILÍQUIDO') ||
        upper.includes('TOTAL LIQUIDO')
      ) {
        const numbers = line.match(/[0-9]+[.,][0-9]{2}\b/g);
        if (numbers && numbers.length > 0) {
          const val = parseFloat(numbers[numbers.length - 1].replace(',', '.'));
          if (val < totalWithTax && val > 0) {
            subtotalWithoutTax = val;
            break;
          }
        }
      }
    }
    if (subtotalWithoutTax <= 0) {
      subtotalWithoutTax = Number((totalWithTax / 1.23).toFixed(2));
    }
  }

  if (taxAmount <= 0 && totalWithTax > subtotalWithoutTax) {
    taxAmount = Number((totalWithTax - subtotalWithoutTax).toFixed(2));
  }

  // 7. Parse line items from lines
  const items: Array<any> = [];

  for (const line of lines) {
    const moneyMatches = line.match(/[0-9]+[.,][0-9]{2}\b/g);
    if (moneyMatches && moneyMatches.length >= 1 && line.length > 8) {
      const upper = line.toUpperCase();
      if (
        upper.includes('TOTAL') ||
        upper.includes('SUBTOTAL') ||
        upper.includes('IVA') ||
        upper.includes('INCIDENCIA') ||
        upper.includes('INCIDÊNCIA') ||
        upper.includes('NIF') ||
        upper.includes('IBAN') ||
        upper.includes('CAPITAL') ||
        upper.includes('CONSERVATÓRIA') ||
        upper.includes('REGISTO') ||
        upper.includes('OBRIGADO')
      ) {
        continue;
      }

      // If line has multiple money amounts (e.g. unit price and total)
      const num1 = parseFloat(moneyMatches[0].replace(',', '.'));
      const num2 = moneyMatches.length >= 2 ? parseFloat(moneyMatches[moneyMatches.length - 1].replace(',', '.')) : 0;

      let qty = 1;
      let unit = 'un';
      const qtyMatch = line.match(/\b([0-9]{1,4}(?:[.,][0-9]+)?)\s*(un|cx|rolo|conjunto|pcs|lt|m2|kg|m)\b/i);
      if (qtyMatch) {
        qty = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
        unit = qtyMatch[2].toLowerCase();
      }

      let unitPriceWithoutTax = 0;
      let unitPriceWithTax = 0;
      let lineTotalWithTax = 0;
      let lineTotalWithoutTax = 0;

      if (num2 > 0) {
        if (num2 >= num1 * 1.15) {
          unitPriceWithoutTax = Number((num1 / qty).toFixed(2));
          lineTotalWithTax = num2;
          unitPriceWithTax = Number((lineTotalWithTax / qty).toFixed(2));
          lineTotalWithoutTax = Number((unitPriceWithoutTax * qty).toFixed(2));
        } else {
          unitPriceWithoutTax = Number((num1 / qty).toFixed(2));
          unitPriceWithTax = Number((unitPriceWithoutTax * 1.23).toFixed(2));
          lineTotalWithoutTax = num2 > 0 ? num2 : Number((unitPriceWithoutTax * qty).toFixed(2));
          lineTotalWithTax = Number((lineTotalWithoutTax * 1.23).toFixed(2));
        }
      } else {
        lineTotalWithTax = num1;
        unitPriceWithTax = Number((lineTotalWithTax / qty).toFixed(2));
        unitPriceWithoutTax = Number((unitPriceWithTax / 1.23).toFixed(2));
        lineTotalWithoutTax = Number((unitPriceWithoutTax * qty).toFixed(2));
      }

      const name = line
        .replace(/[0-9]+[.,][0-9]{2}/g, '')
        .replace(/\b(23|13|6|0)%\b/g, '')
        .replace(/\b([0-9]{1,4}(?:[.,][0-9]+)?)\s*(un|cx|rolo|conjunto|pcs|lt|m2|kg)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (name.length >= 3 && lineTotalWithTax > 0 && lineTotalWithTax <= (totalWithTax || 999999)) {
        const smartCat = classifyMaterialCategory(name);

        items.push({
          name,
          category: smartCat,
          quantity: qty,
          unit: unit || 'un',
          listPriceWithoutTax: unitPriceWithoutTax,
          discountPercent: 0,
          taxRate: 23,
          unitPriceWithoutTax,
          unitPriceWithTax,
          totalWithoutTax: lineTotalWithoutTax,
          totalWithTax: lineTotalWithTax,
        });
      }
    }
  }

  // If no individual line items were found but we have the total:
  if (items.length === 0) {
    const sNameLower = storeName.toLowerCase();
    let defaultName = 'Materiais de Obra';
    let defaultCat = 'Outros';

    if (sNameLower.includes('ernes') || sNameLower.includes('daikin') || sNameLower.includes('mitsubishi')) {
      defaultName = 'Equipamento de Climatização / Bomba de Calor';
      defaultCat = 'Máquinas & Equipamentos';
    } else if (sNameLower.includes('sanitop') || sNameLower.includes('tubo') || sNameLower.includes('canaliza')) {
      defaultName = 'Material de Canalização e Tubagens';
      defaultCat = 'Canalização & Tubagens';
    } else if (sNameLower.includes('rexel') || sNameLower.includes('electro siluz') || sNameLower.includes('sonepar')) {
      defaultName = 'Material Elétrico e Cablagem';
      defaultCat = 'Material Elétrico';
    } else if (sNameLower.includes('würth') || sNameLower.includes('wurth') || sNameLower.includes('hilti')) {
      defaultName = 'Acessórios de Fixação e Consumíveis';
      defaultCat = 'Acessórios & Fixação';
    } else if (sNameLower.includes('pecomark')) {
      defaultName = 'Tubagem Frigorífica e Acessórios AVAC';
      defaultCat = 'Tubos de Refrigeração & Gás';
    } else {
      defaultName = `Materiais / Compras (${storeName})`;
      defaultCat = classifyMaterialCategory(storeName);
    }

    items.push({
      name: defaultName,
      category: defaultCat,
      quantity: 1,
      unit: 'un',
      listPriceWithoutTax: subtotalWithoutTax,
      discountPercent: 0,
      taxRate: 23,
      unitPriceWithoutTax: subtotalWithoutTax,
      unitPriceWithTax: totalWithTax,
      totalWithoutTax: subtotalWithoutTax,
      totalWithTax: totalWithTax,
    });
  }

  return {
    storeName,
    invoiceNumber,
    date,
    taxId,
    subtotalWithoutTax: Number(subtotalWithoutTax.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalWithTax: Number(totalWithTax.toFixed(2)),
    confidenceScore: qrFallback ? 0.99 : 0.88,
    notes: qrFallback ? 'Extraído com precisão via Código QR AT (Autoridade Tributária)' : 'Extraído via Leitura Ótica OCR',
    items,
  };
}

/**
 * Main hybrid extraction function for images or PDF buffers
 */
export async function extractInvoiceFromBuffers(
  imageBuffers: Buffer[],
  preDetectedQr?: any,
  providedText?: string
): Promise<ExtractedInvoiceResult> {
  let combinedQr: Partial<ExtractedInvoiceResult> | null = preDetectedQr || null;
  let fullText = providedText || '';

  for (const buffer of imageBuffers) {
    // Check if buffer is a PDF
    if (buffer.slice(0, 5).toString() === '%PDF-') {
      try {
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        if (textResult && textResult.text) {
          fullText += '\n' + textResult.text;
        }
        await parser.destroy();
      } catch (pdfErr) {
        console.warn('PDF-parse fallback error:', pdfErr);
      }
      continue;
    }

    if (!combinedQr) {
      combinedQr = await tryDecodeQrCode(buffer);
    }

    // Run Tesseract to extract text if we don't have enough digital text
    if (fullText.trim().length < 60) {
      const pageText = await performTesseractOcr(buffer, 25000);
      if (pageText) {
        fullText += '\n' + pageText;
      }
    }
  }

  return parseInvoiceTextToData(fullText, combinedQr);
}
