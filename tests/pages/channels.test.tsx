import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useI18n } from "@/lib/i18n/useI18n";

const { fiberState, pathnameState, signerState } = vi.hoisted(() => ({
  fiberState: {
    fiber: {
      listChannels: vi.fn(),
      shutdownChannel: vi.fn(),
    },
    status: "running",
    error: null,
    nodeInfo: null,
    defaultPeerConnected: false,
    prfSupported: true as boolean | "insecure" | null,
    startFiber: vi.fn(),
    stopFiber: vi.fn(),
    refreshNodeInfo: vi.fn(),
  },
  pathnameState: {
    current: "/zh/channels",
  },
  signerState: {
    isConnected: vi.fn(),
    getAddresses: vi.fn(),
    getRecommendedAddress: vi.fn(),
    getBalance: vi.fn(),
    client: {},
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.current,
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => fiberState,
}));

vi.mock("@ckb-ccc/connector-react", () => ({
  ccc: {
    useCcc: () => ({
      open: vi.fn(),
      wallet: null,
    }),
    useSigner: () => signerState,
    fixedPointToString: (value: string | number | bigint) => String(value),
    Address: {
      fromString: vi.fn().mockImplementation(async () => ({
        script: {
          codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
          hashType: "type",
          args: "0xabc",
          eq: () => true,
        },
      })),
    },
    KnownScript: {
      OmniLock: "OmniLock",
      PWLock: "PWLock",
      AnyoneCanPay: "AnyoneCanPay",
      NostrLock: "NostrLock",
      Secp256k1Blake160: "Secp256k1Blake160",
      Secp256k1Multisig: "Secp256k1Multisig",
      Secp256k1MultisigV2: "Secp256k1MultisigV2",
    },
  },
}));

async function renderChannelsWithLocaleLayout(locale: "zh" | "en") {
  const [{ default: ChannelsPage }, { default: LocaleLayout }] =
    await Promise.all([
      import("@/app/[locale]/channels/page"),
      import("@/app/[locale]/layout"),
    ]);

  pathnameState.current = `/${locale}/channels`;

  await act(async () => {
    render(
      <LocaleLayout params={{ locale }}>
        <ChannelsPage />
      </LocaleLayout>,
    );
  });

  await waitFor(() => {
    expect(fiberState.fiber.listChannels).toHaveBeenCalledWith({
      include_closed: true,
    });
  });
}

function InterpolationProbe() {
  const { t } = useI18n();

  return (
    <span data-testid="cleaning-message">
      {t("channelsPage.cleaningPendingChannels", { count: 2 })}
    </span>
  );
}

async function renderInterpolationProbe(locale: "zh" | "en") {
  const { default: LocaleLayout } = await import("@/app/[locale]/layout");

  pathnameState.current = `/${locale}/channels`;

  render(
    <LocaleLayout params={{ locale }}>
      <InterpolationProbe />
    </LocaleLayout>,
  );
}

describe("ChannelsPage", () => {
  beforeEach(() => {
    cleanup();
    pathnameState.current = "/zh/channels";
    fiberState.status = "running";
    fiberState.defaultPeerConnected = true;
    fiberState.fiber.listChannels.mockReset();
    fiberState.fiber.listChannels.mockResolvedValue({ channels: [] });
    fiberState.fiber.shutdownChannel.mockReset();
    fiberState.fiber.shutdownChannel.mockResolvedValue({});
    signerState.isConnected.mockReset();
    signerState.getAddresses.mockReset();
    signerState.getRecommendedAddress.mockReset();
    signerState.getBalance.mockReset();
    signerState.isConnected.mockResolvedValue(true);
    signerState.getAddresses.mockResolvedValue(["ckt1qdefault"]);
    signerState.getRecommendedAddress.mockResolvedValue("ckt1qdefault");
    signerState.getBalance.mockResolvedValue("0");
  });

  it("renders locale-specific single-peer channel labels through the real locale layout", async () => {
    await renderChannelsWithLocaleLayout("zh");

    expect(
      await screen.findByRole("heading", { level: 1, name: "通道" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "打开通道" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "通道列表" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开通道" }));

    expect(
      screen.getByText("默认连接节点"),
    ).toBeInTheDocument();
    expect(screen.queryByText("对端节点")).not.toBeInTheDocument();
    expect(screen.getAllByText("fiber.nervosscan.com").length).toBeGreaterThan(
      0,
    );

    cleanup();

    await renderChannelsWithLocaleLayout("en");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Channels" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Channel" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Channel" }));

    expect(
      screen.getByText("Default Connected Peer"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("fiber.nervosscan.com").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("Peer Node")).not.toBeInTheDocument();
  });

  it("interpolates locale message placeholders through the locale layout", async () => {
    await renderInterpolationProbe("zh");

    expect(screen.getByTestId("cleaning-message")).toHaveTextContent(
      "发现 2 个待处理通道，正在清理...",
    );

    cleanup();

    await renderInterpolationProbe("en");

    expect(screen.getByTestId("cleaning-message")).toHaveTextContent(
      "Found 2 pending channels. Cleaning them up...",
    );
  });

  it("requires the funding amount to be at least 600 CKB", async () => {
    await renderChannelsWithLocaleLayout("en");

    fireEvent.click(screen.getByRole("button", { name: "Open Channel" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. 600"), {
      target: { value: "599" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open & Fund Channel" }));

    expect(
      await screen.findByText("Error: Amount must be at least 600 CKB."),
    ).toBeInTheDocument();
  });

  it("renders the default-peer-required fallback when the default peer is disconnected", async () => {
    fiberState.defaultPeerConnected = false;

    await renderChannelsWithLocaleLayout("en");

    expect(
      await screen.findByText(
        "Wait for fiber.nervosscan.com to connect before using this page.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a friendly stale-channel hint when closing a missing channel", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    fiberState.fiber.listChannels.mockResolvedValue({
      channels: [
        {
          channel_id: "0xaafee7e3b6fe16ea7e27bbc4270247a47b288399bd6b6b279214502396ae816a",
          pubkey: "0xpeer",
          is_public: true,
          local_balance: "60000000000",
          remote_balance: "0",
          state: { state_name: "ChannelReady" },
        },
      ],
    });
    fiberState.fiber.shutdownChannel.mockRejectedValue(
      new Error(
        "Channel not found error: Hash256(0xaafee7e3b6fe16ea7e27bbc4270247a47b288399bd6b6b279214502396ae816a)",
      ),
    );

    await renderChannelsWithLocaleLayout("zh");

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "通道可能已经关闭，或本地通道列表已过期。请刷新通道列表后再试。",
      );
    });

    alertSpy.mockRestore();
  });

  it("shows a friendly broadcast hint when a close transaction cannot be resolved", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    fiberState.fiber.listChannels.mockResolvedValue({
      channels: [
        {
          channel_id: "0x0f19e629de9fbe2fe895f8d426717ca5ab686c8a2167f36de5b72d5b3cf29184",
          pubkey: "0xpeer",
          is_public: true,
          local_balance: "60000000000",
          remote_balance: "0",
          state: { state_name: "ChannelReady" },
        },
      ],
    });
    fiberState.fiber.shutdownChannel.mockRejectedValue(
      new Error(
        "TransactionFailedToResolve: Resolve failed Unknown(OutPoint(0x5a5288769cecde6451cb5d301416c297a6da43dc3ac2f3253542b4082478b19b00000000))",
      ),
    );

    await renderChannelsWithLocaleLayout("zh");

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "通道关闭流程已发起，但关闭交易暂时无法广播，CKB 节点未能解析通道引用的链上输入。请确认节点已同步，稍后刷新通道列表。",
      );
    });

    alertSpy.mockRestore();
  });

  it("hides close actions for shutdown-state channels", async () => {
    fiberState.fiber.listChannels.mockResolvedValue({
      channels: [
        {
          channel_id: "0x0f19e629de9fbe2fe895f8d426717ca5ab686c8a2167f36de5b72d5b3cf29184",
          pubkey: "0xpeer",
          is_public: true,
          local_balance: "60000000000",
          remote_balance: "0",
          state: { state_name: "ChannelShutdown" },
        },
      ],
    });

    await renderChannelsWithLocaleLayout("zh");

    expect(screen.getByText("ChannelShutdown")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "关闭" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "强制关闭" }),
    ).not.toBeInTheDocument();
    expect(fiberState.fiber.shutdownChannel).not.toHaveBeenCalled();
  });
});
