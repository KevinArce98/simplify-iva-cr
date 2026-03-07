import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
  alg: 'aes-256-gcm';
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getMasterKeysFromEnv(): Record<string, Buffer> {
  const fromJson = process.env.ENCRYPTION_MASTER_KEYS_JSON;
  const fromVersionedEnv = Object.entries(process.env)
    .filter(([name, value]) => name.startsWith('MASTER_KEY_') && value)
    .map(([name, value]) => ({
      version: name.replace('MASTER_KEY_', '').toLowerCase(),
      value: value as string,
    }));

  const keyMap: Record<string, Buffer> = {};

  if (fromJson) {
    const parsed = JSON.parse(fromJson) as Record<string, string>;
    for (const [version, rawKey] of Object.entries(parsed)) {
      keyMap[version] = normalizeKey(rawKey);
    }
  }

  for (const keyEntry of fromVersionedEnv) {
    if (!(keyEntry.version in keyMap)) {
      keyMap[keyEntry.version] = normalizeKey(keyEntry.value);
    }
  }

  return keyMap;
}

function normalizeKey(rawKey: string): Buffer {
  if (rawKey.startsWith('base64:')) {
    const key = Buffer.from(rawKey.slice('base64:'.length), 'base64');
    return ensureKeyLength(key, rawKey);
  }

  if (rawKey.startsWith('hex:')) {
    const key = Buffer.from(rawKey.slice('hex:'.length), 'hex');
    return ensureKeyLength(key, rawKey);
  }

  const base64Candidate = Buffer.from(rawKey, 'base64');
  if (base64Candidate.length === 32) {
    return base64Candidate;
  }

  return createHash('sha256').update(rawKey, 'utf8').digest();
}

function ensureKeyLength(key: Buffer, rawKey: string): Buffer {
  if (key.length !== 32) {
    throw new Error(
      `Invalid key length for encrypted invoice data. Expected 32 bytes, got ${key.length} for key: ${rawKey.slice(0, 8)}...`
    );
  }

  return key;
}

function getActiveKeyConfig(): { version: string; key: Buffer } {
  const keys = getMasterKeysFromEnv();
  const versions = Object.keys(keys);

  if (versions.length === 0) {
    throw new Error(
      'No encryption keys configured. Set ENCRYPTION_MASTER_KEYS_JSON or versioned MASTER_KEY_* variables.'
    );
  }

  const activeVersion = (process.env.MASTER_KEY_VERSION || versions[0]).toLowerCase();
  const activeKey = keys[activeVersion];

  if (!activeKey) {
    throw new Error(
      `MASTER_KEY_VERSION is set to ${activeVersion}, but no matching key was found in configured keys.`
    );
  }

  return { version: activeVersion, key: activeKey };
}

function getKeyByVersion(version: string): Buffer {
  const keys = getMasterKeysFromEnv();
  const key = keys[version.toLowerCase()];

  if (!key) {
    throw new Error(`No encryption key found for key version: ${version}`);
  }

  return key;
}

export function encryptValue(value: string | number): EncryptedPayload {
  const { version, key } = getActiveKeyConfig();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = String(value);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: version,
    alg: 'aes-256-gcm',
  };
}

export function decryptValue(payload: EncryptedPayload): string {
  if (payload.alg !== 'aes-256-gcm') {
    throw new Error(`Unsupported encryption algorithm: ${payload.alg}`);
  }

  const key = getKeyByVersion(payload.keyVersion);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.ciphertext === 'string' &&
    typeof record.iv === 'string' &&
    typeof record.authTag === 'string' &&
    typeof record.keyVersion === 'string' &&
    record.alg === 'aes-256-gcm'
  );
}

export function encryptNullableString(value?: string | null): EncryptedPayload | null {
  if (!value) {
    return null;
  }

  return encryptValue(value);
}

export function encryptNullableNumber(value?: number | null): EncryptedPayload | null {
  if (value === null || value === undefined) {
    return null;
  }

  return encryptValue(value);
}

export function decryptEncryptedString(value: unknown): string | null {
  if (!isEncryptedPayload(value)) {
    return null;
  }

  return decryptValue(value);
}

export function decryptEncryptedNumber(value: unknown): number | null {
  const decrypted = decryptEncryptedString(value);

  if (decrypted === null) {
    return null;
  }

  const parsed = Number(decrypted);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveSensitiveString(
  plaintext: string | null | undefined,
  encrypted: unknown
): string | undefined {
  if (plaintext) {
    return plaintext;
  }

  return decryptEncryptedString(encrypted) || undefined;
}

export function resolveSensitiveNumber(
  plaintext: number | null | undefined,
  encrypted: unknown,
  fallback = 0
): number {
  if (plaintext !== null && plaintext !== undefined) {
    return plaintext;
  }

  return decryptEncryptedNumber(encrypted) ?? fallback;
}
