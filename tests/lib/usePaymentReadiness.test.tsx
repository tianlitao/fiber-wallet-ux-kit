import React from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Channel } from "@nervosnetwork/fiber-js";
import { usePaymentReadiness } from "@/lib/paymentInfrastructure";

const channels = [
  {
    channel_id: "0xready",
    state: { state_name: "CHANNEL_READY", state_flags: "0x0" },
    enabled: true,
    local_balance: "0x64",
    remote_balance: "0x64",
  } as Channel,
];

const invoiceRequest = {
  mode: "invoice",
  invoice: "fibt1invoice",
} as const;

describe("usePaymentReadiness", () => {
  it("checks readiness and invalidates a previous result", async () => {
    const sendPayment = vi.fn().mockResolvedValue({ status: "Created" });
    const { result } = renderHook(() =>
      usePaymentReadiness({
        fiber: { sendPayment },
        nodeStatus: "running",
        peerConnected: true,
        channels,
      }),
    );

    await act(async () => {
      await result.current.check(invoiceRequest);
    });

    expect(result.current.checking).toBe(false);
    expect(result.current.result?.status).toBe("ready");

    act(() => result.current.invalidate());

    expect(result.current.result).toBeNull();
  });

  it("keeps the latest result when an older request finishes last", async () => {
    let rejectFirst!: (reason: Error) => void;
    let resolveSecond!: (value: unknown) => void;
    const first = new Promise((_, reject) => {
      rejectFirst = reject;
    });
    const second = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    const sendPayment = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const { result } = renderHook(() =>
      usePaymentReadiness({
        fiber: { sendPayment },
        nodeStatus: "running",
        peerConnected: true,
        channels,
      }),
    );

    let firstCheck!: Promise<unknown>;
    let secondCheck!: Promise<unknown>;
    act(() => {
      firstCheck = result.current.check({
        mode: "invoice",
        invoice: "fibt1old",
      });
      secondCheck = result.current.check({
        mode: "invoice",
        invoice: "fibt1new",
      });
    });

    expect(result.current.checking).toBe(true);

    await act(async () => {
      resolveSecond({ status: "Created" });
      await secondCheck;
    });
    expect(result.current.result?.status).toBe("ready");
    expect(result.current.checking).toBe(false);

    await act(async () => {
      rejectFirst(new Error("failed to build route: no path found"));
      await firstCheck;
    });

    expect(result.current.result?.status).toBe("ready");
    expect(result.current.checking).toBe(false);
  });
});
