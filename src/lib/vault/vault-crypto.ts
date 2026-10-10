import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_ALIAS = 'vault_master_aes_gcm_256';
let inMemoryKeyFallback: string | null = null;
let activeMasterKeyHex: string | null = null;

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(arr.length);
  copy.set(arr);
  return copy.buffer as ArrayBuffer;
}

async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    if (nodeCrypto.webcrypto?.subtle) {
      return nodeCrypto.webcrypto.subtle as SubtleCrypto;
    }
  } catch {
    // Environment does not provide node crypto
  }
  throw new Error('WebCrypto subtle is unavailable in this environment.');
}

export async function getOrCreateMasterKeyHex(): Promise<string> {
  if (activeMasterKeyHex) {
    return activeMasterKeyHex;
  }

  try {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();
    if (isSecureStoreAvailable) {
      const stored = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
      if (stored) {
        activeMasterKeyHex = stored;
        return stored;
      }
      const generated = bytesToHex(getRandomBytes(32));
      await SecureStore.setItemAsync(MASTER_KEY_ALIAS, generated);
      activeMasterKeyHex = generated;
      return generated;
    }
  } catch {
    // SecureStore might fail in testing or sandboxed environments
  }

  if (inMemoryKeyFallback) {
    activeMasterKeyHex = inMemoryKeyFallback;
    return inMemoryKeyFallback;
  }
  inMemoryKeyFallback = bytesToHex(getRandomBytes(32));
  activeMasterKeyHex = inMemoryKeyFallback;
  return activeMasterKeyHex;
}

export async function getMasterCryptoKey(): Promise<CryptoKey> {
  const hex = await getOrCreateMasterKeyHex();
  const rawKeyBytes = hexToBytes(hex);
  const subtle = await getSubtleCrypto();
  return subtle.importKey(
    'raw',
    toArrayBuffer(rawKeyBytes),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export type AesGcmNativeModule = {
  decrypt(
    base64Ciphertext: string,
    key: string,
    iv: string,
    tag: string,
    isBinary: boolean
  ): Promise<string>;
  decryptFile(
    inputFilePath: string,
    outputFilePath: string,
    key: string,
    iv: string,
    tag: string
  ): Promise<boolean>;
  encrypt(
    plainText: string,
    inBinary: boolean,
    key: string
  ): Promise<{ iv: string; tag: string; content: string }>;
  encryptFile(
    inputFilePath: string,
    outputFilePath: string,
    key: string
  ): Promise<{ iv: string; tag: string }>;
};

let nativeAesGcm: AesGcmNativeModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-aes-gcm-crypto');
  const candidate = mod?.default ?? mod;
  if (
    candidate &&
    typeof candidate.encrypt === 'function' &&
    typeof candidate.decrypt === 'function'
  ) {
    nativeAesGcm = candidate as AesGcmNativeModule;
  }
} catch {
  nativeAesGcm = null;
}

export function getNativeAesGcm(): AesGcmNativeModule | null {
  return nativeAesGcm;
}

export function setNativeAesGcmForTest(mod: AesGcmNativeModule | null): void {
  nativeAesGcm = mod;
}

/**
 * Encrypts arbitrary binary or string data using AES-256-GCM.
 * Output is combined: IV (12 bytes) + Ciphertext + Auth Tag (16 bytes).
 * Uses react-native-aes-gcm-crypto when available, with WebCrypto fallback.
 */
export async function encryptData(data: Uint8Array | string): Promise<Uint8Array> {
  const masterKeyHex = await getOrCreateMasterKeyHex();
  const masterKeyBytes = hexToBytes(masterKeyHex);
  const masterKeyBase64 = uint8ArrayToBase64(masterKeyBytes);

  const rawBytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;

  if (nativeAesGcm) {
    const plainTextBase64 = uint8ArrayToBase64(rawBytes);
    const result = await nativeAesGcm.encrypt(plainTextBase64, true, masterKeyBase64);
    const ivBytes = hexToBytes(result.iv);
    const tagBytes = hexToBytes(result.tag);
    const cipherBytes = base64ToUint8Array(result.content);

    const combined = new Uint8Array(12 + cipherBytes.length + 16);
    combined.set(ivBytes, 0);
    combined.set(cipherBytes, 12);
    combined.set(tagBytes, 12 + cipherBytes.length);
    return combined;
  }

  const subtle = await getSubtleCrypto();
  const key = await getMasterCryptoKey();
  const iv = getRandomBytes(12);

  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(rawBytes)
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return combined;
}

/**
 * Decrypts combined AES-256-GCM payload (IV + Ciphertext + Auth Tag).
 * Uses react-native-aes-gcm-crypto when available, with WebCrypto fallback.
 */
export async function decryptData(combined: Uint8Array): Promise<Uint8Array> {
  if (combined.length < 28) {
    throw new Error('Invalid encrypted payload: data too short for IV and auth tag.');
  }

  const masterKeyHex = await getOrCreateMasterKeyHex();
  const masterKeyBytes = hexToBytes(masterKeyHex);
  const masterKeyBase64 = uint8ArrayToBase64(masterKeyBytes);

  const ivBytes = combined.subarray(0, 12);
  const tagBytes = combined.subarray(combined.length - 16);
  const cipherBytes = combined.subarray(12, combined.length - 16);

  if (nativeAesGcm) {
    const ivHex = bytesToHex(ivBytes);
    const tagHex = bytesToHex(tagBytes);
    const cipherBase64 = uint8ArrayToBase64(cipherBytes);

    const decryptedBase64 = await nativeAesGcm.decrypt(
      cipherBase64,
      masterKeyBase64,
      ivHex,
      tagHex,
      true
    );
    return base64ToUint8Array(decryptedBase64);
  }

  const subtle = await getSubtleCrypto();
  const key = await getMasterCryptoKey();

  const decryptedBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
    key,
    toArrayBuffer(combined.subarray(12))
  );
  return new Uint8Array(decryptedBuffer);
}

export function resetInMemoryKeyFallback(): void {
  inMemoryKeyFallback = null;
  activeMasterKeyHex = null;
}
