import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  Check,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  FileText,
  Layers,
  CheckCircle2,
  RefreshCw,
  Zap,
  ZapOff,
  Eye,
  ArrowRight,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InvoiceItem, MaterialCategory, ObraTopic, DEFAULT_OBRA_TOPICS, INVOICE_CATEGORY_OPTIONS } from '../types';
import { optimizeFileForOCR, scanCanvasForQrCode } from '../utils/imageCompressor';
import { classifyMaterialCategory } from '../utils/categoryClassifier';
import { validateInvoiceBatchDuplicates, DuplicateCheckResult } from '../utils/invoiceDuplicateUtils';

const CATEGORIES: MaterialCategory[] = [
  'Acessórios & Fixação',
  'Canalização & Tubagens',
  'Material Elétrico',
  'Máquinas & Equipamentos',
  'Ferramentas & Equipamento',
  'Construção Civil',
  'Combustível & Transporte',
  'Refeições & Estadia',
  'Outros',
];

interface ExtractedInvoiceDraft {
  tempId: string;
  fileName: string;
  previewUrl?: string;
  previewUrls?: string[];
  mimeType: string;
  topic?: string;
  category?: string;
  storeName: string;
  invoiceNumber: string;
  date: string;
  taxId: string;
  items: InvoiceItem[];
  subtotalWithoutTax: number;
  taxAmount: number;
  totalWithTax: number;
  roundAdjustmentAmount?: number;
  globalDiscountAmount?: number;
  error?: string;
}

export const InvoiceScannerModal: React.FC = () => {
  const {
    isScannerOpen,
    closeScanner,
    scannerTargetObraId,
    obras,
    invoices,
    addObra,
    addInvoice,
    addMultipleInvoices,
    setSelectedObraId,
    setActiveTab,
  } = useApp();

  // Multi-file processing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Live Camera with Torch & Multi-Page Capture state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [capturedPages, setCapturedPages] = useState<
    Array<{ dataUrl: string; label: string; detectedQr?: any }>
  >([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // File Picker Multi-Page Mode toggle
  const [treatFilesAsSingleInvoicePages, setTreatFilesAsSingleInvoicePages] = useState(false);

  // Review step state
  const [isReviewing, setIsReviewing] = useState(false);
  const [extractedInvoices, setExtractedInvoices] = useState<ExtractedInvoiceDraft[]>([]);
  const [activeInvoiceIdx, setActiveInvoiceIdx] = useState(0);
  const [selectedObraId, setSelectedObraIdState] = useState<string>(
    scannerTargetObraId || obras[0]?.id || ''
  );
  const [selectedTopic, setSelectedTopic] = useState<string>('Geral / Outros');

  // Preview full image in review
  const [inspectingImageUrl, setInspectingImageUrl] = useState<string | null>(null);

  // Duplicate Blocking Modal State
  const [duplicateBlockingModal, setDuplicateBlockingModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    existingInvoice?: any;
  } | null>(null);

  // Reactive duplicate detection for current drafts against the selected obra
  const duplicateValidation = React.useMemo(() => {
    if (!isReviewing || extractedInvoices.length === 0) {
      return {
        hasSameObraDuplicates: false,
        hasOtherObraDuplicates: false,
        hasInternalBatchDuplicates: false,
        duplicateReports: new Map<string, DuplicateCheckResult>(),
        internalBatchDuplicateIndices: new Set<number>(),
      };
    }
    const targetObra = selectedObraId || obras[0]?.id || '';
    return validateInvoiceBatchDuplicates(
      extractedInvoices,
      invoices,
      targetObra,
      obras
    );
  }, [isReviewing, extractedInvoices, invoices, selectedObraId, obras]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setCameraStream(null);
    }
    setTorchOn(false);
    setIsLiveCameraOpen(false);
    setCameraError(null);
  };

  const resetScannerState = () => {
    stopCameraStream();
    setIsReviewing(false);
    setExtractedInvoices([]);
    setActiveInvoiceIdx(0);
    setIsAnalyzing(false);
    setCurrentFileIndex(0);
    setTotalFilesCount(0);
    setCurrentFileName('');
    setGeneralError(null);
    setDuplicateBlockingModal(null);
    setCapturedPages([]);
    setTreatFilesAsSingleInvoicePages(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
  };

  useEffect(() => {
    if (isScannerOpen) {
      resetScannerState();
      setSelectedObraIdState(scannerTargetObraId || obras[0]?.id || '');
    }
    return () => {
      stopCameraStream();
    };
  }, [isScannerOpen, scannerTargetObraId]);

  const handleClose = () => {
    resetScannerState();
    closeScanner();
  };

  // Open In-App Live Camera with Torch
  const handleOpenLiveCamera = async () => {
    setCameraError(null);
    setCapturedPages([]);
    setIsLiveCameraOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmara web não suportada neste navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Detect Torch / Flash capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && 'torch' in capabilities) {
          setTorchAvailable(true);
        } else {
          setTorchAvailable(false);
        }
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Permissão da câmara negada. Por favor, autorize o acesso à câmara nas definições do navegador.'
          : 'Não foi possível aceder à câmara direta. Pode utilizar o botão de carregar ficheiros.'
      );
    }
  };

  // Toggle Torch / Flash
  const handleToggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch constraint error:', err);
    }
  };

  // Capture a page from live video feed
  const handleCapturePageFromVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    const doCapture = () => {
      try {
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(3600, width);
        canvas.height = Math.round((canvas.width * height) / width);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const detectedQr = scanCanvasForQrCode(ctx, canvas.width, canvas.height);

        const pageNumber = capturedPages.length + 1;
        const label = pageNumber === 1 ? 'Página 1 (Artigos)' : `Página ${pageNumber} (Totais & Fim)`;

        setCapturedPages((prev) => [...prev, { dataUrl, label, detectedQr }]);
        setCameraError(null);
      } catch (err) {
        console.error('Error capturing photo:', err);
      }
    };

    // If video frame isn't ready yet on the first tap, wait 250ms and capture automatically
    if (!video.videoWidth || video.videoWidth === 0 || video.readyState < 2) {
      setTimeout(() => {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          doCapture();
        } else {
          setCameraError('A inicializar o sensor da câmara. Toque novamente.');
          setTimeout(() => setCameraError(null), 2500);
        }
      }, 250);
      return;
    }

    doCapture();
  };

  const handleRemoveCapturedPage = (index: number) => {
    setCapturedPages((prev) => prev.filter((_, i) => i !== index));
  };

  // Robust request helper with automatic single retry to eliminate cold-start red errors
  const sendInvoiceAnalysisRequest = async (payload: any): Promise<any> => {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch('/api/gemini/analyze-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Não foi possível ler os dados do documento.');
        }
        return result;
      } catch (err: any) {
        lastErr = err;
        console.warn(`Tentativa ${attempt} de leitura falhou (${err?.message || err}). A recuperar...`);
        if (attempt < 2) {
          // Wait 1 second before retry on cold start
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    throw lastErr;
  };

  // Process captured camera pages with Gemini
  const handleProcessCapturedPages = async () => {
    if (capturedPages.length === 0) return;

    stopCameraStream();
    setIsAnalyzing(true);
    setGeneralError(null);
    setTotalFilesCount(1);
    setCurrentFileIndex(1);
    setCurrentFileName(`Fatura com ${capturedPages.length} página(s)`);

    try {
      const payloadImages = capturedPages.map((p) => ({
        imageBase64: p.dataUrl,
        mimeType: 'image/jpeg',
      }));

      const foundQr = capturedPages.find((p) => p.detectedQr)?.detectedQr;

      const result = await sendInvoiceAnalysisRequest({
        images: payloadImages,
        imageBase64: payloadImages[0]?.imageBase64 || '',
        mimeType: 'image/jpeg',
        detectedQr: foundQr,
      });

      const extracted = result.data;
      const targetObra = selectedObraId || obras[0]?.id || '';

      const draft = parseExtractedDataToDraft(
        extracted,
        `Fatura (${capturedPages.length} pág.)`,
        capturedPages.map((p) => p.dataUrl),
        'image/jpeg',
        targetObra,
        selectedTopic
      );

      setExtractedInvoices([draft]);
      setActiveInvoiceIdx(0);
      setIsReviewing(true);
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setGeneralError(err.message || 'Erro ao processar as páginas da fatura. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper parser for extracted invoice
  const parseExtractedDataToDraft = (
    extracted: any,
    fileName: string,
    previewUrls: string[],
    mimeType: string,
    targetObra: string,
    topic = 'Geral / Outros'
  ): ExtractedInvoiceDraft => {
    const formattedItems: InvoiceItem[] = (extracted.items || []).map((it: any, idx: number) => {
      const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
      let taxRate = typeof it.taxRate === 'number' && !isNaN(it.taxRate) ? it.taxRate : 23;
      if (taxRate < 0) taxRate = 23;

      let unitPriceWithoutTax = Number(it.unitPriceWithoutTax) || 0;
      let unitPriceWithTax = Number(it.unitPriceWithTax) || 0;
      let listPriceWithoutTax =
        typeof it.listPriceWithoutTax === 'number' && it.listPriceWithoutTax > 0
          ? Number(it.listPriceWithoutTax.toFixed(2))
          : 0;
      let discountPercent =
        typeof it.discountPercent === 'number' && it.discountPercent >= 0
          ? Number(it.discountPercent.toFixed(1))
          : 0;

      if (listPriceWithoutTax > 0 && discountPercent > 0 && unitPriceWithoutTax <= 0) {
        unitPriceWithoutTax = Number((listPriceWithoutTax * (1 - discountPercent / 100)).toFixed(2));
      } else if (listPriceWithoutTax <= 0 && unitPriceWithoutTax > 0) {
        listPriceWithoutTax = unitPriceWithoutTax;
      }

      if (unitPriceWithoutTax > 0) {
        if (unitPriceWithTax <= 0 || (unitPriceWithTax === unitPriceWithoutTax && taxRate > 0)) {
          unitPriceWithTax = Number((unitPriceWithoutTax * (1 + taxRate / 100)).toFixed(2));
        }
      } else if (unitPriceWithTax > 0) {
        unitPriceWithoutTax = Number((unitPriceWithTax / (1 + taxRate / 100)).toFixed(2));
        if (listPriceWithoutTax <= 0) listPriceWithoutTax = unitPriceWithoutTax;
      }

      const totalWithoutTax = Number((qty * unitPriceWithoutTax).toFixed(2));
      const totalWithTax = Number((qty * unitPriceWithTax).toFixed(2));
      const discountAmount =
        listPriceWithoutTax > unitPriceWithoutTax
          ? Number(((listPriceWithoutTax - unitPriceWithoutTax) * qty).toFixed(2))
          : 0;

      const category: MaterialCategory = classifyMaterialCategory(it.name || '', it.category);

      return {
        id: `item-${Date.now()}-${idx}`,
        invoiceId: '',
        obraId: targetObra,
        reference: it.reference || '',
        name: it.name || 'Produto',
        category: category,
        quantity: qty,
        unit: it.unit || 'un',
        listPriceWithoutTax: listPriceWithoutTax,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        taxRate: taxRate,
        unitPriceWithoutTax: unitPriceWithoutTax,
        unitPriceWithTax: unitPriceWithTax,
        totalWithoutTax: totalWithoutTax,
        totalWithTax: totalWithTax,
      };
    });

    let finalItems: InvoiceItem[] = formattedItems;
    const totalExtracted = Number(extracted.totalWithTax) || 0;
    const subtotalExtracted =
      Number(extracted.subtotalWithoutTax) ||
      (totalExtracted ? Number((totalExtracted / 1.23).toFixed(2)) : 0);

    if (finalItems.length === 0) {
      finalItems = [
        {
          id: `item-${Date.now()}-0`,
          invoiceId: '',
          obraId: targetObra,
          name: `Materiais / Compra em ${extracted.storeName || 'Loja'}`,
          category: 'Outros',
          quantity: 1,
          unit: 'un',
          listPriceWithoutTax: subtotalExtracted,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 23,
          unitPriceWithoutTax: subtotalExtracted,
          unitPriceWithTax: totalExtracted,
          totalWithoutTax: subtotalExtracted,
          totalWithTax: totalExtracted,
        },
      ];
    }

    const subtotalWithoutTax =
      Number(extracted.subtotalWithoutTax) ||
      finalItems.reduce((acc, it) => acc + it.totalWithoutTax, 0);

    const totalWithTax =
      totalExtracted > 0 ? totalExtracted : finalItems.reduce((acc, it) => acc + it.totalWithTax, 0);

    const taxAmount =
      Number(extracted.taxAmount) || Number(Math.max(0, totalWithTax - subtotalWithoutTax).toFixed(2));

    return {
      tempId: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileName,
      previewUrl: previewUrls[0] || '',
      previewUrls,
      mimeType,
      topic,
      storeName: extracted.storeName || 'Loja / Fornecedor',
      invoiceNumber: extracted.invoiceNumber || `FT-${Date.now().toString().slice(-6)}`,
      date: extracted.date || new Date().toISOString().split('T')[0],
      taxId: extracted.taxId || '',
      items: finalItems,
      subtotalWithoutTax: Number(subtotalWithoutTax.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalWithTax: Number(totalWithTax.toFixed(2)),
      roundAdjustmentAmount: Number(extracted.roundAdjustmentAmount) || 0,
      globalDiscountAmount: Number(extracted.globalDiscountAmount) || 0,
      error: extracted.notes || '',
    };
  };

  // Handles multiple files selected from disk / gallery, including PDFs and Photos
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const filesArray = Array.from(rawFiles);
    setGeneralError(null);
    setIsAnalyzing(true);

    const successfulDrafts: ExtractedInvoiceDraft[] = [];
    const errorsList: string[] = [];
    const targetObra = selectedObraId || obras[0]?.id || '';

    // If user indicated multiple files are pages of ONE invoice (e.g., Page 1 and Page 2):
    if (treatFilesAsSingleInvoicePages && filesArray.length > 1) {
      setTotalFilesCount(1);
      setCurrentFileIndex(1);
      setCurrentFileName(`Fatura com ${filesArray.length} páginas`);

      try {
        const compressedList = await Promise.all(
          filesArray.map(async (file) => {
            const opt = await optimizeFileForOCR(file);
            return {
              imageBase64: opt.base64,
              mimeType: opt.mimeType,
              detectedQr: opt.detectedQr,
            };
          })
        );

        const detectedQr = compressedList.find((c) => c.detectedQr)?.detectedQr;

        const result = await sendInvoiceAnalysisRequest({
          images: compressedList.map((c) => ({ imageBase64: c.imageBase64, mimeType: c.mimeType })),
          imageBase64: compressedList[0]?.imageBase64 || '',
          mimeType: compressedList[0]?.mimeType || 'image/jpeg',
          detectedQr,
        });

        const draft = parseExtractedDataToDraft(
          result.data,
          `Fatura (${filesArray.length} pág.)`,
          compressedList.map((c) => c.imageBase64),
          compressedList[0]?.mimeType || 'image/jpeg',
          targetObra,
          selectedTopic
        );
        successfulDrafts.push(draft);
      } catch (err: any) {
        errorsList.push(err.message || 'Erro ao processar fatura de múltiplas páginas.');
      }
    } else {
      // Standard batch processing (each file is processed with full multi-page PDF support)
      setTotalFilesCount(filesArray.length);

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setCurrentFileIndex(i + 1);
        setCurrentFileName(file.name);

        try {
          const opt = await optimizeFileForOCR(file);

          let payloadImages: Array<{ imageBase64: string; mimeType: string }> = [];
          let previewImages: string[] = [];

          if (opt.pages && opt.pages.length > 0) {
            // PDF with multiple pages rendered as crisp images
            payloadImages = opt.pages.map((p) => ({ imageBase64: p.base64, mimeType: 'image/jpeg' }));
            previewImages = opt.pages.map((p) => p.base64);
          } else {
            payloadImages = [{ imageBase64: opt.base64, mimeType: opt.mimeType }];
            previewImages = [opt.base64];
          }

          const result = await sendInvoiceAnalysisRequest({
            images: payloadImages,
            imageBase64: payloadImages[0]?.imageBase64 || opt.base64,
            mimeType: payloadImages[0]?.mimeType || opt.mimeType,
            detectedQr: opt.detectedQr,
          });

          const draft = parseExtractedDataToDraft(
            result.data,
            file.name,
            previewImages,
            opt.mimeType,
            targetObra,
            selectedTopic
          );
          successfulDrafts.push(draft);
        } catch (err: any) {
          console.error(`Erro ao processar ${file.name}:`, err);
          errorsList.push(`${file.name}: ${err?.message || 'Falha na leitura'}`);
        }
      }
    }

    setIsAnalyzing(false);

    if (successfulDrafts.length > 0) {
      setExtractedInvoices(successfulDrafts);
      setActiveInvoiceIdx(0);
      setIsReviewing(true);

      if (errorsList.length > 0) {
        setGeneralError(`Avisos: ${errorsList.join('; ')}`);
      }
    } else {
      setGeneralError(
        errorsList.length > 0
          ? `Falha ao processar ficheiros: ${errorsList.join('; ')}`
          : 'Não foi possível ler os documentos fornecidos. Verifique se o ficheiro é uma imagem nítida ou PDF e tente novamente.'
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeDraft = extractedInvoices[activeInvoiceIdx];

  const handleUpdateActiveInvoice = (field: keyof ExtractedInvoiceDraft, value: any) => {
    if (!activeDraft) return;
    setExtractedInvoices((prev) => {
      const copy = [...prev];
      copy[activeInvoiceIdx] = { ...copy[activeInvoiceIdx], [field]: value };
      return copy;
    });
  };

  const handleUpdateActiveInvoiceItem = (itemIndex: number, field: keyof InvoiceItem, value: any) => {
    if (!activeDraft) return;
    setExtractedInvoices((prev) => {
      const copy = [...prev];
      const draft = { ...copy[activeInvoiceIdx] };
      const updatedItems = [...draft.items];
      const currentItem = { ...updatedItems[itemIndex] };

      (currentItem as any)[field] = value;

      let qty = Number(currentItem.quantity) > 0 ? Number(currentItem.quantity) : 1;
      let taxRate = Number(currentItem.taxRate);
      if (isNaN(taxRate) || taxRate < 0) taxRate = 23;

      let listPrice = Number(currentItem.listPriceWithoutTax) || 0;
      let discount = Number(currentItem.discountPercent) || 0;
      let unitWithout = Number(currentItem.unitPriceWithoutTax) || 0;
      let unitWith = Number(currentItem.unitPriceWithTax) || 0;

      if (field === 'listPriceWithoutTax') {
        const newList = Number(value) || 0;
        listPrice = newList;
        if (discount > 0) {
          unitWithout = Number((newList * (1 - discount / 100)).toFixed(2));
        } else if (unitWithout <= 0) {
          unitWithout = newList;
        }
        unitWith = Number((unitWithout * (1 + taxRate / 100)).toFixed(2));
      } else if (field === 'discountPercent') {
        const newDisc = Number(value) || 0;
        discount = newDisc;
        if (listPrice > 0) {
          unitWithout = Number((listPrice * (1 - newDisc / 100)).toFixed(2));
        }
        unitWith = Number((unitWithout * (1 + taxRate / 100)).toFixed(2));
      } else if (field === 'taxRate') {
        taxRate = Number(value) || 0;
        unitWith = Number((unitWithout * (1 + taxRate / 100)).toFixed(2));
      } else if (field === 'unitPriceWithoutTax') {
        const newWithout = Number(value) || 0;
        unitWithout = newWithout;
        if (listPrice <= 0 || listPrice < newWithout) {
          listPrice = newWithout;
          discount = 0;
        }
        unitWith = Number((newWithout * (1 + taxRate / 100)).toFixed(2));
      } else if (field === 'unitPriceWithTax') {
        const newWith = Number(value) || 0;
        unitWith = newWith;
        unitWithout = Number((newWith / (1 + taxRate / 100)).toFixed(2));
        if (listPrice <= 0 || listPrice < unitWithout) {
          listPrice = unitWithout;
          discount = 0;
        }
      } else if (field === 'quantity') {
        qty = Number(value) || 0;
      }

      currentItem.quantity = qty;
      currentItem.taxRate = taxRate;
      currentItem.listPriceWithoutTax = listPrice;
      currentItem.discountPercent = discount;
      currentItem.unitPriceWithoutTax = unitWithout;
      currentItem.unitPriceWithTax = unitWith;
      currentItem.totalWithoutTax = Number((qty * unitWithout).toFixed(2));
      currentItem.totalWithTax = Number((qty * unitWith).toFixed(2));

      updatedItems[itemIndex] = currentItem;
      draft.items = updatedItems;

      const subtotal = updatedItems.reduce((acc, it) => acc + (Number(it.totalWithoutTax) || 0), 0);
      const total = updatedItems.reduce((acc, it) => acc + (Number(it.totalWithTax) || 0), 0);
      draft.subtotalWithoutTax = Number(subtotal.toFixed(2));
      draft.totalWithTax = Number(total.toFixed(2));
      draft.taxAmount = Number(Math.max(0, total - subtotal).toFixed(2));

      copy[activeInvoiceIdx] = draft;
      return copy;
    });
  };

  const handleRemoveActiveInvoiceItem = (itemIndex: number) => {
    if (!activeDraft) return;
    setExtractedInvoices((prev) => {
      const copy = [...prev];
      const draft = { ...copy[activeInvoiceIdx] };
      draft.items = draft.items.filter((_, idx) => idx !== itemIndex);
      const subtotal = draft.items.reduce((acc, it) => acc + (Number(it.totalWithoutTax) || 0), 0);
      const total = draft.items.reduce((acc, it) => acc + (Number(it.totalWithTax) || 0), 0);
      draft.subtotalWithoutTax = Number(subtotal.toFixed(2));
      draft.totalWithTax = Number(total.toFixed(2));
      draft.taxAmount = Number(Math.max(0, total - subtotal).toFixed(2));
      copy[activeInvoiceIdx] = draft;
      return copy;
    });
  };

  const handleAddNewItemToActive = () => {
    if (!activeDraft) return;
    const targetObra = selectedObraId || obras[0]?.id || '';
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${activeDraft.items.length}`,
      invoiceId: '',
      obraId: targetObra,
      name: 'Novo Artigo',
      category: 'Outros',
      quantity: 1,
      unit: 'un',
      listPriceWithoutTax: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 23,
      unitPriceWithoutTax: 0,
      unitPriceWithTax: 0,
      totalWithoutTax: 0,
      totalWithTax: 0,
    };
    handleUpdateActiveInvoice('items', [...activeDraft.items, newItem]);
  };

  const handleRemoveInvoiceFromBatch = (indexToRemove: number) => {
    setExtractedInvoices((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      if (filtered.length === 0) {
        resetScannerState();
      } else if (activeInvoiceIdx >= filtered.length) {
        setActiveInvoiceIdx(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const handleStartManualInvoice = () => {
    let targetObra = selectedObraId || obras[0]?.id || '';
    if (!targetObra) {
      targetObra = addObra({
        name: 'Obra Principal',
        client: 'Cliente Geral',
        address: 'Portugal',
        status: 'em_curso',
        budget: 10000,
        startDate: new Date().toISOString().split('T')[0],
        notes: 'Obra criada para associar faturas.',
      });
      setSelectedObraIdState(targetObra);
    }

    const newDraft: ExtractedInvoiceDraft = {
      tempId: `draft-manual-${Date.now()}`,
      fileName: 'Fatura Manual',
      mimeType: 'manual',
      previewUrl: '',
      previewUrls: [],
      topic: selectedTopic,
      storeName: 'Loja / Fornecedor',
      invoiceNumber: `FT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      taxId: '',
      subtotalWithoutTax: 0,
      taxAmount: 0,
      totalWithTax: 0,
      items: [
        {
          id: `item-${Date.now()}-0`,
          invoiceId: '',
          obraId: targetObra,
          name: 'Material / Artigo',
          category: 'Outros',
          quantity: 1,
          unit: 'un',
          listPriceWithoutTax: 0,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 23,
          unitPriceWithoutTax: 0,
          unitPriceWithTax: 0,
          totalWithoutTax: 0,
          totalWithTax: 0,
        },
      ],
    };
    setExtractedInvoices([newDraft]);
    setActiveInvoiceIdx(0);
    setIsReviewing(true);
  };

  const handleSaveAllInvoices = () => {
    let targetObra = selectedObraId;
    if (!targetObra) {
      if (obras.length > 0) {
        targetObra = obras[0].id;
      } else {
        targetObra = addObra({
          name: 'Obra Principal',
          client: 'Cliente Geral',
          address: 'Portugal',
          status: 'em_curso',
          budget: 10000,
          startDate: new Date().toISOString().split('T')[0],
          notes: 'Obra criada automaticamente ao anexar fatura.',
        });
      }
      setSelectedObraIdState(targetObra);
    }

    if (extractedInvoices.length === 0) return;

    // BLOQUEIO RIGOROSO DE FATURAS DUPLICADAS NA MESMA OBRA OU NO LOTE
    if (duplicateValidation.hasSameObraDuplicates || duplicateValidation.hasInternalBatchDuplicates) {
      const reports = Array.from(duplicateValidation.duplicateReports.values());
      const dupInSame = reports.find((r) => r.duplicateInSameObra);
      const targetObraObj = obras.find((o) => o.id === targetObra);
      const obraName = targetObraObj?.name || 'esta obra';

      const invoiceNum = dupInSame?.existingInvoice?.invoiceNumber || activeDraft?.invoiceNumber || 's/n';
      const storeName = dupInSame?.existingInvoice?.storeName || activeDraft?.storeName || 'Loja';
      const amount = dupInSame?.existingInvoice?.totalWithTax ?? activeDraft?.totalWithTax ?? 0;

      setDuplicateBlockingModal({
        isOpen: true,
        title: '⛔ Fatura Duplicada! Não é permitido anexar 2 vezes',
        message: dupInSame?.existingInvoice
          ? `A fatura nº "${invoiceNum}" do fornecedor "${storeName}" (${Number(amount).toFixed(2)} €) já se encontra anexada à obra "${obraName}".`
          : 'Foram detetadas faturas repetidas dentro deste mesmo carregamento.',
        details: dupInSame?.reason || 'Por segurança contabilística, não é permitido anexar a mesma fatura 2 vezes.',
        existingInvoice: dupInSame?.existingInvoice,
      });

      setGeneralError(
        `⛔ Fatura Duplicada: A fatura "${invoiceNum}" já está anexada à obra "${obraName}". Remova a fatura repetida para poder guardar.`
      );
      return;
    }

    try {
      const formattedBatch = extractedInvoices.map((draft, idx) => {
        const imageUrls =
          draft.previewUrls && draft.previewUrls.length > 0
            ? draft.previewUrls
            : draft.previewUrl
            ? [draft.previewUrl]
            : [];

        return {
          obraId: targetObra,
          topic: draft.topic || selectedTopic || 'Geral / Outros',
          category: draft.category || '',
          storeName: draft.storeName.trim() || 'Loja / Fornecedor',
          invoiceNumber: draft.invoiceNumber.trim() || `FT ${Date.now()}-${idx + 1}`,
          date: draft.date || new Date().toISOString().split('T')[0],
          taxId: (draft.taxId || '').trim(),
          subtotalWithoutTax: Number(draft.subtotalWithoutTax) || 0,
          taxAmount: Number(draft.taxAmount) || 0,
          totalWithTax: Number(draft.totalWithTax) || 0,
          roundAdjustmentAmount: Number(draft.roundAdjustmentAmount) || 0,
          globalDiscountAmount: Number(draft.globalDiscountAmount) || 0,
          receiptImageUrl: imageUrls[0] || '',
          receiptImageUrls: imageUrls,
          notes: draft.error || '',
          items: (draft.items || []).map((it) => ({
            ...it,
            obraId: targetObra,
            name: it.name || 'Produto',
            category: it.category || 'Outros',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'un',
            listPriceWithoutTax: Number(it.listPriceWithoutTax) || Number(it.unitPriceWithoutTax) || 0,
            discountPercent: Number(it.discountPercent) || 0,
            discountAmount: Number(it.discountAmount) || 0,
            taxRate: typeof it.taxRate === 'number' ? it.taxRate : 23,
            unitPriceWithoutTax: Number(it.unitPriceWithoutTax) || 0,
            unitPriceWithTax: Number(it.unitPriceWithTax) || 0,
            totalWithoutTax: Number(it.totalWithoutTax) || 0,
            totalWithTax: Number(it.totalWithTax) || 0,
          })),
        };
      });

      if (formattedBatch.length === 1) {
        addInvoice(formattedBatch[0]);
      } else {
        addMultipleInvoices(formattedBatch);
      }

      setSelectedObraId(targetObra);
      setActiveTab('obras');
      resetScannerState();
      closeScanner();
    } catch (err: any) {
      console.error('Erro ao guardar faturas:', err);
      setGeneralError(`Erro ao guardar: ${err?.message || 'Tente novamente.'}`);
    }
  };

  const selectedObraObj = obras.find((o) => o.id === selectedObraId);
  const availableTopics = Array.from(
    new Set([...DEFAULT_OBRA_TOPICS, ...(selectedObraObj?.customTopics || [])])
  );

  const batchGrandTotalWithTax = extractedInvoices.reduce((acc, inv) => acc + inv.totalWithTax, 0);

  if (!isScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl revolut-card revolut-shadow border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[92vh] bg-white dark:bg-[#121216] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-black dark:text-white">
                {isLiveCameraOpen
                  ? 'Câmara para Faturas (com Flash & Multi-Página)'
                  : isReviewing
                  ? extractedInvoices.length > 1
                    ? `Rever ${extractedInvoices.length} Faturas`
                    : 'Rever & Confirmar Fatura'
                  : 'Digitalizar Fatura com IA'}
              </h2>
              <p className="text-xs text-slate-400">
                {isLiveCameraOpen
                  ? 'Tire fotos à Página 1 e Página 2 da mesma fatura'
                  : isReviewing
                  ? 'Verifique os artigos, totais e acertos de contas'
                  : 'Suporte a Faturas de 2 Páginas, Flash da Câmara e Tópicos'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-400 hover:text-black dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {generalError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 1: LIVE CAMERA VIEW WITH FLASH & MULTI-PAGE SNAPPING               */}
          {/* ========================================================================= */}
          {isLiveCameraOpen && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                  <p className="font-bold mb-1">Aviso da Câmara:</p>
                  <p>{cameraError}</p>
                  <button
                    onClick={() => {
                      stopCameraStream();
                      fileInputRef.current?.click();
                    }}
                    className="mt-3 px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs"
                  >
                    Usar Galeria de Fotos / Ficheiros
                  </button>
                </div>
              ) : (
                <div className="relative rounded-3xl overflow-hidden bg-black border border-white/10 shadow-inner">
                  {/* Viewfinder Video */}
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-[340px] sm:h-[400px] object-cover"
                  />

                  {/* Top Bar inside Camera: Torch Toggle and Close */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold">
                      {capturedPages.length === 0
                        ? 'Página 1 (Frente / Artigos)'
                        : `Página ${capturedPages.length + 1} (Totais / Fim)`}
                    </span>

                    <div className="flex items-center gap-2">
                      {torchAvailable && (
                        <button
                          type="button"
                          onClick={handleToggleTorch}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-lg backdrop-blur-md ${
                            torchOn
                              ? 'bg-amber-400 text-black shadow-amber-400/40'
                              : 'bg-black/60 text-white hover:bg-black/80'
                          }`}
                        >
                          {torchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
                          <span>{torchOn ? 'Flash Ligado' : 'Ligar Flash'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Guide Reticle Overlay */}
                  <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] text-white/50 bg-black/40 px-2.5 py-1 rounded-full font-medium">
                      Enquadre a fatura com boa luz
                    </span>
                  </div>

                  {/* Bottom Camera Action Bar */}
                  <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-3 px-4 z-10">
                    <button
                      type="button"
                      onClick={handleCapturePageFromVideo}
                      className="w-16 h-16 rounded-full border-4 border-white bg-blue-600 active:scale-90 transition-transform shadow-2xl flex items-center justify-center text-white"
                      title="Tirar Foto"
                    >
                      <Camera className="w-7 h-7" />
                    </button>
                    <span className="text-[11px] font-bold text-white drop-shadow">
                      Toque para fotografar página
                    </span>
                  </div>
                </div>
              )}

              {/* Thumbnails of captured pages */}
              {capturedPages.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-500" />
                      <span>{capturedPages.length} Página(s) Capturada(s) desta fatura:</span>
                    </span>

                    <span className="text-[11px] text-slate-400">
                      Pode tirar foto à Página 2 para faturas compridas
                    </span>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {capturedPages.map((page, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black shrink-0 w-28 h-36 group"
                      >
                        <img
                          src={page.dataUrl}
                          alt={page.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[10px] font-bold text-white text-center truncate">
                          {page.label}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCapturedPage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-md"
                          title="Remover página"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <div className="flex flex-col justify-center gap-2 ml-2">
                      <p className="text-xs text-slate-500">
                        {capturedPages.length === 1
                          ? '👉 Tem mais páginas com totais no fim? Aponte a câmara e toque no botão circular para fotografar a Página 2.'
                          : '✅ Ambas as páginas capturadas! Clique em "Processar com IA".'}
                      </p>

                      <button
                        type="button"
                        onClick={handleProcessCapturedPages}
                        className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95 flex items-center gap-2 self-start"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Processar Fatura ({capturedPages.length} Pág.) com IA</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 2: INITIAL CHOOSE FILE / CAMERA SCREEN                              */}
          {/* ========================================================================= */}
          {!isLiveCameraOpen && !isReviewing && (
            <div className="space-y-6">
              {/* Project & Topic Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black dark:text-white mb-1.5">
                    Associar à Obra:
                  </label>
                  {obras.length === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                      Crie uma obra em &quot;Pastas de Obras&quot; para associar faturas.
                    </div>
                  ) : (
                    <select
                      value={selectedObraId}
                      onChange={(e) => setSelectedObraIdState(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {obras.map((obra) => (
                        <option key={obra.id} value={obra.id}>
                          {obra.name} ({obra.client})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-black dark:text-white mb-1.5">
                    Tópico / Sistema da Obra:
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableTopics.map((top) => (
                      <option key={top} value={top}>
                        {top}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress Screen when analyzing */}
              {isAnalyzing && (
                <div className="rounded-3xl border border-blue-500/30 bg-black p-8 text-center flex flex-col items-center justify-center min-h-[260px]">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-500 flex items-center justify-center mb-4 animate-pulse">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-black text-white">
                    A ler fatura com IA ({currentFileIndex} de {totalFilesCount})...
                  </h3>
                  <p className="text-xs text-blue-400 font-mono mt-1">{currentFileName}</p>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm">
                    A inteligência artificial está a ler fornecedor, todos os artigos, taxas de IVA, descontos e acertos de contas finais.
                  </p>
                </div>
              )}

              {/* Upload & Camera Buttons */}
              {!isAnalyzing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Option 1: Native direct camera (Fastest on Mobile, zero lag) */}
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-5 rounded-3xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition group ios-press-active text-center"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-2.5 group-hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <span className="text-xs sm:text-sm font-black text-black dark:text-white">
                        Tirar Foto (Câmara)
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Foco e nitidez máxima
                      </span>
                    </button>

                    {/* Option 2: In-app camera with flash & multi-page */}
                    <button
                      type="button"
                      onClick={handleOpenLiveCamera}
                      className="flex flex-col items-center justify-center p-5 rounded-3xl border-2 border-dashed border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 transition group ios-press-active text-center"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mb-2.5 group-hover:scale-105 transition-transform">
                        <Zap className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <span className="text-xs sm:text-sm font-black text-black dark:text-white">
                        Scanner com Flash
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Lanterna & 2 Páginas
                      </span>
                    </button>

                    {/* Option 3: Upload multiple files / gallery */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-5 rounded-3xl border-2 border-dashed border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 hover:bg-slate-100 dark:hover:bg-neutral-900 transition group ios-press-active text-center"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md mb-2.5 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <span className="text-xs sm:text-sm font-black text-black dark:text-white">
                        Galeria ou PDF
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Ficheiros guardados
                      </span>
                    </button>
                  </div>

                  {/* Multi-page checkbox for gallery/files */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <label htmlFor="multiPageToggle" className="flex items-center gap-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        id="multiPageToggle"
                        checked={treatFilesAsSingleInvoicePages}
                        onChange={(e) => setTreatFilesAsSingleInvoicePages(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4"
                      />
                      <span className="text-slate-600 dark:text-neutral-300 font-medium">
                        Ao selecionar múltiplos ficheiros, juntar como <strong>Páginas da mesma fatura</strong> (ex: Página 1 + Página 2)
                      </span>
                    </label>
                  </div>

                  {/* Manual entry button */}
                  <button
                    onClick={handleStartManualInvoice}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-neutral-900/50 hover:bg-slate-100 dark:hover:bg-neutral-800 transition text-xs font-bold text-black dark:text-white"
                  >
                    <Plus className="w-4 h-4 text-blue-500 stroke-[2.5]" />
                    <span>Inserir Fatura Manualmente (sem fotografia)</span>
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/*,application/pdf"
                onChange={handleFilesSelected}
                className="hidden"
              />

              {/* Hidden direct camera input for instant mobile photo */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 3: REVIEW & CONFIRM INVOICE(S)                                     */}
          {/* ========================================================================= */}
          {isReviewing && activeDraft && (
            <div className="space-y-5">
              {/* If multiple invoices loaded, show tab selector */}
              {extractedInvoices.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {extractedInvoices.map((inv, idx) => {
                    const dup = duplicateValidation.duplicateReports.get(inv.tempId);
                    const isDupInSame = dup?.isDuplicate && dup.duplicateInSameObra;
                    return (
                      <button
                        key={inv.tempId}
                        onClick={() => setActiveInvoiceIdx(idx)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition shrink-0 ${
                          isDupInSame
                            ? activeInvoiceIdx === idx
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                              : 'bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400'
                            : activeInvoiceIdx === idx
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-300'
                        }`}
                      >
                        {isDupInSame && <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />}
                        <span className="truncate max-w-[120px]">{inv.storeName || `Fatura ${idx + 1}`}</span>
                        <span className="font-mono text-[10px]">{inv.totalWithTax.toFixed(2)} €</span>
                        {isDupInSame && (
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-rose-700 text-white font-black">
                            Duplicada
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* DUPLICATE INVOICE WARNING CARDS */}
              {(() => {
                const activeDup = duplicateValidation.duplicateReports.get(activeDraft.tempId);
                if (!activeDup || !activeDup.isDuplicate) return null;

                if (activeDup.duplicateInSameObra) {
                  return (
                    <div className="p-4 sm:p-5 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-600 dark:text-rose-400 space-y-3 animate-in fade-in shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-rose-700 dark:text-rose-300">
                                ⛔ Fatura Duplicada! Não é permitido anexar 2 vezes
                              </h4>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                                Bloqueado
                              </span>
                            </div>
                            <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 leading-relaxed">
                              A fatura <strong>&quot;{activeDraft.invoiceNumber || 's/n'}&quot;</strong> do fornecedor <strong>&quot;{activeDraft.storeName}&quot;</strong> já se encontra anexada nesta obra (<strong>{selectedObraObj?.name || 'Obra'}</strong>).
                            </p>
                            <p className="text-[11px] font-mono mt-1 opacity-90">
                              ℹ️ {activeDup.reason}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveInvoiceFromBatch(activeInvoiceIdx)}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95"
                          title="Remover esta fatura do lote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Cópia</span>
                        </button>
                      </div>

                      {activeDup.existingInvoice && (
                        <div className="p-3 rounded-2xl bg-black/5 dark:bg-black/40 border border-rose-500/20 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Nº no Sistema:</span>
                            <strong className="font-mono text-black dark:text-white">{activeDup.existingInvoice.invoiceNumber}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Valor com IVA:</span>
                            <strong className="font-mono text-black dark:text-white">{activeDup.existingInvoice.totalWithTax.toFixed(2)} €</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Data Registada:</span>
                            <strong className="font-mono text-black dark:text-white">{activeDup.existingInvoice.date}</strong>
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 italic">
                        Dica: Se a leitura automática da IA errou no número da fatura, corrija o campo &quot;Nº da Fatura&quot; abaixo para desbloquear.
                      </p>
                    </div>
                  );
                }

                if (activeDup.duplicateInOtherObra) {
                  return (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black">⚠️ Aviso: Fatura já registada noutra obra</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 font-bold uppercase">
                            Outra Obra
                          </span>
                        </div>
                        <p>
                          Esta fatura ({activeDraft.invoiceNumber}) já se encontra associada à obra <strong>&quot;{activeDup.existingObraName}&quot;</strong>. Verifique se pretendia colocá-la nesta obra.
                        </p>
                        <p className="text-[11px] opacity-80">{activeDup.reason}</p>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Photo Thumbnails of Captured Pages */}
              {activeDraft.previewUrls && activeDraft.previewUrls.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-500" />
                      <span>{activeDraft.previewUrls.length} Foto(s) Anexada(s):</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {activeDraft.previewUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setInspectingImageUrl(url)}
                          className="relative w-10 h-10 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 hover:ring-2 hover:ring-blue-500 transition shrink-0"
                          title={`Ver Página ${i + 1}`}
                        >
                          <img src={url} alt={`Página ${i + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-bold text-white text-center">
                            Pág. {i + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingImageUrl(activeDraft.previewUrls?.[0] || activeDraft.previewUrl || null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Foto Original</span>
                  </button>
                </div>
              )}

              {/* Active Invoice Details Form */}
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-neutral-900/70 border border-black/5 dark:border-white/5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black dark:text-white mb-1">
                      Loja / Fornecedor
                    </label>
                    <input
                      type="text"
                      value={activeDraft.storeName}
                      onChange={(e) => handleUpdateActiveInvoice('storeName', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 text-black dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black dark:text-white mb-1">
                      Nº da Fatura
                    </label>
                    <input
                      type="text"
                      value={activeDraft.invoiceNumber}
                      onChange={(e) => handleUpdateActiveInvoice('invoiceNumber', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 text-black dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black dark:text-white mb-1">
                      Tópico da Obra
                    </label>
                    <select
                      value={activeDraft.topic || selectedTopic}
                      onChange={(e) => handleUpdateActiveInvoice('topic', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 text-blue-600 dark:text-blue-400 font-bold"
                    >
                      {availableTopics.map((top) => (
                        <option key={top} value={top}>
                          {top}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>Categoria da Fatura</span>
                    </label>
                    <select
                      value={activeDraft.category || ''}
                      onChange={(e) => handleUpdateActiveInvoice('category', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecionar categoria...</option>
                      {INVOICE_CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black dark:text-white mb-1">
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      value={activeDraft.date}
                      onChange={(e) => handleUpdateActiveInvoice('date', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 text-black dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black dark:text-white mb-1">
                      NIF do Fornecedor
                    </label>
                    <input
                      type="text"
                      value={activeDraft.taxId}
                      onChange={(e) => handleUpdateActiveInvoice('taxId', e.target.value)}
                      placeholder="PT..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 text-black dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Acerto de Arredondamento (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={activeDraft.roundAdjustmentAmount || 0}
                      onChange={(e) => handleUpdateActiveInvoice('roundAdjustmentAmount', Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 text-black dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Desconto Global Rodapé (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={activeDraft.globalDiscountAmount || 0}
                      onChange={(e) => handleUpdateActiveInvoice('globalDiscountAmount', Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 text-black dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                      Artigos ({activeDraft.items.length})
                    </h3>
                    <button
                      onClick={handleAddNewItemToActive}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Linha
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {activeDraft.items.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="p-3.5 rounded-2xl bg-white dark:bg-black border border-black/5 dark:border-white/10 space-y-2.5 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateActiveInvoiceItem(index, 'name', e.target.value)}
                            placeholder="Nome do produto"
                            className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white"
                          />

                          <div className="flex items-center gap-2">
                            <select
                              value={item.category || activeDraft.category || 'Outros'}
                              onChange={(e) =>
                                handleUpdateActiveInvoiceItem(index, 'category', e.target.value as any)
                              }
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white font-medium shrink-0 max-w-[200px]"
                            >
                              {INVOICE_CATEGORY_OPTIONS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleRemoveActiveInvoiceItem(index)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                              title="Remover linha"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Price & Quantity Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Qtd</label>
                            <input
                              type="number"
                              step="any"
                              value={item.quantity === 0 ? '' : item.quantity}
                              placeholder="1"
                              onChange={(e) => handleUpdateActiveInvoiceItem(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">P. Tabela s/IVA</label>
                            <input
                              type="number"
                              step="any"
                              value={item.listPriceWithoutTax === 0 ? '' : item.listPriceWithoutTax}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleUpdateActiveInvoiceItem(index, 'listPriceWithoutTax', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-blue-500 font-bold block mb-0.5">Desconto %</label>
                            <input
                              type="number"
                              step="any"
                              value={item.discountPercent === 0 ? '' : item.discountPercent}
                              placeholder="0"
                              onChange={(e) =>
                                handleUpdateActiveInvoiceItem(index, 'discountPercent', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Taxa IVA</label>
                            <select
                              value={item.taxRate}
                              onChange={(e) =>
                                handleUpdateActiveInvoiceItem(index, 'taxRate', Number(e.target.value))
                              }
                              className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-neutral-900 border border-black/5 dark:border-white/10 text-black dark:text-white font-mono font-bold"
                            >
                              <option value={23}>23% Normal</option>
                              <option value={13}>13% Intermédio</option>
                              <option value={6}>6% Reduzido</option>
                              <option value={0}>0% Isento</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mb-0.5">
                              P. Pago c/IVA
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={item.unitPriceWithTax === 0 ? '' : item.unitPriceWithTax}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleUpdateActiveInvoiceItem(index, 'unitPriceWithTax', e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Total Linha c/IVA</label>
                            <div className="px-2 py-1.5 text-xs font-black text-black dark:text-white bg-slate-100 dark:bg-neutral-800 rounded-lg text-right font-mono">
                              {item.totalWithTax.toFixed(2)} €
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="p-4 rounded-2xl bg-black text-white flex flex-wrap items-center justify-between gap-4 border border-white/10">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Subtotal s/ IVA:</span>
                    <p className="text-sm font-bold font-mono">{activeDraft.subtotalWithoutTax.toFixed(2)} €</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total IVA:</span>
                    <p className="text-sm font-bold font-mono">{activeDraft.taxAmount.toFixed(2)} €</p>
                  </div>
                  {activeDraft.roundAdjustmentAmount !== 0 && (
                    <div>
                      <span className="text-[10px] text-amber-400 uppercase font-bold">Acerto Arred.:</span>
                      <p className="text-xs font-bold font-mono text-amber-400">
                        {activeDraft.roundAdjustmentAmount && activeDraft.roundAdjustmentAmount > 0 ? '+' : ''}
                        {activeDraft.roundAdjustmentAmount?.toFixed(2)} €
                      </p>
                    </div>
                  )}
                  {activeDraft.globalDiscountAmount !== 0 && (
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">Desc. Global:</span>
                      <p className="text-xs font-bold font-mono text-emerald-400">
                        -{activeDraft.globalDiscountAmount?.toFixed(2)} €
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-blue-400 uppercase font-bold">Total Final da Fatura:</span>
                    <p className="text-xl font-black text-blue-400 font-mono">
                      {activeDraft.totalWithTax.toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-neutral-900 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
          {isReviewing ? (
            <>
              <button
                type="button"
                onClick={resetScannerState}
                className="px-4 py-2.5 rounded-full border border-black/10 dark:border-white/10 text-xs font-bold text-black dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                <span>Nova Digitalização</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllInvoices}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition shadow-lg ml-auto active:scale-95 ${
                  duplicateValidation.hasSameObraDuplicates || duplicateValidation.hasInternalBatchDuplicates
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                }`}
              >
                {duplicateValidation.hasSameObraDuplicates || duplicateValidation.hasInternalBatchDuplicates ? (
                  <>
                    <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                    <span>⛔ Fatura Duplicada (Bloqueado)</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {extractedInvoices.length > 1
                        ? `Guardar ${extractedInvoices.length} Faturas (${batchGrandTotalWithTax.toFixed(2)} €)`
                        : `Confirmar e Guardar Fatura (${activeDraft?.totalWithTax.toFixed(2)} €)`}
                    </span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white hover:opacity-80 transition"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Image Lightbox Modal */}
      {inspectingImageUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative max-w-3xl w-full bg-neutral-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-500" />
                <span>Foto Real da Fatura</span>
              </h4>
              <button
                onClick={() => setInspectingImageUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center">
              <img
                src={inspectingImageUrl}
                alt="Foto da fatura"
                className="max-w-full max-h-[75vh] rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Invoice Blocking Modal Alert */}
      {duplicateBlockingModal?.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#16161b] border-2 border-rose-500 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-base text-black dark:text-white leading-tight">
                  {duplicateBlockingModal.title}
                </h3>
                <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider">
                  Operação Bloqueada pela Aplicação
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              {duplicateBlockingModal.message}
            </div>

            {duplicateBlockingModal.details && (
              <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 p-2.5 rounded-xl bg-black/5 dark:bg-black/30">
                🔍 {duplicateBlockingModal.details}
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-normal">
              Para não duplicar gastos nem gerar erros no apuramento de impostos e IVA perante as Finanças, a aplicação não permite anexar a mesma fatura mais do que uma vez na mesma obra.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateBlockingModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-xs font-bold text-black dark:text-white hover:bg-slate-200 transition"
              >
                Voltar e Corrigir
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveInvoiceFromBatch(activeInvoiceIdx);
                  setDuplicateBlockingModal(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md shadow-rose-600/25 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Fatura Repetida</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
