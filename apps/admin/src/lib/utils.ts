import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').replace(/(^|\s)(\S)/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function formatEventDate(dateStr: string): string {
  if (!dateStr) return "";
  const [datePart] = dateStr.split('T');
  if (!datePart) return "";
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}
