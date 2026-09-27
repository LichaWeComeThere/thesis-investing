import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, mkdir, open, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface CredentialStore {
  status(): Promise<'configured' | 'not-configured' | 'unavailable'>;
  /** Main-process use only. Never expose the returned credential through IPC. */
  readKey(): Promise<string | null>;
  storeKey(key: string): Promise<void>;
  remove(): Promise<void>;
}

export interface CredentialEncryption {
  isAvailable(): boolean;
  encrypt(value: string): Buffer;
  decrypt(value: Buffer): string;
}

export type CredentialStoreErrorCode = 'invalid-key' | 'secure-storage-unavailable' | 'credential-storage';

/** Deliberately excludes raw filesystem/encryption exceptions and their causes. */
export class CredentialStoreError extends Error {
  constructor(readonly code: CredentialStoreErrorCode) {
    super(code);
    this.name = 'CredentialStoreError';
  }
}

const MAX_KEY_BYTES = 256;
const MAX_ENCRYPTED_BYTES = 16 * 1024;
// Shared by stores opened for the same file in this process. A reopened store
// cannot race a previous instance's pending save or removal.
const operations = new Map<string, Promise<void>>();

function serialize<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const previous = operations.get(path) ?? Promise.resolve();
  const result = previous.then(operation);
  const settled = result.then(() => undefined, () => undefined);
  operations.set(path, settled);
  void settled.then(() => {
    if (operations.get(path) === settled) operations.delete(path);
  });
  return result;
}

function validKey(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_KEY_BYTES && /^[\x21-\x7e]+$/.test(value);
}

function missing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

export function createCredentialStore({ directory, encryption }: {
  directory: string;
  encryption: CredentialEncryption;
}): CredentialStore {
  const privateDirectory = resolve(directory);
  const path = join(privateDirectory, 'api-key.enc');

  function requireEncryption(): void {
    try {
      if (encryption.isAvailable()) return;
    } catch { /* The platform error may contain sensitive details. */ }
    throw new CredentialStoreError('secure-storage-unavailable');
  }

  async function readEncrypted(): Promise<Buffer | null> {
    // Reject symlinks where the platform supports O_NOFOLLOW. Only a fixed,
    // internally selected filename is ever opened; IPC accepts no file paths.
    let handle;
    try {
      handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    } catch (error) {
      if (missing(error)) return null;
      throw new CredentialStoreError('credential-storage');
    }
    try {
      const metadata = await handle.stat();
      if (!metadata.isFile() || metadata.size === 0 || metadata.size > MAX_ENCRYPTED_BYTES) {
        throw new CredentialStoreError('credential-storage');
      }
      // A bounded read also protects against a file growing after stat().
      const bytes = Buffer.alloc(MAX_ENCRYPTED_BYTES + 1);
      let length = 0;
      while (length < bytes.length) {
        const result = await handle.read(bytes, length, bytes.length - length, null);
        if (result.bytesRead === 0) break;
        length += result.bytesRead;
      }
      if (length === 0 || length > MAX_ENCRYPTED_BYTES) throw new CredentialStoreError('credential-storage');
      return bytes.subarray(0, length);
    } catch {
      throw new CredentialStoreError('credential-storage');
    } finally {
      await handle.close().catch(() => undefined);
    }
  }

  async function readKey(): Promise<string | null> {
    requireEncryption();
    const encrypted = await readEncrypted();
    if (encrypted === null) return null;
    try {
      const value = encryption.decrypt(encrypted);
      if (!validKey(value)) throw new Error();
      return value;
    } catch {
      throw new CredentialStoreError('secure-storage-unavailable');
    }
  }

  return {
    status: () => serialize(path, async () => {
      try {
        return await readKey() === null ? 'not-configured' : 'configured';
      } catch {
        return 'unavailable';
      }
    }),
    readKey: () => serialize(path, readKey),
    storeKey: (key) => serialize(path, async () => {
      if (!validKey(key)) throw new CredentialStoreError('invalid-key');
      requireEncryption();
      let encrypted: Buffer;
      try {
        encrypted = encryption.encrypt(key);
        if (!Buffer.isBuffer(encrypted) || encrypted.length === 0 || encrypted.length > MAX_ENCRYPTED_BYTES || encryption.decrypt(encrypted) !== key) {
          throw new Error();
        }
      } catch {
        throw new CredentialStoreError('secure-storage-unavailable');
      }

      const temporaryPath = join(privateDirectory, `.api-key-${randomUUID()}.tmp`);
      try {
        await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
        await chmod(privateDirectory, 0o700);
        const handle = await open(temporaryPath, 'wx', 0o600);
        try {
          await handle.writeFile(encrypted);
          await handle.sync();
        } finally {
          await handle.close();
        }
        // The previous credential remains intact until the complete encrypted
        // replacement is ready. A failure never falls back to plaintext.
        await rename(temporaryPath, path);
      } catch {
        throw new CredentialStoreError('credential-storage');
      } finally {
        await unlink(temporaryPath).catch(() => undefined);
      }
    }),
    remove: () => serialize(path, async () => {
      // Removal must remain possible when native decryption is unavailable.
      try {
        await unlink(path);
      } catch (error) {
        if (!missing(error)) throw new CredentialStoreError('credential-storage');
      }
    })
  };
}
