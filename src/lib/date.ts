export function toDateOnly(value: string): string {
  if (!value) return value;
  return value.includes('T') ? value.split('T')[0] : value;
}

export function parseDateOnly(value: string): Date {
  return new Date(`${toDateOnly(value)}T12:00:00`);
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateOnly(): string {
  return formatDateOnly(new Date());
}
