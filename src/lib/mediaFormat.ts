import { toPersianDigits } from './movieUtils';

/** Format bytes as a human-readable Persian string. */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return 'نامشخص';
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(1))} کیلوبایت`;
  if (bytes < 1024 * 1024 * 1024) return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  return `${toPersianDigits((bytes / (1024 * 1024 * 1024)).toFixed(2))} گیگابایت`;
}

/** Format an epoch ms timestamp as a Persian date string. */
export function formatTimestamp(ms: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const date = d.toLocaleDateString('fa-IR');
  const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  return `${date} - ${time}`;
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  movie: 'فیلم',
  series: 'سریال',
  episode: 'قسمت',
  unknown: 'نامشخص',
};

export function mediaTypeLabel(type: string): string {
  return MEDIA_TYPE_LABELS[type] || type;
}

const ID_STATUS_LABELS: Record<string, string> = {
  identified: 'شناسایی‌شده',
  'needs-review': 'نیازمند بررسی',
  pending: 'در انتظار',
};

export function identificationLabel(status: string): string {
  return ID_STATUS_LABELS[status] || status;
}
