import * as pdfjsLib from 'pdfjs-dist';
import jsQR from 'jsqr';
import { parsePortugueseAtQr } from './portugueseTaxUtils';

// Configure pdfjs worker for Vite/modern browser bundlers
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('PDF.js worker initialization fallback:', e);
}

export interface RenderedPdfPage {
  pageNumber: number;
  base64: string;
  width: number;
  height: number;
  text: string;
  qrData?: any;
}

export interface ProcessedPdfResult {
  pages: RenderedPdfPage[];
  fullText: string;
  combinedQr?: any;
}

/**
 * Scans a canvas image for Portuguese AT QR Code
 */
export function scanCanvasForQr(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): any | null {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, width, height);
    if (code && code.data) {
      const parsed = parsePortugueseAtQr(code.data);
      if (parsed) return { ...parsed, rawQr: code.data };
    }
  } catch (err) {
    console.warn('Scan canvas QR error:', err);
  }
  return null;
}

/**
 * Loads a PDF file and renders all pages to high-quality JPEG images,
 * simultaneously extracting digital text and detecting AT QR codes.
 */
export async function convertPdfToImages(file: File, maxPages = 5): Promise<ProcessedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const pages: RenderedPdfPage[] = [];
  let combinedQr: any = null;
  let fullText = '';

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);

    // High quality scale (2.5 gives ~1500-2400px width, optimal for crystal-clear OCR & QR reading)
    const viewport = page.getViewport({ scale: 2.5 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      continue;
    }

    // Render PDF page to canvas with high smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };
    await (page.render as any)(renderContext).promise;

    // Scan for AT QR Code on this rendered page
    const pageQr = scanCanvasForQr(ctx, canvas.width, canvas.height);
    if (pageQr && !combinedQr) {
      combinedQr = pageQr;
    }

    // Extract digital text content from the PDF page
    let pageText = '';
    try {
      const textContent = await page.getTextContent();
      pageText = textContent.items
        .map((it: any) => it.str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      fullText += '\n' + pageText;
    } catch (tErr) {
      console.warn(`Error extracting text from page ${pageNum}:`, tErr);
    }

    // Convert canvas to ultra-crisp JPEG
    const base64 = canvas.toDataURL('image/jpeg', 0.95);

    pages.push({
      pageNumber: pageNum,
      base64,
      width: canvas.width,
      height: canvas.height,
      text: pageText,
      qrData: pageQr,
    });
  }

  return {
    pages,
    fullText: fullText.trim(),
    combinedQr,
  };
}
