export const FIBER_IDENTITY_WALLET_STORAGE_KEY = "fiber_identity_wallet_v1";
export const FIBER_IDENTITY_WALLET_VERSION = 1;
export const FIBER_IDENTITY_KDF_ITERATIONS = 250000;
export const FIBER_IDENTITY_HKDF_SALT = "fiber-wallet-local-hkdf-v1";
export const FIBER_IDENTITY_HKDF_INFO = "fiber-node-identity-key";

export interface FiberIdentityWalletRecord {
  version: 1;
  ciphertext: string;
  iv: string;
  salt: string;
  kdf: {
    algorithm: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
  };
}

export interface FiberIdentityWalletStorage {
  load(): Promise<string | null>;
  save(value: string): Promise<void>;
  clear(): Promise<void>;
}
