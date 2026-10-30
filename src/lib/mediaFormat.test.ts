import { describe, it, expect } from 'vitest';
import { formatFileSize, formatTimestamp, mediaTypeLabel, identificationLabel } from '@/lib/mediaFormat';

describe('formatFileSize', () => {
  it('returns نامشخص for zero or negative', () => {
    expect(formatFileSize(0)).toBe('نامشخص');
    expect(formatFileSize(-1)).toBe('نامشخص');
  });
  it('formats bytes', () => {
    expect(formatFileSize(512)).toContain('بایت');
  });
  it('formats KB', () => {
    expect(formatFileSize(2048)).toContain('کیلوبایت');
  });
  it('formats MB', () => {
    expect(formatFileSize(10 * 1024 * 1024)).toContain('مگابایت');
  });
  it('formats GB', () => {
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toContain('گیگابایت');
  });
});

describe('formatTimestamp', () => {
  it('returns dash for zero', () => {
    expect(formatTimestamp(0)).toBe('—');
  });
  it('returns a string for a valid timestamp', () => {
    const result = formatTimestamp(Date.now());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(3);
  });
});

describe('mediaTypeLabel', () => {
  it('maps known types', () => {
    expect(mediaTypeLabel('movie')).toBe('فیلم');
    expect(mediaTypeLabel('series')).toBe('سریال');
    expect(mediaTypeLabel('episode')).toBe('قسمت');
    expect(mediaTypeLabel('unknown')).toBe('نامشخص');
  });
  it('passes through unknown strings', () => {
    expect(mediaTypeLabel('custom')).toBe('custom');
  });
});

describe('identificationLabel', () => {
  it('maps known statuses', () => {
    expect(identificationLabel('identified')).toBe('شناسایی‌شده');
    expect(identificationLabel('needs-review')).toBe('نیازمند بررسی');
    expect(identificationLabel('pending')).toBe('در انتظار');
  });
  it('passes through unknown strings', () => {
    expect(identificationLabel('other')).toBe('other');
  });
});
