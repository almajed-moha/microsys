import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';
import { toCanvas } from 'html-to-image';

export interface PdfExportOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter' | 'pos-80mm' | 'pos-58mm' | [number, number];
  paperFormat?: 'a4' | 'pos-80mm' | 'pos-58mm';
  quality?: number;
  scale?: number;
  margin?: number; // mm
  backgroundColor?: string;
  autoPrint?: boolean;
}

export interface WhatsAppSharePdfOptions {
  filename?: string;
  title?: string;
  phone?: string;
  messageText?: string;
  scale?: number;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'pos-80mm' | 'pos-58mm';
  paperFormat?: 'a4' | 'pos-80mm' | 'pos-58mm';
}

/**
 * Builds a jsPDF document from an HTML element with pixel-perfect resolution,
 * full-page unconstrained capture, zero RTL clipping on right edges, and continuous POS roll support.
 */
export async function generatePdfInstance(
  elementIdOrElement: string | HTMLElement,
  options: PdfExportOptions = {}
): Promise<{ pdf: jsPDF; filename: string } | null> {
  let sandboxContainer: HTMLElement | null = null;

  try {
    let sourceElement: HTMLElement | null = null;

    if (typeof elementIdOrElement === 'string') {
      sourceElement = document.getElementById(elementIdOrElement);
    } else {
      sourceElement = elementIdOrElement;
    }

    if (!sourceElement) {
      console.error('Target element not found for PDF export:', elementIdOrElement);
      return null;
    }

    const {
      filename = `document_${Date.now()}.pdf`,
      orientation = 'portrait',
      format = 'a4',
      paperFormat,
      scale = 2.4, // Crisp resolution for Arabic typography & numbers
      backgroundColor = '#ffffff',
    } = options;

    const isThermal80 = format === 'pos-80mm' || paperFormat === 'pos-80mm';
    const isThermal58 = format === 'pos-58mm' || paperFormat === 'pos-58mm';
    const isThermal = isThermal80 || isThermal58;
    const margin = options.margin ?? (isThermal ? 1.5 : 6);

    // 1. Create a detached rendering sandbox in native viewport coordinates (0, 0)
    // Using position: fixed, opacity: 0 avoids SVG foreignObject coordinate distortion in RTL
    sandboxContainer = document.createElement('div');
    sandboxContainer.setAttribute('dir', 'rtl');
    sandboxContainer.style.position = 'fixed';
    sandboxContainer.style.left = '0';
    sandboxContainer.style.top = '0';
    sandboxContainer.style.opacity = '0';
    sandboxContainer.style.pointerEvents = 'none';
    sandboxContainer.style.zIndex = '-99999';
    
    // Pixel-perfect container widths:
    // Thermal 80mm: 310px (matches 80mm printable width at 96 DPI: 80/25.4*96 = 302.36px)
    // Thermal 58mm: 220px (matches 58mm at 96 DPI: 58/25.4*96 = 219.2px)
    // A4 Portrait: 794px (210mm)
    // A4 Landscape: 1123px (297mm)
    if (isThermal80) {
      sandboxContainer.style.width = '315px';
    } else if (isThermal58) {
      sandboxContainer.style.width = '220px';
    } else if (orientation === 'landscape') {
      sandboxContainer.style.width = '1123px';
    } else {
      sandboxContainer.style.width = '794px';
    }

    sandboxContainer.style.height = 'auto';
    sandboxContainer.style.maxHeight = 'none';
    sandboxContainer.style.overflow = 'visible';
    sandboxContainer.style.backgroundColor = '#ffffff';
    sandboxContainer.style.color = '#0f172a';
    sandboxContainer.style.boxSizing = 'border-box';
    sandboxContainer.style.padding = '0';
    sandboxContainer.style.margin = '0';

    // 2. Clone the element to render its full unconstrained height
    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';
    clone.style.minWidth = '0';
    clone.style.margin = '0';
    clone.style.boxSizing = 'border-box';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#0f172a';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';

    // Remove buttons or elements marked with .no-print / .no-pdf
    const buttonsAndNoPrint = clone.querySelectorAll<HTMLElement>(
      '.no-print, .no-pdf, button:not([data-keep-print])'
    );
    buttonsAndNoPrint.forEach((el) => el.remove());

    // Unconstrain any internal scrollable wrappers
    clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.style) {
        if (el.style.overflow && el.style.overflow !== 'visible') {
          el.style.overflow = 'visible';
        }
        if (el.style.maxHeight && el.style.maxHeight !== 'none') {
          el.style.maxHeight = 'none';
        }
      }
    });

    sandboxContainer.appendChild(clone);
    document.body.appendChild(sandboxContainer);

    // 3. Wait for DOM layout calculations
    await new Promise((r) => setTimeout(r, 80));

    // 4. Capture complete high-resolution canvas
    const canvas = await toCanvas(clone, {
      pixelRatio: scale,
      backgroundColor: backgroundColor,
      skipFonts: true,
      cacheBust: false,
    });

    // 5. If Thermal POS receipt, generate a continuous roll PDF
    if (isThermal) {
      const thermalWidthMm = isThermal58 ? 58 : 80;
      const printableWidthMm = thermalWidthMm - margin * 2;
      const totalHeightMm = Math.ceil((canvas.height * printableWidthMm) / canvas.width) + margin * 2 + 1;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [thermalWidthMm, Math.max(50, totalHeightMm)],
        compress: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(
        imgData,
        'JPEG',
        margin,
        margin,
        printableWidthMm,
        (canvas.height * printableWidthMm) / canvas.width,
        undefined,
        'FAST'
      );

      const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      return { pdf, filename: finalName };
    }

    // 6. Standard A4/Letter Sliced Multi-Page PDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format,
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    // Height in canvas pixels that fits on one page
    const pageChunkHeightPx = Math.floor((usableHeight / usableWidth) * canvas.width);

    let currentY = 0;
    let pageIndex = 0;

    // Slice canvas cleanly into pages (no cutoffs, no partial prints)
    while (currentY < canvas.height) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const remainingHeight = canvas.height - currentY;
      const chunkHeight = Math.min(pageChunkHeightPx, remainingHeight);

      // Create a sub-canvas for this specific page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = chunkHeight;
      const pageCtx = pageCanvas.getContext('2d');

      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          chunkHeight,
          0,
          0,
          canvas.width,
          chunkHeight
        );
      }

      const chunkImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
      const chunkHeightMm = (chunkHeight * usableWidth) / canvas.width;

      pdf.addImage(
        chunkImgData,
        'JPEG',
        margin,
        margin,
        usableWidth,
        chunkHeightMm,
        undefined,
        'FAST'
      );

      currentY += chunkHeight;
      pageIndex++;
    }

    const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    return { pdf, filename: finalName };
  } catch (error) {
    console.error('generatePdfInstance Error:', error);
    return null;
  } finally {
    if (sandboxContainer && sandboxContainer.parentNode) {
      sandboxContainer.parentNode.removeChild(sandboxContainer);
    }
  }
}

/**
 * Export any HTML element into a high-resolution, perfectly rendered PDF file.
 */
export async function exportElementToPdf(
  elementIdOrElement: string | HTMLElement,
  optionsOrFilename: PdfExportOptions | string = {}
): Promise<boolean> {
  try {
    const options: PdfExportOptions =
      typeof optionsOrFilename === 'string'
        ? { filename: optionsOrFilename }
        : optionsOrFilename;

    const el = typeof elementIdOrElement === 'string'
      ? document.getElementById(elementIdOrElement)
      : elementIdOrElement;

    if (!el) return false;

    const format = options.format || options.paperFormat || 'a4';
    const isThermal = format === 'pos-80mm';
    const orientation = options.orientation || 'portrait';
    const filename = options.filename || 'document.pdf';

    const opt = {
      margin: isThermal ? 2 : 10,
      filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: options.scale || 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: isThermal ? [80, 297] : format, orientation: orientation },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    if (options.autoPrint) {
       const result = await generatePdfInstance(elementIdOrElement, options);
       if (result) {
         result.pdf.autoPrint();
         result.pdf.save(result.filename);
       }
       return !!result;
    }

    await html2pdf().set(opt).from(el).save();
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    return false;
  }
}

/**
 * Generates a PDF file and shares it directly via WhatsApp (or native OS share sheet),
 * with fallback to automatic download + WhatsApp Web chat link.
 */
export async function sharePdfToWhatsApp(
  elementIdOrElement: string | HTMLElement,
  options: WhatsAppSharePdfOptions
): Promise<{ success: boolean; method: 'web_share' | 'download_and_chat' | 'error' }> {
  try {
    const result = await generatePdfInstance(elementIdOrElement, {
      filename: options.filename || `document_${Date.now()}.pdf`,
      title: options.title,
      scale: options.scale || 2.4,
      orientation: options.orientation || 'portrait',
      format: options.format || options.paperFormat || 'a4',
      paperFormat: options.paperFormat || (options.format === 'pos-80mm' ? 'pos-80mm' : undefined),
    });

    if (!result) {
      return { success: false, method: 'error' };
    }

    const pdfBlob = result.pdf.output('blob');
    const fileName = result.filename;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Clean phone number
    const rawPhone = (options.phone || '').trim().replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.startsWith('967')
      ? rawPhone
      : rawPhone.length === 9
      ? `967${rawPhone}`
      : rawPhone;

    const message = options.messageText || `كشف حساب / مستند مالي - ${options.title || ''}`;

    // 1. Check if browser supports Web Share API with files (Android / iOS / Modern Desktop)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: options.title || 'مستند مالي PDF',
          text: message,
        });
        return { success: true, method: 'web_share' };
      } catch (shareError: any) {
        if (shareError.name === 'AbortError') {
          // User closed the share sheet
          return { success: true, method: 'web_share' };
        }
        console.warn('Navigator share error, falling back to download + chat:', shareError);
      }
    }

    // 2. Fallback for desktop / standard browsers:
    // Download the PDF file so the user has it ready
    result.pdf.save(fileName);

    // Open WhatsApp Web or mobile chat
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');

    return { success: true, method: 'download_and_chat' };
  } catch (err) {
    console.error('sharePdfToWhatsApp Error:', err);
    return { success: false, method: 'error' };
  }
}

/**
 * Triggers clean print view for an element (PDF print or clean browser print).
 */
export async function printElementDocument(
  elementIdOrElement: string | HTMLElement,
  options: PdfExportOptions = {}
): Promise<boolean> {
  try {
    const result = await generatePdfInstance(elementIdOrElement, {
      ...options,
      autoPrint: true,
    });

    if (result) {
      const pdfBlob = result.pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Create an invisible iframe to print the exact multi-page PDF cleanly
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(blobUrl, '_blank');
          }
          setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          }, 3000);
        }, 250);
      };

      return true;
    }

    // Fallback standard print
    window.print();
    return true;
  } catch (err) {
    console.warn('printElementDocument fallback to window.print:', err);
    window.print();
    return true;
  }
}

/**
 * Generates and triggers download of a MikroTik RouterOS Configuration Script (.rsc)
 */
export function downloadMikroTikRscScript(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.rsc') ? filename : `${filename}.rsc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
