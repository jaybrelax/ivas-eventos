import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEventDate(dateStr: string): string {
  if (!dateStr) return "";
  const [datePart] = dateStr.split('T');
  if (!datePart) return "";
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}
