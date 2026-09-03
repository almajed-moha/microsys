import React, { useRef } from 'react';
import { CardTemplate } from '../types';
import { QrCode, Store, Phone, Calendar, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

interface PrintableCardProps {
  template: CardTemplate;
  networkName: string;
  networkSlogan?: string;
  username: string;
  password?: string;
  serial?: string | number;
  profileName: string;
  price?: number;
  currency?: string;
  supportPhone?: string;
  posPointName?: string;
  instructions?: string;
  interactive?: boolean;
  selectedElementKey?: string;
  onSelectElement?: (elementKey: string) => void;
  onUpdatePosition?: (elementKey: string, pos: { x: number; y: number }) => void;
}

export const PrintableCard: React.FC<PrintableCardProps> = ({
  template,
  networkName,
  networkSlogan,
  username,
  password,
  serial,
  profileName,
  price,
  currency = 'ريال',
  supportPhone,
  posPointName,
  instructions,
  interactive = false,
  selectedElementKey,
  onSelectElement,
  onUpdatePosition
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const getFontSize = (size: number | string) => {
    if (typeof size === 'number' || !isNaN(Number(size))) {
      return ''; // Handled via inline styles
    }
    switch (size) {
      case 'xs': return 'text-[10px]';
      case 'sm': return 'text-[11px]';
      case 'md': return 'text-xs';
      case 'lg': return 'text-sm';
      case 'xl': return 'text-base';
      case '2xl': return 'text-lg';
      case '3xl': return 'text-xl';
      default: return 'text-xs';
    }
  };

  const getFontFamily = (font?: string) => {
    switch (font) {
      case 'tajawal': return "'Tajawal', sans-serif";
      case 'almarai': return "'Almarai', sans-serif";
      case 'ibm': return "'IBM Plex Sans Arabic', sans-serif";
      case 'mono': return "'JetBrains Mono', monospace";
      case 'cairo':
      default: return "'Cairo', sans-serif";
    }
  };

  const getElementStyle = (key: string): React.CSSProperties => {
    const custom = template.elementStyles?.[key];
    const styles: React.CSSProperties = {};
    if (custom?.color) styles.color = custom.color;
    if (custom?.fontFamily) styles.fontFamily = getFontFamily(custom.fontFamily);
    if (custom?.backgroundColor) styles.backgroundColor = custom.backgroundColor;
    if (custom?.fontWeight) {
      if (custom.fontWeight === 'normal') styles.fontWeight = 400;
      else if (custom.fontWeight === 'semibold') styles.fontWeight = 600;
      else if (custom.fontWeight === 'bold') styles.fontWeight = 700;
      else if (custom.fontWeight === 'black') styles.fontWeight = 900;
    }
    if (custom?.fontSize && (typeof custom.fontSize === 'number' || !isNaN(Number(custom.fontSize)))) {
      styles.fontSize = `${Number(custom.fontSize)}px`;
    }
    return styles;
  };

  const getElementFontSizeClass = (key: string, defaultClass: string = ''): string => {
    const custom = template.elementStyles?.[key];
    if (!custom?.fontSize) return defaultClass;
    const classStr = getFontSize(custom.fontSize);
    return classStr || ''; // if it's a number, it will be handled by style
  };

  const codeCustomClass = getElementFontSizeClass('userCode', getFontSize(template.codeFontSize || 'md'));
  const codeClass = `font-black font-mono tracking-${template.codeLetterSpacing || 'normal'} ${codeCustomClass}`;
  
  const codeStyle = getElementStyle('userCode');
  if (template.codeFontSize && (typeof template.codeFontSize === 'number' || !isNaN(Number(template.codeFontSize)))) {
    codeStyle.fontSize = `${Number(template.codeFontSize)}px`;
  }

  const isUsernameOnly = !password || password.trim() === '' || password === username;

  // Card corner border radius: sharp (0px) vs rounded (14px)
  const cardBorderRadius = template.cardCornerStyle === 'sharp'
    ? '0px'
    : template.cardBorderRadius !== undefined
    ? `${template.cardBorderRadius}px`
    : '14px';

  // Filter out any unwanted login instructions text
  const cleanInstructions = instructions && !instructions.includes('سجل') && !instructions.includes('الدخول عبر')
    ? instructions
    : undefined;

  // Render an element that is draggable & selectable when interactive is true
  const renderDraggable = (
    key: string,
    children: React.ReactNode,
    defaultClassName: string = ''
  ) => {
    const savedPos = template.elementPositions?.[key] || { x: 0, y: 0 };
    const isSelected = interactive && selectedElementKey === key;

    if (!interactive) {
      return (
        <div
          className={defaultClassName}
          style={{
            transform: savedPos.x || savedPos.y ? `translate(${savedPos.x}px, ${savedPos.y}px)` : undefined,
          }}
        >
          {children}
        </div>
      );
    }

    return (
      <motion.div
        drag
        dragConstraints={cardRef}
        dragElastic={0.05}
        dragMomentum={false}
        initial={savedPos}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement?.(key);
        }}
        onDragEnd={(_, info) => {
          if (onUpdatePosition) {
            onUpdatePosition(key, {
              x: Math.round(savedPos.x + info.offset.x),
              y: Math.round(savedPos.y + info.offset.y),
            });
          }
        }}
        className={`${defaultClassName} cursor-grab active:cursor-grabbing transition-all relative z-20 ${
          isSelected
            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 rounded-lg shadow-lg scale-[1.02]'
            : 'hover:ring-2 hover:ring-indigo-400/60 rounded-lg'
        }`}
        title="انقر لتخصيص الخط واللون، أو اسحب لتعديل مكان العنصر"
      >
        {children}
        {isSelected && (
          <span className="absolute -top-3.5 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded shadow pointer-events-none z-30">
            محدد للتنسيق
          </span>
        )}
      </motion.div>
    );
  };

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden flex flex-col justify-between select-none shadow-md transition-all"
      style={{
        width: template.dimensionMode === 'custom_mm' && template.cardWidthMm ? `${template.cardWidthMm}mm` : '100%',
        height: template.dimensionMode === 'custom_mm' && template.cardHeightMm ? `${template.cardHeightMm}mm` : '100%',
        minHeight: '140px',
        backgroundColor: template.backgroundType === 'custom_image' ? '#0f172a' : (template.themeColor || '#1e1b4b'),
        border: `2px ${template.cutLineStyle && template.cutLineStyle !== 'none' ? template.cutLineStyle : 'solid'} ${template.borderColor || '#475569'}`,
        borderRadius: cardBorderRadius,
        color: template.codeTextColor || '#ffffff',
        fontFamily: getFontFamily(template.fontFamily),
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Image if uploaded */}
      {template.backgroundImageUrl && (
        <img
          src={template.backgroundImageUrl}
          alt="Template Background"
          className={`absolute inset-0 w-full h-full ${
            template.bgFit === 'contain'
              ? 'object-contain'
              : template.bgFit === 'fill'
              ? 'object-fill'
              : 'object-cover'
          } z-0 pointer-events-none`}
        />
      )}

      {/* Background Overlay for high readability */}
      {template.bgOverlayOpacity !== undefined && template.bgOverlayOpacity > 0 && (
        <div
          className="absolute inset-0 z-0 bg-slate-950 pointer-events-none"
          style={{ opacity: template.bgOverlayOpacity }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full justify-between pointer-events-auto">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          {renderDraggable(
            'networkName',
            <div className="flex flex-col">
              {template.showNetworkName && (
                <span
                  className={`font-black drop-shadow-sm flex items-center gap-1 ${getElementFontSizeClass('networkName', 'text-sm')}`}
                  style={getElementStyle('networkName')}
                >
                  <Wifi className="w-3.5 h-3.5 opacity-80 shrink-0" />
                  <span>{networkName}</span>
                </span>
              )}
              {template.showNetworkSlogan && networkSlogan && (
                <span
                  className={`opacity-80 mt-0.5 ${getElementFontSizeClass('networkSlogan', 'text-[10px]')}`}
                  style={getElementStyle('networkSlogan')}
                >
                  {networkSlogan}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {posPointName && (template.showPosName ?? true) && renderDraggable(
              'posName',
              <span
                className={`font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm ${getElementFontSizeClass('posName', 'text-[9px]')}`}
                style={getElementStyle('posName')}
              >
                <Store className="w-3 h-3 text-amber-400 shrink-0" />
                <span>نقطة: {posPointName}</span>
              </span>
            )}

            {template.showCategoryName && renderDraggable(
              'category',
              <span
                className={`font-extrabold px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md shadow-sm border border-white/20 ${getElementFontSizeClass('category', 'text-[10px]')}`}
                style={getElementStyle('category')}
              >
                {profileName}
              </span>
            )}
          </div>
        </div>

        {/* Center: PIN / Username Code Area */}
        <div className="flex flex-col items-center justify-center my-auto w-full py-1">
          {renderDraggable(
            'userCode',
            <div className="w-full flex justify-center">
              {isUsernameOnly ? (
                /* Single Box: Pure User Code with zero extra text */
                <div
                  className={`px-4 py-2 text-center w-[88%] shadow-sm ${
                    template.codeBoxStyle === 'transparent'
                      ? 'bg-transparent border-none'
                      : template.codeBoxStyle === 'solid-bg'
                      ? 'bg-white/90 text-slate-900 border-none rounded-lg'
                      : template.codeBoxStyle === 'dark-box'
                      ? 'bg-slate-900/80 text-white rounded-xl border border-white/30 backdrop-blur-md'
                      : template.codeBoxStyle === 'amber-box'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-xl backdrop-blur-md'
                      : template.codeBoxStyle === 'clean-border'
                      ? 'bg-transparent border-2 border-white rounded-xl'
                      : 'bg-white/30 text-white rounded-xl border border-white/30 backdrop-blur-md'
                  }`}
                  style={template.cardCornerStyle === 'sharp' ? { borderRadius: '0px' } : undefined}
                >
                  {template.showCodeLabel && template.codeBoxStyle !== 'transparent' && (
                    <span className="text-[9px] block opacity-80 font-sans mb-0.5 font-bold">
                      كود الكارت
                    </span>
                  )}
                  <div
                    className={`${codeClass} select-all tracking-wider ${template.codeBoxStyle === 'solid-bg' ? 'text-slate-900' : ''}`}
                    style={codeStyle}
                  >
                    {username}
                  </div>
                </div>
              ) : (
                /* Dual Box: Username & Password in ONE row */
                <div
                  className={`flex flex-row gap-4 px-4 py-2 text-center w-[95%] items-center justify-center shadow-sm ${
                    template.codeBoxStyle === 'transparent'
                      ? 'bg-transparent border-none'
                      : template.codeBoxStyle === 'solid-bg'
                      ? 'bg-white/90 text-slate-900 border-none rounded-lg'
                      : template.codeBoxStyle === 'dark-box'
                      ? 'bg-slate-900/80 text-white rounded-xl border border-white/30 backdrop-blur-md'
                      : template.codeBoxStyle === 'amber-box'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-xl backdrop-blur-md'
                      : template.codeBoxStyle === 'clean-border'
                      ? 'bg-transparent border-2 border-white rounded-xl'
                      : 'bg-white/30 text-white rounded-xl border border-white/30 backdrop-blur-md'
                  }`}
                  style={template.cardCornerStyle === 'sharp' ? { borderRadius: '0px' } : undefined}
                >
                  <div className="flex flex-col items-center">
                    {template.showCodeLabel && template.codeBoxStyle !== 'transparent' && (
                      <span className="text-[8px] block opacity-75 font-sans mb-0.5">اسم المستخدم</span>
                    )}
                    <div
                      className={`${codeClass} select-all ${template.codeBoxStyle === 'solid-bg' ? 'text-slate-900' : ''}`}
                      style={codeStyle}
                    >
                      {username}
                    </div>
                  </div>
                  {password && (
                    <>
                      <div className="w-px h-6 bg-white/20"></div>
                      <div className="flex flex-col items-center">
                        {template.showCodeLabel && template.codeBoxStyle !== 'transparent' && (
                          <span className="text-[8px] block opacity-75 font-sans mb-0.5">كلمة المرور</span>
                        )}
                        <div
                          className={`${codeClass} select-all ${template.codeBoxStyle === 'solid-bg' ? 'text-slate-900' : ''}`}
                          style={getElementStyle('password')}
                        >
                          {password}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {template.showInstructions && cleanInstructions && (
            <div
              className={`text-center mt-1 font-mono opacity-80 ${getElementFontSizeClass('instructions', 'text-[8px]')}`}
              style={getElementStyle('instructions')}
            >
              {cleanInstructions}
            </div>
          )}
        </div>

        {/* Footer Row */}
        <div className="flex items-end justify-between mt-auto pt-1 gap-2 border-t border-white/10">
          {renderDraggable(
            'footerLeft',
            <div className="flex flex-col gap-0.5">
              {template.showSerial && serial && (
                <span
                  className={`font-mono opacity-90 font-bold tracking-tight ${getElementFontSizeClass('serial', 'text-[9px]')}`}
                  style={getElementStyle('serial')}
                >
                  SN: #{serial}
                </span>
              )}
              {template.showSupportPhone && supportPhone && (
                <span
                  className={`font-medium opacity-90 flex items-center gap-1 ${getElementFontSizeClass('supportPhone', 'text-[8px]')}`}
                  style={getElementStyle('supportPhone')}
                >
                  <Phone className="w-2.5 h-2.5 shrink-0" />
                  <span>دعم: {supportPhone}</span>
                </span>
              )}
              {template.showPrintDate && (
                <span
                  className={`opacity-75 font-mono flex items-center gap-1 ${getElementFontSizeClass('printDate', 'text-[8px]')}`}
                  style={getElementStyle('printDate')}
                >
                  <Calendar className="w-2.5 h-2.5 shrink-0" />
                  <span>{new Date().toISOString().split('T')[0]}</span>
                </span>
              )}
            </div>
          )}

          {renderDraggable(
            'footerRight',
            <div className="flex gap-2 items-center">
              {template.showPrice && price !== undefined && (
                <span
                  className={`font-black bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/20 shadow-sm ${getElementFontSizeClass('price', 'text-xs')}`}
                  style={getElementStyle('price')}
                >
                  {price} {currency}
                </span>
              )}
              {template.showQrCode && (
                <div
                  className={`p-1 rounded-lg shadow-sm border border-white/20 ${
                    template.qrHasWhiteBg ? 'bg-white text-black' : 'bg-white/20 text-white'
                  }`}
                  style={template.cardCornerStyle === 'sharp' ? { borderRadius: '0px' } : undefined}
                >
                  <QrCode
                    className="w-7 h-7"
                    color={
                      template.elementStyles?.qrCode?.color
                        ? template.elementStyles.qrCode.color
                        : template.qrHasWhiteBg
                        ? '#000000'
                        : (template.codeTextColor || '#ffffff')
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
