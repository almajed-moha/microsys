/**
 * Local date and time utilities to prevent UTC timezone boundary shifts
 * (e.g., UTC+3 Yemen/Arabia midnight discrepancies between yesterday and today)
 */

export function getLocalDateString(dateInput?: Date | string | number | null): string {
  if (!dateInput) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dateObj = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(dateObj.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const d = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateString(baseDate?: Date | string | number | null): string {
  const base = baseDate ? new Date(baseDate) : new Date();
  if (isNaN(base.getTime())) {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return getLocalDateString(now);
  }
  const d = new Date(base);
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

export function getDaysAgoDateString(daysAgo: number, baseDate?: Date | string | number | null): string {
  const base = baseDate ? new Date(baseDate) : new Date();
  const d = isNaN(base.getTime()) ? new Date() : new Date(base);
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
}

export function isSameLocalDay(
  d1?: Date | string | number | null,
  d2?: Date | string | number | null
): boolean {
  return getLocalDateString(d1) === getLocalDateString(d2);
}

export function formatLocalDateToHuman(dateStr: string): string {
  if (!dateStr) return '';
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  if (dateStr === today) return `اليوم (${dateStr})`;
  if (dateStr === yesterday) return `أمس (${dateStr})`;
  return dateStr;
}
