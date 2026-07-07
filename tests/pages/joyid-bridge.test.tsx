import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const authWithPopupMock = vi.fn();
const signRawTransactionMock = vi.fn();

vi.mock("@joyid/common", async () => {
  const actual = await vi.importActual<typeof import("@joyid/common")>(
    "@joyid/common",
  );

  return {
    ...actual,
    authWithPopup: authWithPopupMock,
  };
});

vi.mock("@joyid/ckb", () => ({
  signRawTransaction: signRawTransactionMock,
}));

describe("JoyIdBridgePage", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
    authWithPopupMock.mockReset();
    signRawTransactionMock.mockReset();
  });

  it("renders a JoyID bridge loading state while a connect request is in progress", async () => {
    authWithPopupMock.mockReturnValue(new Promise(() => {}));
    window.sessionStorage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "connect",
        returnUrl: "/en",
        payload: {
          config: {
            redirectURL: "/en",
            name: "Fiber Wallet",
            logo: "icon",
          },
        },
        createdAt: Date.now(),
      }),
    );

    const { default: JoyIdBridgePage } = await import("@/app/joyid-bridge/page");
    render(<JoyIdBridgePage />);

    expect(
      screen.getByText("Preparing JoyID bridge..."),
    ).toBeInTheDocument();
  });

  it("shows an error when no bridge request is available", async () => {
    const { default: JoyIdBridgePage } = await import("@/app/joyid-bridge/page");
    render(<JoyIdBridgePage />);

    expect(
      await screen.findByText("No JoyID bridge request was found."),
    ).toBeInTheDocument();
  });

  it("executes a pending connect bridge request and returns to the caller route", async () => {
    authWithPopupMock.mockResolvedValue({
      address: "ckt1qbridge",
      pubkey:
        "0x03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      keyType: "main_key",
    });

    const bridgeModule = await import("@/lib/joyid/bridge");
    const returnSpy = vi
      .spyOn(bridgeModule, "returnFromJoyIdBridge")
      .mockImplementation(() => {});

    window.sessionStorage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "connect",
        returnUrl: "/en",
        payload: {
          config: {
            redirectURL: "/en",
            name: "Fiber Wallet",
            logo: "icon",
          },
        },
        createdAt: Date.now(),
      }),
    );

    const { default: JoyIdBridgePage } = await import("@/app/joyid-bridge/page");
    render(<JoyIdBridgePage />);

    await waitFor(() => {
      expect(authWithPopupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Fiber Wallet",
        }),
      );
    });

    expect(
      JSON.parse(
        window.localStorage.getItem("fiber_joyid_redirect_connection")!,
      ),
    ).toMatchObject({
      address: "ckt1qbridge",
    });
    expect(window.sessionStorage.getItem("fiber_joyid_bridge_request")).toBeNull();
    expect(returnSpy).toHaveBeenCalledWith("/en");

    returnSpy.mockRestore();
  });

  it("shows an error and clears the request when JoyID connect fails", async () => {
    authWithPopupMock.mockRejectedValue(new Error("connect failed"));

    const bridgeModule = await import("@/lib/joyid/bridge");
    const returnSpy = vi
      .spyOn(bridgeModule, "returnFromJoyIdBridge")
      .mockImplementation(() => {});

    window.sessionStorage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "connect",
        returnUrl: "/en",
        payload: {
          config: {
            redirectURL: "/en",
            name: "Fiber Wallet",
            logo: "icon",
          },
        },
        createdAt: Date.now(),
      }),
    );

    const { default: JoyIdBridgePage } = await import("@/app/joyid-bridge/page");
    render(<JoyIdBridgePage />);

    expect(
      await screen.findByText(
        "JoyID connect failed. Return to the previous page and try again.",
      ),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("fiber_joyid_bridge_request")).toBeNull();
    expect(returnSpy).not.toHaveBeenCalled();

    returnSpy.mockRestore();
  });

  it("does not start duplicate JoyID popups for the same pending connect request", async () => {
    authWithPopupMock.mockReturnValue(new Promise(() => {}));

    window.sessionStorage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "connect",
        returnUrl: "/en",
        payload: {
          config: {
            redirectURL: "/en",
            name: "Fiber Wallet",
            logo: "icon",
          },
        },
        createdAt: 99,
      }),
    );

    const { default: JoyIdBridgePage } = await import("@/app/joyid-bridge/page");

    render(
      <React.StrictMode>
        <JoyIdBridgePage />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(authWithPopupMock).toHaveBeenCalledTimes(1);
    });
  });

  it("executes a pending sign bridge request and stores the signed tx result", async () => {
    signRawTransactionMock.mockResolvedValue({
      witnesses: ["0xsigned"],
    });

    const bridgeModule = await import("@/lib/joyid/bridge");
    const returnSpy = vi
      .spyOn(bridgeModule, "returnFromJoyIdBridge")
      .mockImplementation(() => {});

    window.sessionStorage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "sign-ckb-raw-tx",
        returnUrl: "/en/channels",
        requestKey: "req-sign",
        payload: {
          tx: { witnesses: ["0x00"] },
          signerAddress: "ckt1qjoyid",
          witnessIndexes: [0],
          config: {
            redirectURL: "/en/channels",
            name: "Fiber Wallet",
            logo: "icon",
          },
        },
        createdAt: Date.now(),
      }),
    );

    const { default: JoyIdBridgePage } = await import("@/app/joyid-bridge/page");
    render(<JoyIdBridgePage />);

    await waitFor(() => {
      expect(signRawTransactionMock).toHaveBeenCalledWith(
        { witnesses: ["0x00"] },
        "ckt1qjoyid",
        expect.objectContaining({
          witnessIndexes: [0],
        }),
      );
    });

    expect(
      JSON.parse(window.sessionStorage.getItem("fiber_joyid_redirect_sign_result")!),
    ).toMatchObject({
      requestKey: "req-sign",
      tx: { witnesses: ["0xsigned"] },
    });
    expect(window.sessionStorage.getItem("fiber_joyid_bridge_request")).toBeNull();
    expect(returnSpy).toHaveBeenCalledWith("/en/channels");

    returnSpy.mockRestore();
  });

  it("shows an error and clears the request when JoyID signing fails", async () => {
    signRawTransactionMock.mockRejectedValue(new Error("sign failed"));

    const bridgeModule = await import("@/lib/joyid/bridge");
    const returnSpy = vi
      .spyOn(bridgeModule, "returnFromJoyIdBridge")
      .mockImplementation(() => {});

    window.sessionStorage.setItem(
      "fiber_joyid_bridge_request",
      JSON.stringify({
        type: "sign-ckb-raw-tx",
        returnUrl: "/en/channels",
        requestKey: "req-sign-fail",
        payload: {
          tx: { witnesses: ["0x00"] },
          signerAddress: "ckt1qjoyid",
          witnessIndexes: [0],
          config: {
            redirectURL: "/en/channels",
            name: "Fiber Wallet",
            logo: "icon",
          },
        },
        createdAt: Date.now(),
      }),
    );

    const { default: JoyIdBridgePage } = await import("@/app/joyid-bridge/page");
    render(<JoyIdBridgePage />);

    expect(
      await screen.findByText(
        "JoyID signing failed. Return to the previous page and try again.",
      ),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("fiber_joyid_bridge_request")).toBeNull();
    expect(returnSpy).not.toHaveBeenCalled();

    returnSpy.mockRestore();
  });
});
