import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useI18n } from "@/lib/i18n/useI18n";

const { fiberState, pathnameState, signerState } = vi.hoisted(() => ({
  fiberState: {
    fiber: {
      listChannels: vi.fn(),
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
      JoyId: "JoyId",
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
    const pageMain = screen.getByRole("main");

    expect(
      await screen.findByRole("heading", { level: 1, name: "通道" }),
    ).toBeInTheDocument();
    expect(within(pageMain).getByRole("button", { name: "打开通道" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "通道列表" }),
    ).toBeInTheDocument();

    fireEvent.click(within(pageMain).getByRole("button", { name: "打开通道" }));

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
    const pageMainEn = screen.getByRole("main");
    expect(within(pageMainEn).getByRole("button", { name: "Open Channel" })).toBeInTheDocument();

    fireEvent.click(within(pageMainEn).getByRole("button", { name: "Open Channel" }));

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
    const pageMain = screen.getByRole("main");

    fireEvent.click(within(pageMain).getByRole("button", { name: "Open Channel" }));
    fireEvent.change(screen.getByLabelText("Funding Amount (CKB)"), {
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

  it("keeps the mobile FAB action label aligned with form toggle state", async () => {
    await renderChannelsWithLocaleLayout("en");
    const pageMain = screen.getByRole("main");

    expect(screen.getAllByRole("button", { name: "Open Channel" }).length).toBeGreaterThanOrEqual(2);

    fireEvent.click(within(pageMain).getByRole("button", { name: "Open Channel" }));

    expect(screen.getByLabelText("Funding Amount (CKB)")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cancel" }).length).toBeGreaterThanOrEqual(2);
  });
});
