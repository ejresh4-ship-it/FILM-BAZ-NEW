import type { Movie } from '@/types/movie';

export function getMovieById(movies: Movie[], id: string): Movie | undefined {
  return movies.find((movie) => movie.id === id);
}

// Picks up to `count` random entries from a list without duplication.
// Deterministic across a single app run so hero selection doesn't reshuffle
// on every interaction — only on a fresh app start or explicit re-roll.
export function pickRandom<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const pool = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

export function formatRuntime(minutes: number): string {
  if (!minutes) return 'نامشخص';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} دقیقه`;
  if (m === 0) return `${h} ساعت`;
  return `${h} ساعت و ${m} دقیقه`;
}

// Lightweight, dependency-free Persian digit converter for display labels.
export function toPersianDigits(value: number | string): string {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/\d/g, (d) => map[Number(d)]);
}
