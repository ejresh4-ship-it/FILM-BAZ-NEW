import { describe, it, expect } from 'vitest';
import { getMovieById, pickRandom, formatRuntime, toPersianDigits } from '@/lib/movieUtils';
import type { Movie } from '@/types/movie';

const mockMovies: Movie[] = [
  { id: 'm1', title: 'فیلم اول', englishTitle: 'First Movie', year: 2020, runtime: 120, rating: 8, genres: ['اکشن'], category: 'movie', cast: [], synopsis: '', posterUrl: '' },
  { id: 'm2', title: 'فیلم دوم', englishTitle: 'Second Movie', year: 2021, runtime: 90, rating: 7, genres: ['درام'], category: 'movie', cast: [], synopsis: '', posterUrl: '' },
  { id: 'm3', title: 'سریال اول', englishTitle: 'First Series', year: 2019, runtime: 0, rating: 9, genres: ['هیجان'], category: 'series', cast: [], synopsis: '', posterUrl: '' },
];

describe('getMovieById', () => {
  it('finds a movie by id', () => {
    expect(getMovieById(mockMovies, 'm2')?.englishTitle).toBe('Second Movie');
  });
  it('returns undefined for unknown id', () => {
    expect(getMovieById(mockMovies, 'nope')).toBeUndefined();
  });
});

describe('pickRandom', () => {
  it('returns all items when count >= length', () => {
    const result = pickRandom(['a', 'b'], 5);
    expect(result).toHaveLength(2);
    expect(result).toContain('a');
    expect(result).toContain('b');
  });
  it('returns exactly count items with no duplicates', () => {
    const pool = Array.from({ length: 20 }, (_, i) => i);
    const result = pickRandom(pool, 5);
    expect(result).toHaveLength(5);
    expect(new Set(result).size).toBe(5);
  });
  it('handles empty array', () => {
    expect(pickRandom([], 3)).toEqual([]);
  });
});

describe('formatRuntime', () => {
  it('returns نامشخص for zero', () => {
    expect(formatRuntime(0)).toBe('نامشخص');
  });
  it('formats hours only', () => {
    expect(formatRuntime(120)).toBe('2 ساعت');
  });
  it('formats minutes only', () => {
    expect(formatRuntime(45)).toBe('45 دقیقه');
  });
  it('formats hours + minutes', () => {
    expect(formatRuntime(145)).toBe('2 ساعت و 25 دقیقه');
  });
});

describe('toPersianDigits', () => {
  it('converts number', () => {
    expect(toPersianDigits(42)).toBe('۴۲');
  });
  it('converts string with mixed digits', () => {
    expect(toPersianDigits('Item 3 of 10')).toBe('Item ۳ of ۱۰');
  });
  it('leaves non-digit strings unchanged', () => {
    expect(toPersianDigits('abc')).toBe('abc');
  });
});
