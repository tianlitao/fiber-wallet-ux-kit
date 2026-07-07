import React, { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const startMock = vi.fn();
const stopMock = vi.fn();
const nodeInfoMock = vi.fn();
const connectPeerMock = vi.fn();
const listPeersMock = vi.fn();

vi.mock("@nervosnetwork/fiber-js", () => ({
  Fiber: vi.fn().mockImplementation(() => ({
    start: startMock,
    stop: stopMock,
    nodeInfo: nodeInfoMock,
    connectPeer: connectPeerMock,
    listPeers: listPeersMock,
  })),
}));

import { FiberProvider, useFiber } from "@/lib/fiberContext";

function Harness() {
  const { status, startFiber } = useFiber();

  useEffect(() => {
    void startFiber(Uint8Array.from({ length: 32 }, (_, index) => index));
  }, [startFiber]);

  return <div>{status}</div>;
}

describe("FiberProvider", () => {
  beforeEach(() => {
    startMock.mockReset();
    stopMock.mockReset();
    nodeInfoMock.mockReset();
    connectPeerMock.mockReset();
    listPeersMock.mockReset();
    nodeInfoMock.mockResolvedValue({
      pubkey: "0xpubkey",
      version: "0.1.0",
      channel_count: "0x0",
      pending_channel_count: "0x0",
      peers_count: "0x0",
      open_channel_auto_accept_min_ckb_funding_amount: "0x0",
    });
    stopMock.mockResolvedValue(undefined);
    connectPeerMock.mockResolvedValue(undefined);
    listPeersMock.mockResolvedValue({ peers: [] });
  });

  it("starts Fiber from a supplied identity key", async () => {
    render(
      <FiberProvider>
        <Harness />
      </FiberProvider>,
    );

    await waitFor(() => {
      expect(startMock).toHaveBeenCalledWith(
        expect.any(String),
        Uint8Array.from({ length: 32 }, (_, index) => index),
        undefined,
        undefined,
        "info",
        "/wasm",
      );
    });

    expect(screen.getByText("running")).toBeInTheDocument();
  });
});
