import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ccc } from "@ckb-ccc/core";
import {
  buildJoyIdRedirectSignRequestKey,
  JoyIdRedirectCkbSigner,
  prepareJoyIdRedirectSignTx,
} from "@/lib/joyid/JoyIdRedirectCkbSigner";
import { loadJoyIdBridgeRequest } from "@/lib/joyid/bridge";
import * as joyIdBridge from "@/lib/joyid/bridge";
import {
  CCC_CONNECTION_INFO_KEY,
  JOYID_REDIRECT_CONNECTION_KEY,
  JOYID_REDIRECT_PENDING_KEY,
  JOYID_REDIRECT_SIGN_RESULT_KEY,
  clearJoyIdRedirectSignResult,
  consumeJoyIdAuthRedirect,
  loadJoyIdRedirectSignResult,
  loadJoyIdRedirectConnection,
  saveJoyIdConnectorSelection,
  stripJoyIdRedirectParams,
} from "@/lib/joyid/redirect";

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

describe("joyid redirect helpers", () => {
  it("stores connector selection for JoyID redirect reconnect", () => {
    const storage = createStorage();

    saveJoyIdConnectorSelection(storage);

    expect(storage.getItem(CCC_CONNECTION_INFO_KEY)).toContain(
      '"walletName":"JoyID Passkey"',
    );
    expect(storage.getItem(CCC_CONNECTION_INFO_KEY)).toContain(
      '"signerName":"CKB"',
    );
  });

  it("stores a bridge connect request instead of opening JoyID directly", async () => {
    const navigateSpy = vi
      .spyOn(joyIdBridge, "navigateToJoyIdBridge")
      .mockImplementation(() => {});

    try {
      const signer = new JoyIdRedirectCkbSigner(
        { addressPrefix: "ckt" } as any,
        "Fiber Wallet UX Kit",
        "icon",
      );

      void signer.connect().catch(() => {});
      await Promise.resolve();

      expect(loadJoyIdBridgeRequest(window.sessionStorage)).toMatchObject({
        type: "connect",
        returnUrl: window.location.pathname + window.location.search,
        payload: {
          config: expect.objectContaining({
            name: "Fiber Wallet UX Kit",
          }),
        },
      });
      expect(navigateSpy).toHaveBeenCalledTimes(1);
    } finally {
      navigateSpy.mockRestore();
      window.sessionStorage.clear();
    }
  });

  it("consumes a pending auth redirect and saves the connection", () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();
    sessionStorage.setItem(JOYID_REDIRECT_PENDING_KEY, "1");

    const result = consumeJoyIdAuthRedirect({
      href: "https://example.com/zh?joyid-redirect=true&_data_=abc&foo=bar",
      pendingStorage: sessionStorage,
      connectionStorage: localStorage,
      isRedirectFromJoyID: () => true,
      parseAuth: () =>
        ({
          address: "ckt1qredirect",
          pubkey:
            "0x03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          keyType: "main_key",
        }) as any,
    });

    expect(result?.connection.address).toBe("ckt1qredirect");
    expect(result?.cleanedHref).toBe("https://example.com/zh?foo=bar");

    expect(localStorage.getItem(JOYID_REDIRECT_CONNECTION_KEY)).toContain(
      "ckt1qredirect",
    );
    expect(sessionStorage.getItem(JOYID_REDIRECT_PENDING_KEY)).toBeNull();
  });

  it("ignores redirect parsing when connect is not pending", () => {
    const storage = createStorage();
    const parseAuth = vi.fn();

    const result = consumeJoyIdAuthRedirect({
      href: "https://example.com/zh?joyid-redirect=true&_data_=abc",
      pendingStorage: storage,
      connectionStorage: storage,
      isRedirectFromJoyID: () => true,
      parseAuth,
    });

    expect(result).toBeUndefined();
    expect(parseAuth).not.toHaveBeenCalled();
  });

  it("clears pending auth when auth redirect parsing fails", () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();
    sessionStorage.setItem(JOYID_REDIRECT_PENDING_KEY, "1");

    expect(() =>
      consumeJoyIdAuthRedirect({
        href: "https://example.com/zh?joyid-redirect=true&_data_=abc",
        pendingStorage: sessionStorage,
        connectionStorage: localStorage,
        isRedirectFromJoyID: () => true,
        parseAuth: () => {
          throw new Error("bad-auth");
        },
      }),
    ).toThrow("bad-auth");
    expect(sessionStorage.getItem(JOYID_REDIRECT_PENDING_KEY)).toBeNull();
  });

  it("rejects corrupted persisted connection state", () => {
    const storage = createStorage();
    storage.setItem(JOYID_REDIRECT_CONNECTION_KEY, JSON.stringify({}));

    expect(loadJoyIdRedirectConnection(storage)).toBeUndefined();
    expect(storage.getItem(JOYID_REDIRECT_CONNECTION_KEY)).toBeNull();
  });

  it("prepares JoyID redirect signing with JoyID's lock length and matching witness indexes", async () => {
    const tx = {
      inputs: [
        {
          getCell: vi.fn().mockResolvedValue({
            cellOutput: { lock: { eq: () => false } },
          }),
          cellOutput: { lock: { eq: () => false } },
          outputData: "0x00",
        },
        {
          getCell: vi.fn().mockResolvedValue({
            cellOutput: { lock: { eq: () => true } },
          }),
          cellOutput: { lock: { eq: () => true } },
          outputData: "0x01",
        },
      ],
      prepareSighashAllWitness: vi.fn().mockResolvedValue(undefined),
      stringify: vi
        .fn()
        .mockReturnValue(JSON.stringify({ witnesses: ["0x00", "0x01"] })),
    };

    const result = await prepareJoyIdRedirectSignTx(
      tx as any,
      { addressPrefix: "ckt" } as any,
      { id: "joyid-lock" } as any,
    );

    expect(result.witnessIndexes).toEqual([1]);
    expect(tx.prepareSighashAllWitness).toHaveBeenCalledWith(
      { id: "joyid-lock" },
      0,
      { addressPrefix: "ckt" },
    );
    expect(tx.inputs[0].cellOutput).toBeUndefined();
    expect(tx.inputs[1].outputData).toBeUndefined();
  });

  it("returns a stored signed tx before starting a new redirect", async () => {
    const tx = {
      inputs: [
        {
          getCell: vi.fn().mockResolvedValue({
            cellOutput: { lock: { eq: () => true } },
          }),
          cellOutput: { lock: { eq: () => true } },
          outputData: "0x01",
        },
      ],
      prepareSighashAllWitness: vi.fn().mockResolvedValue(undefined),
      stringify: vi
        .fn()
        .mockReturnValue(JSON.stringify({ witnesses: ["0x00"] })),
    };
    const requestKey = await buildJoyIdRedirectSignRequestKey({
      tx: { witnesses: ["0x00"] },
      witnessIndexes: [0],
      signerAddress: "ckt1qjoyid",
    });

    window.sessionStorage.setItem(
      JOYID_REDIRECT_SIGN_RESULT_KEY,
      JSON.stringify({
        requestKey,
        tx: { witnesses: ["0xrestored"] },
      }),
    );

    const fromSpy = vi
      .spyOn(ccc.Transaction, "from")
      .mockReturnValueOnce(tx as any)
      .mockReturnValueOnce({ restored: true } as any);

    try {
      const signer = new JoyIdRedirectCkbSigner(
        { addressPrefix: "ckt" } as any,
        "Fiber Wallet UX Kit",
        "icon",
      );
      (signer as any).getAddressObj = vi.fn().mockResolvedValue({
        script: { id: "joyid-lock" },
      });
      (signer as any).assertConnection = vi.fn().mockResolvedValue({
        address: "ckt1qjoyid",
      });

      const result = await signer.signOnlyTransaction({} as any);

      expect(result).toMatchObject({ restored: true });
      expect(fromSpy).toHaveBeenNthCalledWith(2, { witnesses: ["0xrestored"] });
      expect(loadJoyIdRedirectSignResult(window.sessionStorage)).toBeUndefined();
    } finally {
      fromSpy.mockRestore();
      clearJoyIdRedirectSignResult(window.sessionStorage);
    }
  });

  it("stores a bridge sign request instead of opening JoyID on the isolated page", async () => {
    window.sessionStorage.clear();

    const navigateSpy = vi
      .spyOn(joyIdBridge, "navigateToJoyIdBridge")
      .mockImplementation(() => {});

    const tx = {
      inputs: [
        {
          getCell: vi.fn().mockResolvedValue({
            cellOutput: { lock: { eq: () => true } },
          }),
          cellOutput: { lock: { eq: () => true } },
          outputData: "0x01",
        },
      ],
      prepareSighashAllWitness: vi.fn().mockResolvedValue(undefined),
      stringify: vi
        .fn()
        .mockReturnValue(JSON.stringify({ witnesses: ["0x00"] })),
    };

    const fromSpy = vi
      .spyOn(ccc.Transaction, "from")
      .mockReturnValue(tx as any);

    try {
      const signer = new JoyIdRedirectCkbSigner(
        { addressPrefix: "ckt" } as any,
        "Fiber Wallet UX Kit",
        "icon",
      );
      (signer as any).getAddressObj = vi.fn().mockResolvedValue({
        script: { id: "joyid-lock" },
      });
      (signer as any).assertConnection = vi.fn().mockResolvedValue({
        address: "ckt1qjoyid",
      });

      void signer.signOnlyTransaction({} as any).catch(() => {});

      await waitFor(() => {
        expect(loadJoyIdBridgeRequest(window.sessionStorage)).toMatchObject({
          type: "sign-ckb-raw-tx",
          returnUrl: window.location.pathname + window.location.search,
          requestKey: expect.any(String),
        });
      });
      expect(navigateSpy).toHaveBeenCalledTimes(1);
    } finally {
      navigateSpy.mockRestore();
      fromSpy.mockRestore();
      window.sessionStorage.clear();
    }
  });

  it("removes JoyID redirect params from a callback url", () => {
    expect(
      stripJoyIdRedirectParams(
        "https://example.com/en?joyid-redirect=true&_data_=abc&x=1",
      ),
    ).toBe("https://example.com/en?x=1");
  });
});
