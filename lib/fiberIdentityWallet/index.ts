export {
  FIBER_IDENTITY_WALLET_STORAGE_KEY,
  type FiberIdentityWalletRecord,
  type FiberIdentityWalletStorage,
} from "./types";

import {
  assertValidFiberIdentityMnemonic,
  decryptFiberIdentityMnemonic,
  deriveFiberKeyFromMnemonic,
  encryptFiberIdentityMnemonic,
  generateFiberIdentityMnemonic,
} from "./crypto";
import {
  clearFiberIdentityWalletRecord,
  loadFiberIdentityWalletRecord,
  saveFiberIdentityWalletRecord,
} from "./storage";

export { generateFiberIdentityMnemonic, deriveFiberKeyFromMnemonic };

export async function saveFiberIdentityWallet(
  mnemonic: string,
  password: string,
) {
  const normalized = assertValidFiberIdentityMnemonic(mnemonic);
  const record = await encryptFiberIdentityMnemonic(normalized, password);
  await saveFiberIdentityWalletRecord(record);
}

export async function unlockFiberIdentityWallet(password: string) {
  const record = await loadFiberIdentityWalletRecord();
  if (!record) {
    throw new Error("No local Fiber identity wallet found.");
  }

  const mnemonic = await decryptFiberIdentityMnemonic(record, password);
  return deriveFiberKeyFromMnemonic(mnemonic);
}

export async function hasFiberIdentityWallet() {
  return (await loadFiberIdentityWalletRecord().catch(() => null)) !== null;
}

export async function deleteFiberIdentityWallet() {
  await clearFiberIdentityWalletRecord();
}
