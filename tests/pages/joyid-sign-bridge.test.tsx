import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { decodeSearch } from "@joyid/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM,
  getJoyIdSignRedirectRequestStorageKey,
  storeJoyIdSignRedirectRequest,
} from "@/lib/joyIdRedirect";
import JoyIdSignBridgePage from "@/app/joyid-sign-bridge/page";

describe("JoyID sign bridge page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(
      null,
      "",
      `/joyid-sign-bridge?${JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM}=req-1`,
    );
    vi.restoreAllMocks();
  });

  it("keeps a stored request available across React StrictMode remounts", async () => {
    storeJoyIdSignRedirectRequest("req-1", {
      appIcon: "https://localhost/icon.png",
      appName: "Fiber Wallet UX Kit",
      joyidAppURL: "https://testnet.joyid.dev",
      redirectURL: "https://localhost/joyid-sign-bridge",
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
    });

    const popup = {
      closed: false,
      close: vi.fn(),
    };
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);

    render(
      <React.StrictMode>
        <JoyIdSignBridgePage />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });

    expect(
      window.localStorage.getItem(
        getJoyIdSignRedirectRequestStorageKey("req-1"),
      ),
    ).not.toBeNull();
    expect(
      screen.queryByText("JoyID request expired. Please try again."),
    ).not.toBeInTheDocument();
  });

  it("opens stored JoyID auth requests through the bridge popup", async () => {
    window.history.replaceState(
      null,
      "",
      `/joyid-sign-bridge?${JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM}=auth-1`,
    );
    window.localStorage.setItem(
      "fiber-joyid-auth-request:auth-1",
      JSON.stringify({
        addressPrefix: "ckt",
        appIcon: "https://localhost/icon.png",
        appName: "Fiber Wallet UX Kit",
        joyidAppURL: "https://testnet.joyid.dev",
        redirectURL: "https://localhost/joyid-sign-bridge",
      }),
    );
    const popup = {
      closed: false,
      close: vi.fn(),
    };
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);

    render(<JoyIdSignBridgePage />);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });

    const joyIdUrl = new URL(String(openSpy.mock.calls[0][0]));
    const data = decodeSearch(joyIdUrl.searchParams.get("_data_") ?? "");

    expect(joyIdUrl.origin).toBe("https://testnet.joyid.dev");
    expect(joyIdUrl.pathname).toBe("/auth");
    expect(joyIdUrl.searchParams.get("type")).toBe("popup");
    expect(data.redirectURL).toBe(window.location.href);
    expect(data.name).toBe("Fiber Wallet UX Kit");
    expect(
      screen.queryByText("JoyID request expired. Please try again."),
    ).not.toBeInTheDocument();
  });
});
