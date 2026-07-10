import { describe, expect, it, vi } from "vitest";
import type { Channel } from "@nervosnetwork/fiber-js";
import {
  assessLocalReadiness,
  checkPaymentReadiness,
  summarizeUsableChannels,
} from "@/lib/paymentInfrastructure/readiness";

function channel(
  overrides: Partial<Channel> & Pick<Channel, "channel_id">,
): Channel {
  return {
    channel_id: overrides.channel_id,
    is_public: true,
    channel_outpoint: "0xoutpoint",
    pubkey: "02peer",
    state: { state_name: "CHANNEL_READY", state_flags: "0x0" },
    local_balance: "0x0",
    offered_tlc_balance: "0x0",
    remote_balance: "0x0",
    received_tlc_balance: "0x0",
    created_at: "0x1",
    enabled: true,
    tlc_expiry_delta: "0x1",
    tlc_fee_proportional_millionths: "0x0",
    ...overrides,
  };
}

const usableChannels = [
  channel({
    channel_id: "0xready",
    state: { state_name: "CHANNEL_READY", state_flags: "0x0" },
    local_balance: "0x64",
    remote_balance: "0xc8",
  }),
  channel({
    channel_id: "0xnormal",
    state: { state_name: "CHANNEL_NORMAL", state_flags: "0x0" },
    local_balance: "0xc8",
    remote_balance: "0x1f4",
  }),
];

describe("payment readiness", () => {
  it("summarizes only enabled ready-state channels", () => {
    const channels = [
      ...usableChannels,
      channel({
        channel_id: "0xdisabled",
        enabled: false,
        local_balance: "0x3e8",
        remote_balance: "0x3e8",
      }),
      channel({
        channel_id: "0xpending",
        state: { state_name: "NEGOTIATING_FUNDING", state_flags: "0x0" },
        local_balance: "0x3e8",
        remote_balance: "0x3e8",
      }),
      channel({
        channel_id: "0xshutdown",
        state: { state_name: "SHUTDOWN", state_flags: "0x0" },
        local_balance: "0x3e8",
        remote_balance: "0x3e8",
      }),
    ];

    expect(summarizeUsableChannels(channels)).toEqual({
      channelsKnown: true,
      usableChannelCount: 2,
      outboundCapacity: 300n,
      inboundCapacity: 700n,
    });
  });

  it("reports a warning when channel data is not available locally", () => {
    expect(
      assessLocalReadiness({
        nodeStatus: "running",
        peerConnected: true,
        channels: null,
        request: { mode: "invoice", invoice: "fibt1invoice" },
      }),
    ).toMatchObject({
      status: "warning",
      summary: { channelsKnown: false },
    });
  });

  it("dry-runs an invoice before reporting ready", async () => {
    const sendPayment = vi.fn().mockResolvedValue({ status: "Created" });

    const result = await checkPaymentReadiness({
      fiber: { sendPayment },
      nodeStatus: "running",
      peerConnected: true,
      channels: usableChannels,
      request: { mode: "invoice", invoice: "fibt1invoice" },
    });

    expect(result.status).toBe("ready");
    expect(sendPayment).toHaveBeenCalledWith({
      invoice: "fibt1invoice",
      allow_self_payment: true,
      dry_run: true,
    });
  });

  it("dry-runs an exact keysend request", async () => {
    const sendPayment = vi.fn().mockResolvedValue({ status: "Created" });

    const result = await checkPaymentReadiness({
      fiber: { sendPayment },
      nodeStatus: "running",
      peerConnected: true,
      channels: usableChannels,
      request: {
        mode: "keysend",
        targetPubkey: "02recipient",
        amount: "0x64",
      },
    });

    expect(result.status).toBe("ready");
    expect(sendPayment).toHaveBeenCalledWith({
      target_pubkey: "02recipient",
      amount: "0x64",
      keysend: true,
      dry_run: true,
    });
  });

  it.each([
    {
      name: "stopped node",
      input: {
        nodeStatus: "stopped",
        peerConnected: true,
        channels: usableChannels,
        request: { mode: "invoice", invoice: "fibt1invoice" } as const,
      },
      code: "node_not_running",
    },
    {
      name: "disconnected peer",
      input: {
        nodeStatus: "running",
        peerConnected: false,
        channels: usableChannels,
        request: { mode: "invoice", invoice: "fibt1invoice" } as const,
      },
      code: "peer_disconnected",
    },
    {
      name: "no usable channel",
      input: {
        nodeStatus: "running",
        peerConnected: true,
        channels: [],
        request: { mode: "invoice", invoice: "fibt1invoice" } as const,
      },
      code: "no_usable_channel",
    },
    {
      name: "insufficient keysend capacity",
      input: {
        nodeStatus: "running",
        peerConnected: true,
        channels: usableChannels,
        request: {
          mode: "keysend",
          targetPubkey: "02recipient",
          amount: "0x12d",
        } as const,
      },
      code: "insufficient_outbound_capacity",
    },
  ])("blocks $name before calling Fiber", async ({ input, code }) => {
    const sendPayment = vi.fn();

    const result = await checkPaymentReadiness({
      fiber: { sendPayment },
      ...input,
    });

    expect(result).toMatchObject({
      status: "blocked",
      diagnostic: { code },
    });
    expect(sendPayment).not.toHaveBeenCalled();
  });

  it("classifies a failed Fiber dry run", async () => {
    const sendPayment = vi
      .fn()
      .mockRejectedValue(new Error("failed to build route: no path found"));

    const result = await checkPaymentReadiness({
      fiber: { sendPayment },
      nodeStatus: "running",
      peerConnected: true,
      channels: usableChannels,
      request: { mode: "invoice", invoice: "fibt1invoice" },
    });

    expect(result).toMatchObject({
      status: "blocked",
      diagnostic: {
        code: "route_not_found",
        technicalDetail: "failed to build route: no path found",
      },
    });
  });
});
