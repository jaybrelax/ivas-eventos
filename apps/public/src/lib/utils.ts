import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDescription(text: string): string {
  if (!text) return "";

  // Extrair imagens markdown ![alt](url) antes do escape HTML
  const imagePlaceholders: string[] = [];
  let processed = text.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, url) => {
    const cleanUrl = url.trim();
    const cleanAlt = alt.trim() || "Imagem do evento";
    const index = imagePlaceholders.length;
    imagePlaceholders.push(
      `<img src="${cleanUrl}" alt="${cleanAlt}" class="rounded-2xl my-4 w-full max-h-[500px] object-cover shadow-md border border-gray-100/80 hover:shadow-lg transition-shadow" />`
    );
    return `___IMG_PLACEHOLDER_${index}___`;
  });

  processed = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  // Restaurar as tags <img>
  imagePlaceholders.forEach((imgHtml, index) => {
    processed = processed.replace(`___IMG_PLACEHOLDER_${index}___`, imgHtml);
  });

  return processed;
}
