function padDatePart(value: number) {
  return `${value}`.padStart(2, '0');
}

export function normalizeDateToYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function isValidDateValue(date: Date) {
  return !Number.isNaN(date.getTime());
}

export function convertExcelSerialDateToISO(serial: number): string | null {
  if (!Number.isFinite(serial)) {
    return null;
  }

  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);
  if (!isValidDateValue(date)) {
    return null;
  }

  return normalizeDateToYYYYMMDD(date);
}

export function convertDateStringToISO(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00`);
    return isValidDateValue(date) ? normalizeDateToYYYYMMDD(date) : null;
  }

  const slashOrDash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashOrDash) {
    const first = Number(slashOrDash[1]);
    const second = Number(slashOrDash[2]);
    const year = Number(slashOrDash[3]);

    const candidates: Array<{ day: number; month: number }> = [];

    if (first > 12) {
      candidates.push({ day: first, month: second });
    } else if (second > 12) {
      candidates.push({ day: second, month: first });
    } else {
      candidates.push({ day: first, month: second });
      candidates.push({ day: second, month: first });
    }

    for (const candidate of candidates) {
      const date = new Date(year, candidate.month - 1, candidate.day);
      if (
        isValidDateValue(date) &&
        date.getFullYear() === year &&
        date.getMonth() === candidate.month - 1 &&
        date.getDate() === candidate.day
      ) {
        return normalizeDateToYYYYMMDD(date);
      }
    }

    return null;
  }

  const parsed = new Date(trimmed);
  if (!isValidDateValue(parsed)) {
    return null;
  }

  return normalizeDateToYYYYMMDD(parsed);
}

export function parseExcelDate(value: unknown): string | null {
  if (value instanceof Date) {
    return isValidDateValue(value) ? normalizeDateToYYYYMMDD(value) : null;
  }

  if (typeof value === 'number') {
    return convertExcelSerialDateToISO(value);
  }

  if (typeof value === 'string') {
    return convertDateStringToISO(value);
  }

  return null;
}
