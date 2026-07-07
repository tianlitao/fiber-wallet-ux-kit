import { beforeEach, describe, expect, it } from "vitest";
import {
  FIBER_IDENTITY_WALLET_STORAGE_KEY,
  deleteFiberIdentityWallet,
  deriveFiberKeyFromMnemonic,
  generateFiberIdentityMnemonic,
  hasFiberIdentityWallet,
  saveFiberIdentityWallet,
  unlockFiberIdentityWallet,
} from "@/lib/fiberIdentityWallet";

describe("fiberIdentityWallet", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("generates a 12-word mnemonic", () => {
    const mnemonic = generateFiberIdentityMnemonic();
    expect(mnemonic.split(/\s+/)).toHaveLength(12);
  });

  it("rejects invalid mnemonic input before saving", async () => {
    await expect(
      saveFiberIdentityWallet("invalid words", "password123"),
    ).rejects.toThrow("Invalid 12-word mnemonic.");
  });

  it("encrypts, stores, and unlocks a wallet with a deterministic fiber key", async () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    await saveFiberIdentityWallet(mnemonic, "password123");

    expect(await hasFiberIdentityWallet()).toBe(true);
    expect(
      window.localStorage.getItem(FIBER_IDENTITY_WALLET_STORAGE_KEY),
    ).toContain("\"version\":1");

    const unlocked = await unlockFiberIdentityWallet("password123");
    const derived = await deriveFiberKeyFromMnemonic(mnemonic);

    expect(Array.from(unlocked)).toEqual(Array.from(derived));
  });

  it("reports invalid stored wallet data", async () => {
    window.localStorage.setItem(FIBER_IDENTITY_WALLET_STORAGE_KEY, "{");

    await expect(unlockFiberIdentityWallet("password123")).rejects.toThrow(
      "Stored Fiber identity wallet is invalid.",
    );
  });

  it("deletes the stored wallet record", async () => {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    await saveFiberIdentityWallet(mnemonic, "password123");
    await deleteFiberIdentityWallet();

    expect(await hasFiberIdentityWallet()).toBe(false);
    expect(
      window.localStorage.getItem(FIBER_IDENTITY_WALLET_STORAGE_KEY),
    ).toBeNull();
  });
});
