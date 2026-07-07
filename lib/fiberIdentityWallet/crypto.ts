import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  FIBER_IDENTITY_HKDF_INFO,
  FIBER_IDENTITY_HKDF_SALT,
  FIBER_IDENTITY_KDF_ITERATIONS,
  FIBER_IDENTITY_WALLET_VERSION,
  type FiberIdentityWalletRecord,
} from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
}

async function derivePasswordKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations: FIBER_IDENTITY_KDF_ITERATIONS,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function generateFiberIdentityMnemonic(): string {
  return generateMnemonic(wordlist, 128);
}

export async function deriveFiberKeyFromMnemonic(
  mnemonic: string,
): Promise<Uint8Array> {
  const normalized = normalizeMnemonic(mnemonic);
  const seed = mnemonicToSeedSync(normalized);
  const hkdfSalt = encoder.encode(FIBER_IDENTITY_HKDF_SALT);
  const hkdfInfo = encoder.encode(FIBER_IDENTITY_HKDF_INFO);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(seed),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toArrayBuffer(hkdfSalt),
      info: toArrayBuffer(hkdfInfo),
    },
    keyMaterial,
    256,
  );

  return new Uint8Array(bits);
}

export async function encryptFiberIdentityMnemonic(
  mnemonic: string,
  password: string,
): Promise<FiberIdentityWalletRecord> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePasswordKey(password, salt);
  const payload = encoder.encode(
    JSON.stringify({ mnemonic: normalizeMnemonic(mnemonic) }),
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    payload,
  );

  return {
    version: FIBER_IDENTITY_WALLET_VERSION,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    kdf: {
      algorithm: "PBKDF2",
      hash: "SHA-256",
      iterations: FIBER_IDENTITY_KDF_ITERATIONS,
    },
  };
}

export async function decryptFiberIdentityMnemonic(
  record: FiberIdentityWalletRecord,
  password: string,
): Promise<string> {
  try {
    const key = await derivePasswordKey(password, base64ToBytes(record.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(base64ToBytes(record.iv)) },
      key,
      toArrayBuffer(base64ToBytes(record.ciphertext)),
    );
    const decoded = JSON.parse(decoder.decode(plaintext)) as {
      mnemonic?: string;
    };
    if (typeof decoded.mnemonic !== "string") {
      throw new Error("invalid");
    }
    return decoded.mnemonic;
  } catch {
    throw new Error("Incorrect password or invalid wallet data.");
  }
}

export function assertValidFiberIdentityMnemonic(mnemonic: string): string {
  const normalized = normalizeMnemonic(mnemonic);
  if (
    !validateMnemonic(normalized, wordlist) ||
    normalized.split(" ").length !== 12
  ) {
    throw new Error("Invalid 12-word mnemonic.");
  }
  return normalized;
}
