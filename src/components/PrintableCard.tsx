import React, { useRef } from 'react';
import { CardTemplate } from '../types';
import { QrCode, Store, Phone, Calendar, Wifi, Globe } from 'lucide-react';
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
  isInteractive?: boolean;
  selectedElementKey?: string;
  onSelectElement?: (elementKey: string) => void;
  onUpdatePosition?: (elementKey: string, pos: { x: number; y: number }) => void;
  onUpdatePositions?: (newPositions: Record<string, { x: number; y: number }>) => void;
  validity?: string;
  hotspotDns?: string;
  quota?: string;
  speed?: string;
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
  isInteractive,
  selectedElementKey,
  onSelectElement,
  onUpdatePosition,
  onUpdatePositions,
  validity,
  hotspotDns,
  quota,
  speed,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const effectiveInteractive = interactive || !!isInteractive;

  const handlePositionChange = (key: string, pos: { x: number; y: number }) => {
    if (onUpdatePosition) {
      onUpdatePosition(key, pos);
    }
    if (onUpdatePositions) {
      onUpdatePositions({ [key]: pos });
    }
  };

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
    return classStr || '';
  };

  const codeCustomClass = getElementFontSizeClass('userCode', getFontSize(template.codeFontSize || 'md'));
  const codeClass = `font-black font-mono tracking-${template.codeLetterSpacing || 'normal'} ${codeCustomClass}`;
  
  const codeStyle = getElementStyle('userCode');
  if (template.codeFontSize && (typeof template.codeFontSize === 'number' || !isNaN(Number(template.codeFontSize)))) {
    codeStyle.fontSize = `${Number(template.codeFontSize)}px`;
  }

  const isUsernameOnly = !password || password.trim() === '' || password === username;

  // Card corner border radius: sharp (0px) vs rounded (4-8px)
  const cardBorderRadius = template.cardCornerStyle === 'sharp'
    ? '0px'
    : template.cardBorderRadius !== undefined
    ? `${template.cardBorderRadius}px`
    : '6px';

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
    const isSelected = effectiveInteractive && selectedElementKey === key;

    if (!effectiveInteractive) {
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
          handlePositionChange(key, {
            x: Math.round(savedPos.x + info.offset.x),
            y: Math.round(savedPos.y + info.offset.y),
          });
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
          <span className="absolute -top-3.5 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded shadow pointer-events-none z-30 whitespace-nowrap">
            محدد للتنسيق
          </span>
        )}
      </motion.div>
    );
  };

  const isVoucherBadgeStyle =
    template.designStyle === 'voucher_badge' ||
    template.id === 'tpl-network-voucher-20' ||
    template.backgroundType === 'voucher_badge' ||
    template.backgroundType === 'telecom_wave' ||
    template.backgroundType === 'global_net' ||
    template.backgroundType === 'minimal_light';
  const badgeBgColor = template.badgeColor || template.themeColor || '#dc2626';

  /* ========================================================================= */
  /* DESIGN A: VOUCHER BADGE ARCHETYPE (Matched directly to User's image)     */
  /* ========================================================================= */
  if (isVoucherBadgeStyle) {
    const displayPrice = price !== undefined ? price : 100;
    const displayValidity = validity || template.validityText || '٤ أيام';
    const displayWebsite = template.websiteUrl || hotspotDns || 'www.j.net';
    const displayPhone = supportPhone || '736442223';

    return (
      <div
        ref={cardRef}
        className="relative w-full h-full bg-white select-none overflow-hidden flex flex-row transition-all box-border"
        style={{
          borderRadius: cardBorderRadius,
          border: `1px ${template.cutLineStyle && template.cutLineStyle !== 'none' ? template.cutLineStyle : 'solid'} ${template.borderColor || '#cbd5e1'}`,
          fontFamily: getFontFamily(template.fontFamily),
          direction: 'rtl',
        }}
      >
        {/* RIGHT SIDE: Red/Crimson Curved Arc Badge with Circular Price */}
        <div
          className="h-full flex flex-col items-center justify-center relative flex-shrink-0 z-10"
          style={{
            width: '24%',
            minWidth: '38px',
            maxWidth: '56px',
            backgroundColor: badgeBgColor,
            borderTopLeftRadius: '32px',
            borderBottomLeftRadius: '32px',
            boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.15)',
          }}
        >
          {renderDraggable(
            'price',
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-md mx-auto"
              style={{
                backgroundColor: template.priceCircleBg || '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.9)',
              }}
            >
              <span
                className="font-black font-mono leading-none tracking-tight"
                style={{
                  color: template.priceTextColor || badgeBgColor,
                  fontSize: displayPrice > 999 ? '11px' : '15px',
                  ...getElementStyle('price'),
                }}
              >
                {displayPrice}
              </span>
            </div>
          )}
        </div>

        {/* MAIN BODY: Network Name, Quota, User Code Capsule, WhatsApp/Domain, Validity */}
        <div className="flex-1 h-full flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden box-border leading-none">
          {/* Header Row: Network Name (Right) + Profile/Quota (Left) */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1">
            {renderDraggable(
              'networkName',
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className="font-black text-blue-700 text-[11px] sm:text-[13px] leading-tight truncate"
                  style={getElementStyle('networkName')}
                >
                  {networkName || 'شبكة جلوبل نت'}
                </span>
              </div>
            )}

            {renderDraggable(
              'category',
              <span
                className="font-black text-slate-900 text-[10px] sm:text-[12px] leading-tight shrink-0"
                style={getElementStyle('category')}
              >
                {profileName || '400 ميجا'}
              </span>
            )}
          </div>

          {/* Middle Section: User Code Capsule + Network Help Details */}
          <div className="flex items-center justify-between gap-1.5 my-auto pt-0.5">
            {/* User Login Code in Rounded Stadium Pill or Transparent */}
            <div className="flex flex-col items-start">
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 mb-0.5">
                رقم الدخول:
              </span>
              {renderDraggable(
                'userCode',
                <div
                  className={`px-2.5 py-0.5 sm:py-1 flex items-center justify-center min-w-[70px] sm:min-w-[90px] ${
                    template.codeBoxStyle === 'transparent'
                      ? 'bg-transparent border-none shadow-none'
                      : template.codeBoxStyle === 'solid-bg'
                      ? 'bg-white rounded-md border border-slate-300 shadow-xs'
                      : template.codeBoxStyle === 'rounded-white'
                      ? 'bg-white rounded-full border border-slate-200 shadow-xs'
                      : 'rounded-full border-2 bg-white shadow-xs'
                  }`}
                  style={{
                    borderColor:
                      template.codeBoxStyle === 'transparent'
                        ? 'transparent'
                        : template.codeBoxStyle === 'solid-bg'
                        ? '#cbd5e1'
                        : template.codeBoxStyle === 'rounded-white'
                        ? '#e2e8f0'
                        : (template.elementStyles?.userCode?.color || badgeBgColor),
                    backgroundColor:
                      template.codeBoxStyle === 'transparent'
                        ? 'transparent'
                        : (template.elementStyles?.userCode?.backgroundColor || '#ffffff'),
                  }}
                >
                  <span
                    className="font-mono font-black text-[12px] sm:text-[14px] text-slate-950 tracking-wider select-all leading-none whitespace-nowrap"
                    style={codeStyle}
                  >
                    {username}
                  </span>
                </div>
              )}
              {!isUsernameOnly && password && (
                <div className="flex items-center gap-1 mt-0.5 text-[8px] text-slate-700 font-mono">
                  <span className="text-slate-500 font-sans">السر:</span>
                  <strong className="text-slate-950">{password}</strong>
                </div>
              )}
            </div>

            {/* Support, Domain, and WhatsApp block */}
            <div className="flex flex-col text-right leading-tight gap-0.5 shrink-0">
              <span className="text-[7px] sm:text-[7.5px] font-bold text-red-600">
                للدخول أو معرفة الرصيد
              </span>
              <span
                className="text-[7.5px] sm:text-[8px] font-bold font-mono text-blue-800"
                style={getElementStyle('networkSlogan')}
              >
                {displayWebsite}
              </span>
              <div className="text-[6.5px] sm:text-[7px] text-slate-500 flex items-center gap-0.5 justify-end">
                <span>للتواصل واتساب:</span>
              </div>
              <span
                className="text-[7.5px] sm:text-[8px] font-bold font-mono text-slate-900"
                style={getElementStyle('supportPhone')}
              >
                {displayPhone}
              </span>
            </div>
          </div>

          {/* Footer Row: Validity + Serial Number */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[8px] sm:text-[8.5px] leading-tight">
            {renderDraggable(
              'footerLeft',
              <div className="flex items-center gap-1 font-bold text-slate-800">
                <span>الصلاحية :</span>
                <span
                  className="text-slate-900 font-black"
                  style={getElementStyle('validity')}
                >
                  {displayValidity}
                </span>
              </div>
            )}

            {renderDraggable(
              'footerRight',
              <div className="flex items-center gap-1.5">
                {template.showSerial && serial && (
                  <span
                    className="text-[7px] sm:text-[7.5px] font-mono text-slate-400"
                    style={getElementStyle('serial')}
                  >
                    SN: {serial}
                  </span>
                )}
                {posPointName && (template.showPosName ?? true) && (
                  <span className="text-[7px] sm:text-[7.5px] font-semibold text-slate-600 bg-slate-100 px-1 rounded">
                    {posPointName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================================= */
  /* DESIGN B: STANDARD & CUSTOM TEMPLATES (Responsive auto-fitting)          */
  /* ========================================================================= */
  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden flex flex-col justify-between select-none shadow-xs transition-all w-full h-full box-border"
      style={{
        backgroundColor: template.backgroundType === 'custom_image' ? '#0f172a' : (template.themeColor || '#1e1b4b'),
        border: `1.5px ${template.cutLineStyle && template.cutLineStyle !== 'none' ? template.cutLineStyle : 'solid'} ${template.borderColor || '#475569'}`,
        borderRadius: cardBorderRadius,
        color: template.codeTextColor || '#ffffff',
        fontFamily: getFontFamily(template.fontFamily),
        padding: '8px',
        boxSizing: 'border-box',
        direction: 'rtl',
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
        <div className="flex items-start justify-between gap-1.5">
          {renderDraggable(
            'networkName',
            <div className="flex flex-col min-w-0">
              {template.showNetworkName && (
                <span
                  className={`font-black drop-shadow-sm flex items-center gap-1 truncate ${getElementFontSizeClass('networkName', 'text-[11px] sm:text-xs')}`}
                  style={getElementStyle('networkName')}
                >
                  <Wifi className="w-3 h-3 opacity-80 shrink-0" />
                  <span>{networkName}</span>
                </span>
              )}
              {template.showNetworkSlogan && networkSlogan && (
                <span
                  className={`opacity-80 truncate text-[8px] sm:text-[9px]`}
                  style={getElementStyle('networkSlogan')}
                >
                  {networkSlogan}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
            {posPointName && (template.showPosName ?? true) && renderDraggable(
              'posName',
              <span
                className={`font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 shadow-xs text-[8px]`}
                style={getElementStyle('posName')}
              >
                <Store className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>{posPointName}</span>
              </span>
            )}

            {template.showCategoryName && renderDraggable(
              'category',
              <span
                className={`font-extrabold px-2 py-0.5 rounded bg-white/20 backdrop-blur-md shadow-xs border border-white/20 text-[9px] sm:text-[10px]`}
                style={getElementStyle('category')}
              >
                {profileName}
              </span>
            )}
          </div>
        </div>

        {/* Center: PIN / Username Code Area */}
        <div className="flex flex-col items-center justify-center my-auto w-full py-0.5">
          {renderDraggable(
            'userCode',
            <div className="w-full flex justify-center">
              {isUsernameOnly ? (
                <div
                  className={`px-3 py-1 text-center w-[92%] shadow-xs ${
                    template.codeBoxStyle === 'transparent'
                      ? 'bg-transparent border-none'
                      : template.codeBoxStyle === 'solid-bg'
                      ? 'bg-white/95 text-slate-900 border-none rounded-lg'
                      : template.codeBoxStyle === 'dark-box'
                      ? 'bg-slate-900/80 text-white rounded-lg border border-white/30 backdrop-blur-md'
                      : template.codeBoxStyle === 'amber-box'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-lg backdrop-blur-md'
                      : template.codeBoxStyle === 'clean-border'
                      ? 'bg-transparent border-2 border-white rounded-lg'
                      : 'bg-white/30 text-white rounded-lg border border-white/30 backdrop-blur-md'
                  }`}
                  style={template.cardCornerStyle === 'sharp' ? { borderRadius: '0px' } : undefined}
                >
                  {template.showCodeLabel && template.codeBoxStyle !== 'transparent' && (
                    <span className="text-[8px] block opacity-80 font-sans mb-0.5 font-bold">
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
                <div
                  className={`flex flex-row gap-2 px-3 py-1 text-center w-[96%] items-center justify-center shadow-xs ${
                    template.codeBoxStyle === 'transparent'
                      ? 'bg-transparent border-none'
                      : template.codeBoxStyle === 'solid-bg'
                      ? 'bg-white/95 text-slate-900 border-none rounded-lg'
                      : template.codeBoxStyle === 'dark-box'
                      ? 'bg-slate-900/80 text-white rounded-lg border border-white/30 backdrop-blur-md'
                      : template.codeBoxStyle === 'amber-box'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-lg backdrop-blur-md'
                      : template.codeBoxStyle === 'clean-border'
                      ? 'bg-transparent border-2 border-white rounded-lg'
                      : 'bg-white/30 text-white rounded-lg border border-white/30 backdrop-blur-md'
                  }`}
                  style={template.cardCornerStyle === 'sharp' ? { borderRadius: '0px' } : undefined}
                >
                  <div className="flex flex-col items-center">
                    {template.showCodeLabel && (
                      <span className="text-[7.5px] block opacity-75 font-sans mb-0.5">اسم المستخدم</span>
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
                      <div className="w-px h-5 bg-white/20"></div>
                      <div className="flex flex-col items-center">
                        {template.showCodeLabel && (
                          <span className="text-[7.5px] block opacity-75 font-sans mb-0.5">كلمة المرور</span>
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
              className={`text-center mt-1 font-mono opacity-80 ${getElementFontSizeClass('instructions', 'text-[7.5px]')}`}
              style={getElementStyle('instructions')}
            >
              {cleanInstructions}
            </div>
          )}
        </div>

        {/* Footer Row */}
        <div className="flex items-end justify-between mt-auto pt-0.5 gap-1.5 border-t border-white/10">
          {renderDraggable(
            'footerLeft',
            <div className="flex flex-col gap-0.5">
              {template.showSerial && serial && (
                <span
                  className={`font-mono opacity-90 font-bold tracking-tight ${getElementFontSizeClass('serial', 'text-[8px]')}`}
                  style={getElementStyle('serial')}
                >
                  SN: #{serial}
                </span>
              )}
              {template.showSupportPhone && supportPhone && (
                <span
                  className={`font-medium opacity-90 flex items-center gap-0.5 ${getElementFontSizeClass('supportPhone', 'text-[7.5px]')}`}
                  style={getElementStyle('supportPhone')}
                >
                  <Phone className="w-2 h-2 shrink-0" />
                  <span>دعم: {supportPhone}</span>
                </span>
              )}
              {template.showPrintDate && (
                <span
                  className={`opacity-75 font-mono flex items-center gap-0.5 ${getElementFontSizeClass('printDate', 'text-[7.5px]')}`}
                  style={getElementStyle('printDate')}
                >
                  <Calendar className="w-2 h-2 shrink-0" />
                  <span>{new Date().toISOString().split('T')[0]}</span>
                </span>
              )}
            </div>
          )}

          {renderDraggable(
            'footerRight',
            <div className="flex gap-1.5 items-center">
              {template.showPrice && price !== undefined && (
                <span
                  className={`font-black bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/20 shadow-xs text-[10px] sm:text-xs`}
                  style={getElementStyle('price')}
                >
                  {price} {currency}
                </span>
              )}
              {template.showQrCode && (
                <div
                  className={`p-0.5 rounded shadow-xs border border-white/20 ${
                    template.qrHasWhiteBg ? 'bg-white text-black' : 'bg-white/20 text-white'
                  }`}
                  style={template.cardCornerStyle === 'sharp' ? { borderRadius: '0px' } : undefined}
                >
                  <QrCode
                    className="w-5 h-5 sm:w-6 sm:h-6"
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
