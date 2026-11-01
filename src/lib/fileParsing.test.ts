import { describe, it, expect } from 'vitest';
import {
  getExtension,
  isVideoFile,
  isSubtitleFile,
  stripExtension,
  parseFileName,
  buildFolderName,
  parseSubtitleLanguage,
  subtitleMatchesVideo,
} from '@/lib/fileParsing';

describe('getExtension', () => {
  it('returns lowercase extension', () => {
    expect(getExtension('movie.MKV')).toBe('mkv');
  });
  it('returns empty string for no extension', () => {
    expect(getExtension('noext')).toBe('');
  });
});

describe('isVideoFile / isSubtitleFile', () => {
  it('detects video files', () => {
    expect(isVideoFile('movie.mp4')).toBe(true);
    expect(isVideoFile('movie.txt')).toBe(false);
  });
  it('detects subtitle files', () => {
    expect(isSubtitleFile('movie.srt')).toBe(true);
    expect(isSubtitleFile('movie.mp4')).toBe(false);
  });
});

describe('stripExtension', () => {
  it('removes extension', () => {
    expect(stripExtension('The.Matrix.1999.mp4')).toBe('The.Matrix.1999');
  });
  it('returns input when no extension', () => {
    expect(stripExtension('filename')).toBe('filename');
  });
});

describe('parseFileName', () => {
  it('parses a movie with year', () => {
    const r = parseFileName('The.Matrix.1999.1080p.BluRay.x264.mkv');
    expect(r.mediaType).toBe('movie');
    expect(r.titleGuess).toContain('The Matrix');
    expect(r.yearGuess).toBe(1999);
    expect(r.confident).toBe(true);
  });


  it('strips download site names and release tags from movie titles', () => {
    const r = parseFileName('Inception.2010.1080p.BluRay.x265-DownloadSite.mkv');
    expect(r.titleGuess).toBe('Inception');
    expect(r.yearGuess).toBe(2010);
  });

  it('strips MyMovies branding and similar release-site suffixes', () => {
    const myMovies = parseFileName('The.Matrix.1999.1080p.BluRay.x264-MyMovies.mkv');
    expect(myMovies.titleGuess).toBe('The Matrix');
    expect(myMovies.yearGuess).toBe(1999);

    const branded = parseFileName('Inception.2010.WEB-DL.MyMovies.com.mkv');
    expect(branded.titleGuess).toBe('Inception');
    expect(branded.yearGuess).toBe(2010);

    const otherSite = parseFileName('Interstellar.2014.1080p-Filmyzilla.mkv');
    expect(otherSite.titleGuess).toBe('Interstellar');
  });

  it('strips website suffixes without losing the original title', () => {
    const r = parseFileName('The.Matrix.1999.1080p.www.example.com.mkv');
    expect(r.titleGuess).toBe('The Matrix');
    expect(r.yearGuess).toBe(1999);
  });

  it('parses a series episode with S01E05', () => {
    const r = parseFileName('Breaking.Bad.S01E05.720p.WEB-DL.mkv');
    expect(r.mediaType).toBe('episode');
    expect(r.seasonGuess).toBe(1);
    expect(r.episodeGuess).toBe(5);
    expect(r.titleGuess).toContain('Breaking Bad');
  });

  it('parses a series with season only', () => {
    const r = parseFileName('Game.of.Thrones.S03.1080p.mkv');
    expect(r.mediaType).toBe('series');
    expect(r.seasonGuess).toBe(3);
  });

  it('parses episode-only as episode', () => {
    const r = parseFileName('Show.E12.mkv');
    expect(r.mediaType).toBe('episode');
    expect(r.episodeGuess).toBe(12);
  });

  it('extracts language tag', () => {
    const r = parseFileName('The.Matrix.1999.fa.mkv');
    expect(r.language).toBe('fa');
  });

  it('strips MyMoviz and yts.mx branding', () => {
    for (const suffix of ['MyMoviz', 'yts.mx']) {
      const parsed = parseFileName(`The.Matrix.1999.1080p.${suffix}.mkv`);
      expect(parsed.titleGuess).toBe('The Matrix');
      expect(parsed.yearGuess).toBe(1999);
    }
  });

  it('removes punctuation noise and double spelling variants', () => {
    for (const suffix of ['double', 'doble', 'duble', 'dobbed', 'dubbed', 'fsrsi', 'farsi', 'sanig', 'web-rib', 'hardsub']) {
      const parsed = parseFileName(`The.Matrix.1999.@$#&£_${suffix}.mkv`);
      expect(parsed.titleGuess).toBe('The Matrix');
      expect(parsed.yearGuess).toBe(1999);
    }
  });

  it('marks very short titles as not confident', () => {
    const r = parseFileName('x.720p.mkv');
    expect(r.confident).toBe(false);
  });
});

describe('buildFolderName', () => {
  it('builds folder name with year', () => {
    expect(buildFolderName('The Matrix', 1999)).toBe('The Matrix (1999)');
  });
  it('builds folder name without year', () => {
    expect(buildFolderName('Inception')).toBe('Inception');
  });
  it('removes illegal characters', () => {
    expect(buildFolderName('A:B/C', 2020)).toBe('ABC (2020)');
  });
});

describe('parseSubtitleLanguage', () => {
  it('extracts fa', () => {
    expect(parseSubtitleLanguage('The.Matrix.1999.fa.srt')).toBe('fa');
  });
  it('returns undefined when no tag', () => {
    expect(parseSubtitleLanguage('The.Matrix.1999.srt')).toBeUndefined();
  });
});

describe('subtitleMatchesVideo', () => {
  it('matches prefix', () => {
    expect(subtitleMatchesVideo('The.Matrix.1999.fa.srt', 'The.Matrix.1999.mkv')).toBe(true);
  });
  it('rejects unrelated', () => {
    expect(subtitleMatchesVideo('Inception.srt', 'The.Matrix.mkv')).toBe(false);
  });
});
