import {
  FIBER_IDENTITY_WALLET_STORAGE_KEY,
  type FiberIdentityWalletRecord,
  type FiberIdentityWalletStorage,
} from "./types";

function isRecord(value: unknown): value is FiberIdentityWalletRecord {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.ciphertext === "string" &&
    typeof record.iv === "string" &&
    typeof record.salt === "string" &&
    typeof record.kdf === "object" &&
    record.kdf !== null &&
    (record.kdf as Record<string, unknown>).algorithm === "PBKDF2" &&
    (record.kdf as Record<string, unknown>).hash === "SHA-256" &&
    typeof (record.kdf as Record<string, unknown>).iterations === "number"
  );
}

export function createLocalStorageFiberIdentityWalletStorage(): FiberIdentityWalletStorage {
  return {
    async load() {
      return window.localStorage.getItem(FIBER_IDENTITY_WALLET_STORAGE_KEY);
    },
    async save(value) {
      window.localStorage.setItem(FIBER_IDENTITY_WALLET_STORAGE_KEY, value);
    },
    async clear() {
      window.localStorage.removeItem(FIBER_IDENTITY_WALLET_STORAGE_KEY);
    },
  };
}

export async function loadFiberIdentityWalletRecord(
  storage: FiberIdentityWalletStorage = createLocalStorageFiberIdentityWalletStorage(),
): Promise<FiberIdentityWalletRecord | null> {
  const raw = await storage.load();
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      throw new Error("invalid");
    }
    return parsed;
  } catch {
    throw new Error("Stored Fiber identity wallet is invalid.");
  }
}

export async function saveFiberIdentityWalletRecord(
  record: FiberIdentityWalletRecord,
  storage: FiberIdentityWalletStorage = createLocalStorageFiberIdentityWalletStorage(),
) {
  await storage.save(JSON.stringify(record));
}

export async function clearFiberIdentityWalletRecord(
  storage: FiberIdentityWalletStorage = createLocalStorageFiberIdentityWalletStorage(),
) {
  await storage.clear();
}
