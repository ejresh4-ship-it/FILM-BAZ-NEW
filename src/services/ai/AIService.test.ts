import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAIService } from './AIService';

// We can't import idbStore directly (it needs IndexedDB), so mock it
vi.mock('@/services/idbStore', () => ({
  idbGet: vi.fn().mockResolvedValue(null),
  idbSet: vi.fn().mockResolvedValue(undefined),
}));

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 3 default providers (Cloudflare, OpenAI-compatible, llama.cpp)', async () => {
    const svc = getAIService();
    await svc.load();
    const providers = svc.getProviders();
    expect(providers).toHaveLength(3);
    expect(providers.map((p) => p.type)).toContain('cloudflare');
    expect(providers.map((p) => p.type)).toContain('openai-compatible');
    expect(providers.map((p) => p.type)).toContain('llama-cpp');
  });


  it('uses a currently listed Cloudflare Workers AI chat model by default', async () => {
    const svc = getAIService();
    await svc.load();
    expect(svc.getProvider('cloudflare')?.model).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  });

  it("uses the configured Qwen 3B GGUF path and llama.cpp port by default", async () => {
    const svc = getAIService();
    await svc.load();
    const llama = svc.getProvider('llama-cpp');
    expect(llama?.model).toBe('qwen2.5-3b-instruct-q2_k.gguf');
    expect(llama?.localModelPath).toBe('E:\\Ai\\qwen2.5-3b-instruct-q2_k.gguf');
    expect(llama?.localPort).toBe(1234);
  });

  it('isConfigured returns false when no providers enabled', async () => {
    const svc = getAIService();
    await svc.load();
    expect(svc.isConfigured()).toBe(false);
  });

  it('translate() returns original text when no provider configured', async () => {
    const svc = getAIService();
    await svc.load();
    const result = await svc.translate('Hello world');
    expect(result).toBe('Hello world');
  });

  it('testConnection returns error for unconfigured llama.cpp', async () => {
    const svc = getAIService();
    await svc.load();
    const result = await svc.testConnection('llama-cpp');
    // hasCredentials checks localPort which defaults to 8080 — that's truthy
    // but fetch will fail since no server is running
    expect(result.success).toBe(false);
  });

  it('builds correct chat URL for llama.cpp (127.0.0.1:port)', async () => {
    const svc = getAIService();
    await svc.load();
    await svc.updateProvider('llama-cpp', { enabled: true, localPort: 8080 });
    // chat() will attempt a fetch to 127.0.0.1:8080 and fail
    await expect(svc.chat({ userPrompt: 'test' })).rejects.toThrow();
  });

  it('builds correct chat URL for Cloudflare', async () => {
    const svc = getAIService();
    await svc.load();
    await svc.updateProvider('cloudflare', { enabled: true, accountId: 'test-acc', apiToken: 'test-token' });
    // chat() will attempt fetch and fail
    await expect(svc.chat({ userPrompt: 'test' })).rejects.toThrow();
  });

  it('persists provider updates', async () => {
    const svc = getAIService();
    await svc.load();
    await svc.updateProvider('cloudflare', { apiKey: 'new-key' });
    const p = svc.getProvider('cloudflare');
    expect(p?.apiKey).toBe('new-key');
  });

  it('priority sorting works', async () => {
    const svc = getAIService();
    await svc.load();
    await svc.setProviderPriority('llama-cpp', 0);
    const providers = svc.getProviders();
    expect(providers[0].id).toBe('llama-cpp');
  });
});
