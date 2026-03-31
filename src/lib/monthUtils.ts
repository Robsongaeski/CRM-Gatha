export function toMonthStart(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function getCurrentMonthStart(referenceDate: Date = new Date()): string {
  return toMonthStart(referenceDate);
}

export function getPreviousMonthStart(referenceDate: Date = new Date()): string {
  const previousMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  return toMonthStart(previousMonth);
}

export function getNextMonthStart(monthStart: string): string {
  const [yearStr, monthStr] = monthStart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error(`Mes inválido: ${monthStart}`);
  }

  if (month === 12) {
    return `${year + 1}-01-01`;
  }

  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}
