import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM d, yyyy HH:mm");
  } catch (e) {
    return dateString;
  }
}

export function getAlgorithmColor(algo: string | null | undefined) {
  switch (algo) {
    case 'AES-256': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'RSA': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Caesar': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Vigenere': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'RailFence': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'SHA256': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'HybridAES-RSA': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}
