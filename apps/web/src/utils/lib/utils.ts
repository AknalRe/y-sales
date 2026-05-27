import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Menggabungkan beberapa className menjadi satu string,
 * otomatis mengelola duplikasi dan konflik class menggunakan tailwind-merge & clsx.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




