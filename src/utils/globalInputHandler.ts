export function setupGlobalNumericInputs() {
  if (typeof window === 'undefined') return;
  
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (target && target.tagName === 'INPUT' && target.inputMode === 'decimal') {
      const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      
      let str = target.value;
      let originalStr = str;
      
      // Convert Arabic/Persian
      for (let i = 0; i < 10; i++) {
        str = str.replace(new RegExp(arabicNumbers[i], 'g'), i.toString());
        str = str.replace(new RegExp(persianNumbers[i], 'g'), i.toString());
      }
      
      // Remove non-numeric except dot
      str = str.replace(/[^0-9.]/g, '');
      
      // Prevent multiple dots
      const parts = str.split('.');
      if (parts.length > 2) {
        str = parts[0] + '.' + parts.slice(1).join('');
      }

      if (str !== originalStr) {
        // Update input directly and trigger React's synthetic event
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
           nativeInputValueSetter.call(target, str);
           target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  }, { capture: true });
}
