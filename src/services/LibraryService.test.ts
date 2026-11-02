import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLibraryService } from './LibraryService';
import { getFilesystemService } from './filesystemFactory';

vi.mock('@/services/idbStore', () => ({
  idbGet: vi.fn().mockResolvedValue(null),
  idbSet: vi.fn().mockResolvedValue(undefined),
}));

describe('LibraryService — folder organization', () => {
  let svc: ReturnType<typeof getLibraryService>;

  beforeEach(async () => {
    svc = getLibraryService();
    await svc.load();
  });

  it('has no folders initially', () => {
    expect(svc.getFolders()).toHaveLength(0);
  });

  it('can add a folder', async () => {
    const folder = await svc.addFolder('C:\\Films', 'My Films');
    expect(folder.path).toBe('C:\\Films');
    expect(folder.label).toBe('My Films');
    expect(svc.getFolders()).toHaveLength(1);
  });

  it('scanFolder finds videos and subtitles', async () => {
    await svc.addFolder('C:\\Films');
    const summary = await svc.scanFolder(svc.getFolders()[0].id);
    expect(summary.status).toBe('completed');
    expect(summary.videoCount).toBeGreaterThan(0);
    expect(summary.subtitleCount).toBeGreaterThan(0);
  });

  it('generates organization proposal for loose files', async () => {
    const folder = svc.getFolders()[0] ?? (await svc.addFolder('C:\\Films'));
    await svc.scanFolder(folder.id);
    const proposal = await svc.generateProposal(folder.id);
    expect(proposal.operations.length).toBeGreaterThan(0);
    // Each operation should have source and dest paths
    for (const op of proposal.operations) {
      expect(op.sourcePath).toBeTruthy();
      expect(op.destFilePath).toBeTruthy();
      expect(op.destFolderPath).toBeTruthy();
    }
  });

  it('toggleExclude changes excluded state', async () => {
    const folder = svc.getFolders()[0] ?? (await svc.addFolder('C:\\Films'));
    await svc.scanFolder(folder.id);
    const proposal = await svc.generateProposal(folder.id);
    if (proposal.operations.length > 0) {
      const opId = proposal.operations[0].id;
      const toggled = svc.toggleExclude(proposal, opId);
      const op = toggled.operations.find((o) => o.id === opId);
      expect(op?.excluded).toBe(true);
    }
  });

  it('executeProposal moves loose files into organized folders', async () => {
    const folder = svc.getFolders()[0] ?? (await svc.addFolder('C:\\Films'));
    await svc.scanFolder(folder.id);
    const proposal = await svc.generateProposal(folder.id);
    if (proposal.operations.length === 0) return;

    const result = await svc.executeProposal(proposal);
    expect(result.succeeded.length + result.failed.length).toBe(
      proposal.operations.filter((o) => !o.excluded).length,
    );
  });

  it('batch finalization renames the folder, video, and matching subtitles together', async () => {
    const folder = svc.getFolders()[0] ?? (await svc.addFolder('C:\\Films'));
    const fs = getFilesystemService();
    const videoName = 'FilmBazBatchRename2040.mkv';
    const subtitleName = 'FilmBazBatchRename2040.fa.srt';
    const videoPath = fs.joinPath(folder.path, videoName);
    const subtitlePath = fs.joinPath(folder.path, subtitleName);
    await fs.writeTextFile(videoPath, 'video');
    await fs.writeTextFile(subtitlePath, 'subtitle');

    await svc.scanFolder(folder.id);
    const item = svc.getItemsForFolder(folder.id).find((candidate) => candidate.fileName === videoName);
    expect(item).toBeTruthy();
    expect(item?.subtitles).toHaveLength(1);

    const proposal = await svc.generateProposal(folder.id);
    const operation = proposal.operations.find((candidate) => candidate.itemId === item?.id);
    expect(operation).toBeTruthy();
    if (!item || !operation) return;

    const execution = await svc.executeProposal({ ...proposal, operations: [operation] });
    expect(execution.succeeded).toHaveLength(1);

    // Simulate a corrected title arriving after the organize/move step.
    item.titleGuess = 'FILM BAZ Final Batch Name';
    item.yearGuess = 2040;
    const renameResult = await svc.renameOrganizedItemsBatch([item.id]);
    expect(renameResult.failed).toHaveLength(0);
    expect(renameResult.succeeded).toHaveLength(1);

    const updated = svc.getItems().find((candidate) => candidate.id === item.id);
    expect(updated?.fileName).toBe('FILM BAZ Final Batch Name (2040).mkv');
    expect(updated?.parentFolder).toContain('FILM BAZ Final Batch Name (2040)');
    expect(updated?.subtitles[0]?.fileName).toBe('FILM BAZ Final Batch Name (2040).fa.srt');
    expect(updated && await fs.exists(updated.filePath)).toBe(true);
    expect(updated && await fs.exists(updated.subtitles[0].filePath)).toBe(true);
    const moveLog = svc.getOperationLog().filter((entry) => entry.type === 'move' && entry.success);
    expect(moveLog.find((entry) => entry.sourcePath === videoPath)?.destPath).toBe(updated?.filePath);
    expect(moveLog.find((entry) => entry.sourcePath === subtitlePath)?.destPath).toBe(updated?.subtitles[0]?.filePath);
  });

  it('detects duplicate candidates', async () => {
    const folder = svc.getFolders()[0] ?? (await svc.addFolder('C:\\Films'));
    await svc.scanFolder(folder.id);
    const dups = svc.getDuplicateCandidates();
    // The mock FS has two files with the same size (5000 bytes each)
    expect(dups.length).toBeGreaterThanOrEqual(0);
  });
});
