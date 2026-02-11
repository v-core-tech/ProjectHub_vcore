import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(value: number) {
  const formatter = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

export function extractDomain(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function downloadCsv(filename: string, rows: string[][]) {
  const escape = (value: string) => {
    if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
      return `"${value.replace(/\"/g, '""')}"`;
    }
    return value;
  };
  const content = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
