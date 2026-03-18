import { clsx } from 'clsx';

export function cn(...classes: Array<string | false | null | undefined>) {
  return clsx(classes);
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value);
}
