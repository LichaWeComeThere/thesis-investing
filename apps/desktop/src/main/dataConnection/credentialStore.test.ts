import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCredentialStore, type CredentialEncryption } from './credentialStore';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

// Deliberately synthetic reversible bytes, not a native OS encryption test.
function fakeEncryption(): CredentialEncryption {
  return {
    isAvailable: vi.fn(() => true),
    encrypt: vi.fn((value: string) => Buffer.from([0xa5, ...Buffer.from(value).map((byte) => byte ^ 0xff)])),
    decrypt: vi.fn((value: Buffer) => {
      if (value[0] !== 0xa5) throw new Error('synthetic provider exception');
      return Buffer.from(value.subarray(1).map((byte) => byte ^ 0xff)).toString();
    })
  };
}

describe('encrypted credential store', () => {
  let directory: string;
  let encryption: CredentialEncryption;
  const syntheticKey = 'fixture-only-secret-123';
  const keyPath = () => join(directory, 'api-key.enc');
  const create = () => createCredentialStore({ directory, encryption });

  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), 'thesis-credentials-'));
    encryption = fakeEncryption();
    vi.mocked(fs.rename).mockClear();
  });

  afterEach(async () => {
    await fs.rm(directory, { force: true, recursive: true });
  });

  it('persists only encrypted bytes, exposes status without the key, and reopens', async () => {
    const store = create();
    await expect(store.status()).resolves.toBe('not-configured');
    await expect(store.readKey()).resolves.toBeNull();
    await store.storeKey(syntheticKey);
    const bytes = await fs.readFile(keyPath());
    expect(bytes.includes(Buffer.from(syntheticKey))).toBe(false);
    expect(bytes[0]).toBe(0xa5);
    expect(await fs.readdir(directory)).toEqual(['api-key.enc']);
    await expect(create().status()).resolves.toBe('configured');
    await expect(create().readKey()).resolves.toBe(syntheticKey);
    if (process.platform !== 'win32') {
      expect((await fs.stat(directory)).mode & 0o777).toBe(0o700);
      expect((await fs.stat(keyPath())).mode & 0o777).toBe(0o600);
    }
  });

  it('atomically replaces a key and preserves it when encryption or round-trip decryption fails', async () => {
    const store = create();
    await store.storeKey(syntheticKey);
    const original = await fs.readFile(keyPath());
    vi.mocked(encryption.encrypt).mockImplementationOnce(() => { throw new Error(syntheticKey); });
    await expect(store.storeKey('fixture-replacement')).rejects.toMatchObject({ message: 'secure-storage-unavailable' });
    expect(await fs.readFile(keyPath())).toEqual(original);
    vi.mocked(encryption.decrypt).mockImplementationOnce(() => { throw new Error(syntheticKey); });
    await expect(store.storeKey('fixture-replacement')).rejects.toMatchObject({ message: 'secure-storage-unavailable' });
    expect(await fs.readFile(keyPath())).toEqual(original);
    await store.storeKey('fixture-replacement');
    await expect(store.readKey()).resolves.toBe('fixture-replacement');
    expect(await fs.readdir(directory)).toEqual(['api-key.enc']);
  });

  it('keeps the previous encrypted file and removes temporary material after a failed replacement', async () => {
    const store = create();
    await store.storeKey(syntheticKey);
    const original = await fs.readFile(keyPath());
    vi.mocked(fs.rename).mockRejectedValueOnce(new Error(`filesystem failure ${syntheticKey}`));
    await expect(store.storeKey('fixture-replacement')).rejects.toMatchObject({ message: 'credential-storage' });
    expect(await fs.readFile(keyPath())).toEqual(original);
    expect(await fs.readdir(directory)).toEqual(['api-key.enc']);
    await expect(store.readKey()).resolves.toBe(syntheticKey);
  });

  it('refuses unavailable encryption without plaintext fallback and allows removal', async () => {
    const store = create();
    await store.storeKey(syntheticKey);
    vi.mocked(encryption.isAvailable).mockReturnValue(false);
    await expect(store.status()).resolves.toBe('unavailable');
    await expect(store.readKey()).rejects.toMatchObject({ code: 'secure-storage-unavailable' });
    await expect(store.storeKey('fixture-replacement')).rejects.toMatchObject({ code: 'secure-storage-unavailable' });
    await store.remove();
    await store.remove();
    expect(await fs.readdir(directory)).toEqual([]);
    vi.mocked(encryption.isAvailable).mockReturnValue(true);
    await expect(store.status()).resolves.toBe('not-configured');
  });

  it('reports a failed decrypt as unavailable without exposing the raw exception or secret', async () => {
    const store = create();
    await store.storeKey(syntheticKey);
    vi.mocked(encryption.decrypt).mockImplementation(() => { throw new Error(syntheticKey); });
    await expect(store.status()).resolves.toBe('unavailable');
    await expect(store.readKey()).rejects.toMatchObject({ name: 'CredentialStoreError', message: 'secure-storage-unavailable' });
    try {
      await store.readKey();
    } catch (error) {
      expect(String(error)).not.toContain(syntheticKey);
      expect(error).not.toHaveProperty('cause');
    }
  });

  it('rejects blank, whitespace, control, non-ASCII, and oversized keys before writing', async () => {
    const store = create();
    for (const value of ['', 'key with space', 'key\n', '\u0000', '\u00e9', 'x'.repeat(257)]) {
      await expect(store.storeKey(value)).rejects.toMatchObject({ code: 'invalid-key' });
    }
    expect(encryption.encrypt).not.toHaveBeenCalled();
    expect(await fs.readdir(directory)).toEqual([]);
    await store.storeKey('x'.repeat(256));
    await expect(store.status()).resolves.toBe('configured');
  });

  it('rejects empty, malformed, oversized, and non-file encrypted records with bounded reads', async () => {
    const store = create();
    await fs.writeFile(keyPath(), Buffer.alloc(0));
    await expect(store.status()).resolves.toBe('unavailable');
    await fs.writeFile(keyPath(), 'invalid envelope');
    await expect(store.status()).resolves.toBe('unavailable');
    vi.mocked(encryption.decrypt).mockClear();
    await fs.writeFile(keyPath(), Buffer.alloc(16 * 1024 + 1));
    await expect(store.status()).resolves.toBe('unavailable');
    expect(encryption.decrypt).not.toHaveBeenCalled();
    await fs.unlink(keyPath());
    await fs.mkdir(keyPath());
    await expect(store.status()).resolves.toBe('unavailable');
  });

  it('does not replace a key with empty or oversized encrypted output', async () => {
    const store = create();
    await store.storeKey(syntheticKey);
    const original = await fs.readFile(keyPath());
    for (const encrypted of [Buffer.alloc(0), Buffer.alloc(16 * 1024 + 1)]) {
      vi.mocked(encryption.encrypt).mockReturnValueOnce(encrypted);
      await expect(store.storeKey('fixture-replacement')).rejects.toMatchObject({ code: 'secure-storage-unavailable' });
      expect(await fs.readFile(keyPath())).toEqual(original);
    }
  });

  it('serializes concurrent save, remove, and read across reopened instances in invocation order', async () => {
    const first = create();
    const second = create();
    const operations = [
      first.storeKey('fixture-first'),
      second.remove(),
      first.status(),
      second.storeKey('fixture-second'),
      first.readKey()
    ];
    const results = await Promise.all(operations);
    expect(results).toEqual([undefined, undefined, 'not-configured', undefined, 'fixture-second']);
    await expect(create().readKey()).resolves.toBe('fixture-second');
    expect(await fs.readdir(directory)).toEqual(['api-key.enc']);
  });

  it('sanitizes native availability failures and recovers after a rejected operation', async () => {
    const store = create();
    vi.mocked(encryption.isAvailable).mockImplementationOnce(() => { throw new Error(syntheticKey); });
    await expect(store.storeKey(syntheticKey)).rejects.toMatchObject({ message: 'secure-storage-unavailable' });
    await store.storeKey(syntheticKey);
    await expect(store.readKey()).resolves.toBe(syntheticKey);
  });
});
