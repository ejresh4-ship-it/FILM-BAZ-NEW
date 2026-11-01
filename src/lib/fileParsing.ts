// Conservative filename parsing for movie/series identification.
// These parsers are intentionally cautious: when a guess is uncertain,
// the item is marked "needs-review" rather than given a fabricated title.

import type { MediaType } from '@/types/media-library';

export const DEFAULT_VIDEO_EXTENSIONS = [
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'webm', 'mpeg', 'mpg', 'ts',
];

export const DEFAULT_SUBTITLE_EXTENSIONS = [
  'srt', 'ass', 'ssa', 'vtt', 'sub',
];

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

export function isVideoFile(fileName: string, exts: string[] = DEFAULT_VIDEO_EXTENSIONS): boolean {
  return exts.includes(getExtension(fileName));
}

export function isSubtitleFile(fileName: string, exts: string[] = DEFAULT_SUBTITLE_EXTENSIONS): boolean {
  return exts.includes(getExtension(fileName));
}

export function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(0, dot) : fileName;
}

export interface ParsedFilename {
  mediaType: MediaType;
  titleGuess?: string;
  yearGuess?: number;
  seasonGuess?: number;
  episodeGuess?: number;
  language?: string;
  confident: boolean; // false → needs review
}

// Patterns we recognize (dots, underscores, spaces act as separators).
const SEASON_EPISODE = /s(\d{1,2})\s*e(\d{1,3})/i;
const SEASON_ONLY = /s(\d{1,2})\b/i;
const EPISODE_ONLY = /e(\d{1,3})\b/i;
const YEAR = /\b(19[5-9]\d|20[0-3]\d)\b/;
const LANG_TAG = /\b(fa|per|fas|eng|en|ar|fre|ger|spa)\b/i;

// Quality/codec tags that should be stripped from the title.
const NOISE = new RegExp(
  String.raw`\b(1080p|1080i|720p|480p|2160p|4k|uhd|hd|web-dl|webrip|web|bluray|blu-ray|` +
    String.raw`brrip|bdrip|dvdrip|cam|ts|tc|hdrip|hdtv|remux|atmos|ddp|ddp5|` +
    String.raw`x264|x265|h264|h265|hevc|aac|ac3|mp3|dts|10bit|avc|dxva|` +
    String.raw`multi|dual|double|doble|duble|sub|subs|subtitle|custom|internal|proper|repack|extended|` +
    String.raw`unrated|directors|cut|imax|hybrid|crf|cf|nfo)\b`,
  'gi',
);

const SITE_OR_RELEASE_TAG = /(?:^|[ ._])(?:www\.)?[a-z0-9-]+\.(?:com|net|org|ir|co|to|io|tv)(?:\.[a-z]{2,})?(?:[ ._-].*)?$/i;
const BRACKETED_TAG = /\[[^\]]*(?:www\.|\.com|\.net|\.org|\b(?:rarbg|yts|yify|ettv|eztv|tgx|pahe|psa|ganool)\b)[^\]]*\]/ig;

function cleanTitle(raw: string): string {
  let t = raw.replace(BRACKETED_TAG, ' ').replace(/\bSITE DOMAIN\b/gi, ' ');
  t = t.replace(SITE_OR_RELEASE_TAG, ' ');
  t = t.replace(/(?:^|[ ._-])(?:mymovies|my[-_ ]?movies|yts|yify|rarbg|eztv|ettv|tgx|pahe|psa|ganool|galaxyrg|psarips|mkvcinemas|worldfree4u|filmyzilla|moviesmod|mkvhub)(?:$|[ ._-].*)/i, ' ');
  // Remove quality tags first, so a trailing group after x265/1080p becomes separable.
  t = t.replace(NOISE, ' ');
  t = t.replace(/(?:^|[ .])-[A-Z0-9][A-Z0-9._-]{1,}$/i, ' ');
  t = t.replace(/-(?:[A-Z][a-z0-9]+){2,}|-[A-Z0-9]{3,}$/, ' ');
  // Strip punctuation/symbol noise often appended by download sites, while keeping letters and digits.\n  t = t.replace(/[^\\p{L}\\p{N}\\s.-]/gu, ' ');\n  t = t.replace(/[._-]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  // Title-case
  if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

export function parseFileName(fileName: string): ParsedFilename {
  const base = stripExtension(fileName);
  const normalized = base
    .replace(/(?:www\.)?[a-z0-9-]+\.(?:com|net|org|ir|co|to|io|tv)(?:\.[a-z]{2,})?/ig, ' SITE DOMAIN ')
    .replace(/[._]/g, ' ');
  let work = normalized;

  // Season/Episode → series
  const seMatch = work.match(SEASON_EPISODE);
  const seasonMatch = seMatch ? null : work.match(SEASON_ONLY);
  const epOnlyMatch = seMatch ? null : seasonMatch ? null : work.match(EPISODE_ONLY);

  const yearMatch = work.match(YEAR);
  const langMatch = work.match(LANG_TAG);

  let mediaType: MediaType = 'movie';
  let season = 0;
  let episode = 0;
  let confident = true;

  if (seMatch) {
    mediaType = 'episode';
    season = parseInt(seMatch[1], 10);
    episode = parseInt(seMatch[2], 10);
    work = work.slice(0, seMatch.index ?? 0) + ' ' + work.slice((seMatch.index ?? 0) + seMatch[0].length);
  } else if (seasonMatch) {
    mediaType = 'series';
    season = parseInt(seasonMatch[1], 10);
    work = work.slice(0, seasonMatch.index ?? 0) + ' ' + work.slice((seasonMatch.index ?? 0) + seasonMatch[0].length);
  } else if (epOnlyMatch) {
    mediaType = 'episode';
    episode = parseInt(epOnlyMatch[1], 10);
    work = work.slice(0, epOnlyMatch.index ?? 0) + ' ' + work.slice((epOnlyMatch.index ?? 0) + epOnlyMatch[0].length);
  }

  // Year
  let year = 0;
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    work = work.slice(0, yearMatch.index ?? 0) + ' ' + work.slice((yearMatch.index ?? 0) + yearMatch[0].length);
  }

  // Language tag
  let language: string | undefined;
  if (langMatch) {
    const raw = langMatch[1].toLowerCase();
    language = ({ fa: 'fa', per: 'fa', fas: 'fa', eng: 'en', en: 'en', ar: 'ar', fre: 'fr', ger: 'de', spa: 'es' } as Record<string, string>)[raw];
    work = work.slice(0, langMatch.index ?? 0) + ' ' + work.slice((langMatch.index ?? 0) + langMatch[0].length);
  }

  // Strip noise tokens
  let title: string | undefined = cleanTitle(work);
  if (!title) {
    title = cleanTitle(base) || undefined;
  }

  // If the title is empty or just numbers, we can't identify it.
  if (!title || /^\d+$/.test(title)) {
    confident = false;
    title = undefined;
  }

  // A movie without a year and without clean tokens is uncertain.
  if (mediaType === 'movie' && year === 0 && title && title.length < 3) {
    confident = false;
  }

  return {
    mediaType,
    titleGuess: title,
    yearGuess: year || undefined,
    seasonGuess: season || undefined,
    episodeGuess: episode || undefined,
    language,
    confident,
  };
}

/** Build a proposed folder name like "The Matrix (1999)". */
export function buildFolderName(title: string, year?: number): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '').trim();
  return year ? `${safe} (${year})` : safe;
}

/** Extract language from a subtitle filename, e.g. "The.Matrix.1999.fa.srt" → "fa". */
export function parseSubtitleLanguage(fileName: string): string | undefined {
  const base = stripExtension(fileName);
  const langMatch = base.match(LANG_TAG);
  if (!langMatch) return undefined;
  const raw = langMatch[1].toLowerCase();
  return ({ fa: 'fa', per: 'fa', fas: 'fa', eng: 'en', en: 'en', ar: 'ar' } as Record<string, string>)[raw];
}

/** A subtitle matches a video if their stripped basenames overlap. */
export function subtitleMatchesVideo(subFileName: string, videoFileName: string): boolean {
  const subBase = stripExtension(subFileName).toLowerCase();
  const vidBase = stripExtension(videoFileName).toLowerCase();
  // e.g. "the matrix 1999 fa" contains "the matrix 1999"
  if (subBase.startsWith(vidBase)) return true;
  if (vidBase.startsWith(subBase)) return true;
  // fall back to token overlap (>= 70% of video tokens present in sub)
  const vidTokens = vidBase.split(/[ ._-]+/).filter(Boolean);
  const subTokens = subBase.split(/[ ._-]+/).filter(Boolean);
  if (vidTokens.length === 0) return false;
  const shared = vidTokens.filter((t) => subTokens.includes(t)).length;
  return shared / vidTokens.length >= 0.7;
}

function uid(): string {
  return 'mi_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4);
}

export { uid };
