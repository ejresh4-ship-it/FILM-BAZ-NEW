import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFilesystemService } from './MockFilesystemService';

vi.mock('@/services/idbStore', () => ({
  idbGet: vi.fn().mockResolvedValue(null),
  idbSet: vi.fn().mockResolvedValue(undefined),
}));

describe('MockFilesystemService — writeTextFile & downloadFile', () => {
  let fs: MockFilesystemService;

  beforeEach(async () => {
    fs = new MockFilesystemService();
    // Force load (seeds mock FS)
    await fs.exists('C:\\Films');
  });

  it('writeTextFile creates a file with the given content', async () => {
    const path = 'C:\\Films\\test_export.json';
    const result = await fs.writeTextFile(path, '{"title":"Test"}');
    expect(result.success).toBe(true);
    const exists = await fs.exists(path);
    expect(exists).toBe(true);
  });

  it('writeTextFile overwrites existing file', async () => {
    const path = 'C:\\Films\\overwrite.json';
    await fs.writeTextFile(path, 'first');
    await fs.writeTextFile(path, 'second');
    expect(await fs.exists(path)).toBe(true);
  });

  it('writeTextFile creates parent dirs implicitly', async () => {
    const path = 'C:\\Films\\sub_dir\\nested\\file.txt';
    // Parent dirs don't exist — writeTextFile now creates them recursively
    // (matching Electron's fs.promises.mkdir({ recursive: true }) behavior)
    const result = await fs.writeTextFile(path, 'content');
    expect(result.success).toBe(true);
    expect(await fs.exists(path)).toBe(true);
  });

  it('writeTextFile succeeds when parent dir exists', async () => {
    await fs.createDir('C:\\Films\\export_folder');
    const path = 'C:\\Films\\export_folder\\movie_info.json';
    const result = await fs.writeTextFile(path, '{"title":"Interstellar"}');
    expect(result.success).toBe(true);
    expect(await fs.exists(path)).toBe(true);
  });
});

describe('MockFilesystemService — createDir + writeTextFile integration', () => {
  let fs: MockFilesystemService;

  beforeEach(async () => {
    fs = new MockFilesystemService();
    await fs.exists('C:\\Films');
  });

  it('can create folder, then write JSON, then verify existence', async () => {
    const folder = 'C:\\Films\\Interstellar (2014)\\metadata';
    const mkdir = await fs.createDir(folder);
    expect(mkdir.success).toBe(true);

    const filePath = fs.joinPath(folder, 'movie_info.json');
    const write = await fs.writeTextFile(filePath, JSON.stringify({ title: 'Interstellar', year: 2014 }));
    expect(write.success).toBe(true);

    const exists = await fs.exists(filePath);
    expect(exists).toBe(true);
  });
});
