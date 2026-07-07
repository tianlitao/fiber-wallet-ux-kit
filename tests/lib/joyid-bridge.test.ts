import { describe, expect, it } from "vitest";
import {
  clearJoyIdBridgeRequest,
  loadJoyIdBridgeRequest,
  saveJoyIdBridgeRequest,
} from "@/lib/joyid/bridge";

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

describe("joyid bridge storage", () => {
  it("round-trips a connect bridge request", () => {
    const storage = createStorage();

    saveJoyIdBridgeRequest(storage, {
      type: "connect",
      returnUrl: "/en",
      payload: {
        config: {
          redirectURL: "/en",
          name: "Fiber Wallet",
          logo: "icon",
        },
      },
      createdAt: 1,
    });

    expect(loadJoyIdBridgeRequest(storage)).toEqual({
      type: "connect",
      returnUrl: "/en",
      payload: {
        config: {
          redirectURL: "/en",
          name: "Fiber Wallet",
          logo: "icon",
        },
      },
      createdAt: 1,
    });
  });

  it("round-trips a sign bridge request", () => {
    const storage = createStorage();

    saveJoyIdBridgeRequest(storage, {
      type: "sign-ckb-raw-tx",
      returnUrl: "/en/channels",
      requestKey: "req-1",
      payload: {
        tx: { witnesses: ["0x"] },
        signerAddress: "ckt1qjoyid",
        witnessIndexes: [0],
        config: {
          redirectURL: "/en/channels",
          name: "Fiber Wallet",
          logo: "icon",
        },
      },
      createdAt: 2,
    });

    expect(loadJoyIdBridgeRequest(storage)).toEqual({
      type: "sign-ckb-raw-tx",
      returnUrl: "/en/channels",
      requestKey: "req-1",
      payload: {
        tx: { witnesses: ["0x"] },
        signerAddress: "ckt1qjoyid",
        witnessIndexes: [0],
        config: {
          redirectURL: "/en/channels",
          name: "Fiber Wallet",
          logo: "icon",
        },
      },
      createdAt: 2,
    });
  });

  it("clears malformed bridge request data", () => {
    const storage = createStorage();
    storage.setItem("fiber_joyid_bridge_request", JSON.stringify({ type: 1 }));

    expect(loadJoyIdBridgeRequest(storage)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_bridge_request")).toBeNull();
  });

  it("clears malformed connect bridge payloads", () => {
    const storage = createStorage();
    storage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "connect",
        returnUrl: "/en",
        payload: {
          config: {
            redirectURL: "/en",
            name: "Fiber Wallet",
          },
        },
        createdAt: 3,
      }),
    );

    expect(loadJoyIdBridgeRequest(storage)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_bridge_request")).toBeNull();
  });

  it("clears malformed sign bridge payloads", () => {
    const storage = createStorage();
    storage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "sign-ckb-raw-tx",
        returnUrl: "/en/channels",
        requestKey: "req-2",
        payload: [],
        createdAt: 3,
      }),
    );

    expect(loadJoyIdBridgeRequest(storage)).toBeUndefined();
    expect(storage.getItem("fiber_joyid_bridge_request")).toBeNull();
  });

  it("clears a bridge request explicitly", () => {
    const storage = createStorage();

    saveJoyIdBridgeRequest(storage, {
      type: "connect",
      returnUrl: "/en",
      payload: {
        config: {
          redirectURL: "/en",
          name: "Fiber Wallet",
          logo: "icon",
        },
      },
      createdAt: 1,
    });

    clearJoyIdBridgeRequest(storage);

    expect(loadJoyIdBridgeRequest(storage)).toBeUndefined();
  });
});
