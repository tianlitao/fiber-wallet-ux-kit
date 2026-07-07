import { describe, expect, it } from "vitest";
import {
  FUNDING_SESSION_TTL_MS,
  clearJoyIdFundingSession,
  loadJoyIdFundingSession,
  saveJoyIdFundingSession,
} from "@/lib/joyid/fundingSession";

function createFundingTx() {
  return {
    version: "0x0" as const,
    cell_deps: [],
    header_deps: [],
    inputs: [],
    outputs: [],
    outputs_data: [],
    witnesses: ["0x"] as const,
  };
}

function createStorage() {
  const backing = new Map<string, string>();
  return {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => {
      backing.set(key, value);
    },
    removeItem: (key: string) => {
      backing.delete(key);
    },
  } as Storage;
}

describe("joyid funding session storage", () => {
  it("round-trips a pending funding session", () => {
    const storage = createStorage();

    saveJoyIdFundingSession(storage, {
      channelId: "0xabc",
      unsignedFundingTx: createFundingTx(),
      originalWitnesses: ["0x01"],
      userFirstIndex: 0,
      locale: "en",
      createdAt: 100,
    });

    expect(loadJoyIdFundingSession(storage, 100)).toMatchObject({
      channelId: "0xabc",
      userFirstIndex: 0,
      locale: "en",
      unsignedFundingTx: createFundingTx(),
    });
  });

  it("clears expired sessions", () => {
    const storage = createStorage();

    saveJoyIdFundingSession(storage, {
      channelId: "0xexpired",
      unsignedFundingTx: createFundingTx(),
      originalWitnesses: ["0x01"],
      userFirstIndex: 0,
      locale: "zh",
      createdAt: 10,
    });

    expect(
      loadJoyIdFundingSession(storage, 10 + FUNDING_SESSION_TTL_MS + 1),
    ).toBeUndefined();
    expect(storage.getItem("fiber_joyid_funding_session")).toBeNull();
  });

  it("clears a pending funding session explicitly", () => {
    const storage = createStorage();

    saveJoyIdFundingSession(storage, {
      channelId: "0xdef",
      unsignedFundingTx: createFundingTx(),
      originalWitnesses: ["0x02"],
      userFirstIndex: 0,
      locale: "en",
      createdAt: 100,
    });
    clearJoyIdFundingSession(storage);

    expect(loadJoyIdFundingSession(storage, 100)).toBeUndefined();
  });

  it("clears malformed stored sessions", () => {
    const storage = createStorage();

    storage.setItem(
      "fiber_joyid_funding_session",
      JSON.stringify({
        channelId: "0xbroken",
        userFirstIndex: "not-a-number",
      }),
    );

    expect(loadJoyIdFundingSession(storage, 100)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_funding_session")).toBeNull();
  });

  it("clears sessions with future timestamps", () => {
    const storage = createStorage();

    saveJoyIdFundingSession(storage, {
      channelId: "0xfuture",
      unsignedFundingTx: createFundingTx(),
      originalWitnesses: ["0x03"],
      userFirstIndex: 0,
      locale: "en",
      createdAt: 200,
    });

    expect(loadJoyIdFundingSession(storage, 100)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_funding_session")).toBeNull();
  });

  it("rejects negative input indexes", () => {
    const storage = createStorage();

    storage.setItem(
      "fiber_joyid_funding_session",
      JSON.stringify({
        channelId: "0xnegative",
        unsignedFundingTx: createFundingTx(),
        originalWitnesses: ["0x04"],
        userFirstIndex: -1,
        locale: "en",
        createdAt: 100,
      }),
    );

    expect(loadJoyIdFundingSession(storage, 100)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_funding_session")).toBeNull();
  });

  it("rejects out-of-bounds input indexes", () => {
    const storage = createStorage();

    storage.setItem(
      "fiber_joyid_funding_session",
      JSON.stringify({
        channelId: "0xoverflow",
        unsignedFundingTx: createFundingTx(),
        originalWitnesses: ["0x04"],
        userFirstIndex: 1,
        locale: "en",
        createdAt: 100,
      }),
    );

    expect(loadJoyIdFundingSession(storage, 100)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_funding_session")).toBeNull();
  });

  it("clears malformed empty-string storage", () => {
    const storage = createStorage();

    storage.setItem("fiber_joyid_funding_session", "");

    expect(loadJoyIdFundingSession(storage, 100)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_funding_session")).toBeNull();
  });

  it("rejects sessions without a valid unsigned funding tx", () => {
    const storage = createStorage();

    storage.setItem(
      "fiber_joyid_funding_session",
      JSON.stringify({
        channelId: "0xnotx",
        unsignedFundingTx: {},
        originalWitnesses: ["0x05"],
        userFirstIndex: 0,
        locale: "en",
        createdAt: 100,
      }),
    );

    expect(loadJoyIdFundingSession(storage, 100)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_funding_session")).toBeNull();
  });
});
