import { waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { DappRequestType, decodeSearch, encodeSearch } from "@joyid/common";
import {
  JOY_ID_CKB_SIGNER_NAME,
  JOY_ID_REDIRECT_PENDING_KEY,
  JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM,
  buildJoyIdSignRedirectBridgeUrl,
  getJoyIdSignRedirectResponseStorageKey,
  JOY_ID_WALLET_NAME,
  RedirectJoyIdCkbSigner,
  RedirectJoyIdConnectionsRepo,
  buildJoyIdRedirectAuthUrl,
  buildJoyIdPopupSignCkbRawTxUrl,
  buildJoyIdRedirectSignCkbRawTxUrl,
  storeJoyIdSignRedirectResponseFromMessage,
  storeJoyIdSignRedirectResponseFromUrl,
} from "@/lib/joyIdRedirect";

describe("JoyID redirect connector helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/en");
    vi.restoreAllMocks();
  });

  it("builds JoyID auth URLs with redirect communication", () => {
    const url = new URL(
      buildJoyIdRedirectAuthUrl({
        addressPrefix: "ckt",
        appIcon: "https://localhost/icon.png",
        appName: "Fiber Wallet UX Kit",
        redirectURL: "https://localhost/en/channels",
      }),
    );
    const data = decodeSearch(url.searchParams.get("_data_") ?? "");

    expect(url.origin).toBe("https://testnet.joyid.dev");
    expect(url.pathname).toBe("/auth");
    expect(url.searchParams.get("type")).toBe("redirect");
    expect(data.name).toBe("Fiber Wallet UX Kit");
    expect(data.redirectURL).toContain("joyid-redirect=true");
  });

  it("restores a redirected JoyID CKB connection into CCC storage", async () => {
    const returnURL = `${window.location.origin}/en/channels`;
    const response = encodeSearch({
      type: DappRequestType.Auth,
      data: {
        address: "ckt1qjoyid",
        alg: -7,
        ethAddress: "0x",
        keyType: "main_key",
        nativeSegwit: {
          address: "",
          pubkey: "",
        },
        nostrPubkey: "",
        pubkey: "0x1234",
        taproot: {
          address: "",
          pubkey: "",
        },
      },
    });

    window.sessionStorage.setItem(
      JOY_ID_REDIRECT_PENDING_KEY,
      JSON.stringify({
        addressType: "ckb",
        joyidAppURL: "https://testnet.joyid.dev",
        returnURL,
      }),
    );
    window.history.replaceState(
      null,
      "",
      `/en/channels?joyid-redirect=true&_data_=${encodeURIComponent(response)}`,
    );

    const repo = new RedirectJoyIdConnectionsRepo();
    const connection = await repo.get({
      addressType: "ckb",
      uri: "https://testnet.joyid.dev",
    });

    expect(connection).toEqual({
      address: "ckt1qjoyid",
      keyType: "main_key",
      publicKey: "0x1234",
    });
    expect(window.localStorage.getItem("ccc-connection-info")).toBe(
      JSON.stringify({
        signerName: JOY_ID_CKB_SIGNER_NAME,
        walletName: JOY_ID_WALLET_NAME,
      }),
    );
    expect(window.location.href).toBe(returnURL);
  });

  it("connects the JoyID CKB signer through the same-origin bridge window", async () => {
    const popup = {
      closed: false,
      close: vi.fn(),
    };
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);
    const signer = new RedirectJoyIdCkbSigner(
      { addressPrefix: "ckt" } as any,
      "Fiber Wallet UX Kit",
      "https://localhost/icon.png",
      "https://testnet.joyid.dev",
    );

    const connectPromise = signer.connect();

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });

    const bridgeUrl = new URL(String(openSpy.mock.calls[0][0]));
    const requestId = bridgeUrl.searchParams.get(
      JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM,
    );
    expect(bridgeUrl.origin).toBe(window.location.origin);
    expect(bridgeUrl.pathname).toBe("/joyid-sign-bridge");
    expect(requestId).toBeTruthy();

    const responseKey = `fiber-joyid-auth-response:${requestId}`;
    window.localStorage.setItem(
      responseKey,
      JSON.stringify({
        ok: true,
        data: {
          address: "ckt1qjoyid",
          alg: -7,
          ethAddress: "0x",
          keyType: "main_key",
          nativeSegwit: {
            address: "",
            pubkey: "",
          },
          nostrPubkey: "",
          pubkey: "0x1234",
          taproot: {
            address: "",
            pubkey: "",
          },
        },
      }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: responseKey }));

    await connectPromise;

    expect(popup.close).toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem("ccc-joy-id-signer") ?? "[]"))
      .toEqual([
        [
          {
            addressType: "ckb",
            uri: "https://testnet.joyid.dev",
          },
          {
            address: "ckt1qjoyid",
            keyType: "main_key",
            publicKey: "0x1234",
          },
        ],
      ]);
    expect(window.localStorage.getItem("ccc-connection-info")).toBe(
      JSON.stringify({
        signerName: JOY_ID_CKB_SIGNER_NAME,
        walletName: JOY_ID_WALLET_NAME,
      }),
    );
  });

  it("keeps waiting when COOP makes the bridge window proxy look closed", async () => {
    vi.useFakeTimers();
    try {
      const popup = {
        closed: true,
        close: vi.fn(),
      };
      const openSpy = vi
        .spyOn(window, "open")
        .mockReturnValue(popup as unknown as Window);
      const signer = new RedirectJoyIdCkbSigner(
        { addressPrefix: "ckt" } as any,
        "Fiber Wallet UX Kit",
        "https://localhost/icon.png",
        "https://testnet.joyid.dev",
      );

      const connectPromise = signer.connect();
      connectPromise.catch(() => undefined);

      const bridgeUrl = new URL(String(openSpy.mock.calls[0][0]));
      const requestId = bridgeUrl.searchParams.get(
        JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM,
      );
      const responseKey = `fiber-joyid-auth-response:${requestId}`;

      vi.advanceTimersByTime(500);
      await Promise.resolve();

      window.localStorage.setItem(
        responseKey,
        JSON.stringify({
          ok: true,
          data: {
            address: "ckt1qjoyid",
            alg: -7,
            ethAddress: "0x",
            keyType: "main_key",
            nativeSegwit: {
              address: "",
              pubkey: "",
            },
            nostrPubkey: "",
            pubkey: "0x1234",
            taproot: {
              address: "",
              pubkey: "",
            },
          },
        }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: responseKey }));

      await expect(connectPromise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("builds JoyID raw transaction signing URLs with redirect communication", () => {
    const url = new URL(
      buildJoyIdRedirectSignCkbRawTxUrl({
        appIcon: "https://localhost/icon.png",
        appName: "Fiber Wallet UX Kit",
        joyidAppURL: "https://testnet.joyid.dev",
        redirectURL: "https://localhost/joyid-callback?joyid_request_id=req-1",
        signerAddress: "ckt1qjoyid",
        tx: {
          version: "0x0",
          cellDeps: [],
          headerDeps: [],
          inputs: [],
          outputs: [],
          outputsData: [],
          witnesses: [],
        },
        witnessIndexes: [0],
      }),
    );
    const data = decodeSearch(url.searchParams.get("_data_") ?? "");

    expect(url.origin).toBe("https://testnet.joyid.dev");
    expect(url.pathname).toBe("/sign-ckb-raw-tx");
    expect(url.searchParams.get("type")).toBe("redirect");
    expect(data.signerAddress).toBe("ckt1qjoyid");
    expect(data.witnessIndexes).toEqual([0]);
    expect(data.redirectURL).toContain("joyid-redirect=true");
    expect(data.redirectURL).toContain(
      `${JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM}=req-1`,
    );
  });

  it("builds JoyID raw transaction signing URLs with popup communication for bridge windows", () => {
    const url = new URL(
      buildJoyIdPopupSignCkbRawTxUrl({
        appIcon: "https://localhost/icon.png",
        appName: "Fiber Wallet UX Kit",
        joyidAppURL: "https://testnet.joyid.dev",
        redirectURL:
          "https://localhost/joyid-sign-bridge?joyid_request_id=req-1",
        signerAddress: "ckt1qjoyid",
        tx: {
          version: "0x0",
          cellDeps: [],
          headerDeps: [],
          inputs: [],
          outputs: [],
          outputsData: [],
          witnesses: [],
        },
        witnessIndexes: [0],
      }),
    );
    const data = decodeSearch(url.searchParams.get("_data_") ?? "");

    expect(url.origin).toBe("https://testnet.joyid.dev");
    expect(url.pathname).toBe("/sign-ckb-raw-tx");
    expect(url.searchParams.get("type")).toBe("popup");
    expect(data.redirectURL).toBe(
      "https://localhost/joyid-sign-bridge?joyid_request_id=req-1",
    );
    expect(data.signerAddress).toBe("ckt1qjoyid");
    expect(data.witnessIndexes).toEqual([0]);
  });

  it("builds same-origin bridge URLs for JoyID signing windows", () => {
    const url = new URL(buildJoyIdSignRedirectBridgeUrl("req-1"));

    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe("/joyid-sign-bridge");
    expect(url.searchParams.get(JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM)).toBe(
      "req-1",
    );
  });

  it("stores redirected JoyID raw transaction signatures for the opener-free signer flow", () => {
    const response = encodeSearch({
      type: DappRequestType.SignCkbRawTx,
      data: {
        tx: {
          version: "0x0",
          cellDeps: [],
          headerDeps: [],
          inputs: [],
          outputs: [],
          outputsData: [],
          witnesses: ["0xsigned"],
        },
      },
    });
    const callbackURL =
      `${window.location.origin}/joyid-callback?` +
      `${JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM}=req-1` +
      `&joyid-redirect=true&_data_=${encodeURIComponent(response)}`;

    const stored = storeJoyIdSignRedirectResponseFromUrl(callbackURL);

    expect(stored).toBe(true);
    expect(
      JSON.parse(
        window.localStorage.getItem(
          getJoyIdSignRedirectResponseStorageKey("req-1"),
        ) ?? "{}",
      ),
    ).toEqual({
      ok: true,
      data: {
        tx: {
          version: "0x0",
          cellDeps: [],
          headerDeps: [],
          inputs: [],
          outputs: [],
          outputsData: [],
          witnesses: ["0xsigned"],
        },
      },
    });
  });

  it("stores JoyID popup raw transaction signatures for the bridge signer flow", () => {
    const stored = storeJoyIdSignRedirectResponseFromMessage("req-1", {
      type: DappRequestType.SignCkbRawTx,
      data: {
        tx: {
          version: "0x0",
          cellDeps: [],
          headerDeps: [],
          inputs: [],
          outputs: [],
          outputsData: [],
          witnesses: ["0xsigned"],
        },
      },
    });

    expect(stored).toBe(true);
    expect(
      JSON.parse(
        window.localStorage.getItem(
          getJoyIdSignRedirectResponseStorageKey("req-1"),
        ) ?? "{}",
      ),
    ).toEqual({
      ok: true,
      data: {
        tx: {
          version: "0x0",
          cellDeps: [],
          headerDeps: [],
          inputs: [],
          outputs: [],
          outputsData: [],
          witnesses: ["0xsigned"],
        },
      },
    });
  });
});
