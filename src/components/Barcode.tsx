import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeLib from 'qrcode';

interface BarcodeProps {
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  font?: string;
  className?: string;
  background?: string;
  lineColor?: string;
  margin?: number;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  format = 'CODE128',
  width = 1.8,
  height = 40,
  displayValue = true,
  fontSize = 11,
  font = 'monospace',
  className = '',
  background = '#ffffff',
  lineColor = '#000000',
  margin = 5,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      // Clean string for standard Code 128
      const cleanValue = String(value).trim();
      if (!cleanValue) return;

      JsBarcode(svgRef.current, cleanValue, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        font,
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 3,
        background,
        lineColor,
        margin,
        valid: () => {},
      });
    } catch (err) {
      console.warn('Barcode generation fallback:', err);
    }
  }, [value, format, width, height, displayValue, fontSize, font, background, lineColor, margin]);

  if (!value) return null;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto overflow-visible" />
    </div>
  );
};

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  color?: {
    dark?: string;
    light?: string;
  };
  label?: string;
}

export const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 100,
  className = '',
  color = { dark: '#000000', light: '#ffffff' },
  label,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCodeLib.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: color.dark || '#000000',
          light: color.light || '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) console.error('QR Code error:', error);
      }
    );
  }, [value, size, color]);

  if (!value) return null;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      {label && <span className="text-[9px] font-mono text-slate-700 mt-1">{label}</span>}
    </div>
  );
};
