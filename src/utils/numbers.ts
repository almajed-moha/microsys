export function parseLocalizedNumber(value: string | number): string {
  if (value === null || value === undefined) return '';
  let str = value.toString();
  // Convert Arabic/Persian digits to English
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(arabicNumbers[i], 'g'), i.toString());
    str = str.replace(new RegExp(persianNumbers[i], 'g'), i.toString());
  }
  
  // Remove any non-numeric characters except dot
  str = str.replace(/[^0-9.]/g, '');
  
  // Ensure only one dot
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }
  
  return str;
}

export function sanitizeNumericInput(value: string): number | '' {
  const parsed = parseLocalizedNumber(value);
  if (parsed === '') return '';
  const num = parseFloat(parsed);
  return isNaN(num) ? '' : num;
}
