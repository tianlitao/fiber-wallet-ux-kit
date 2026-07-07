import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fiberState, hasFiberIdentityWalletMock, unlockFiberIdentityWalletMock } = vi.hoisted(() => ({
  fiberState: {
    fiber: null,
    status: "idle",
    error: null,
    nodeInfo: null,
    defaultPeerConnected: false,
    startFiber: vi.fn(),
    stopFiber: vi.fn(),
    refreshNodeInfo: vi.fn(),
  },
  hasFiberIdentityWalletMock: vi.fn(),
  unlockFiberIdentityWalletMock: vi.fn(),
}));

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh",
  useParams: () => ({ locale: "zh" }),
  useRouter: () => ({
    replace: replaceMock,
    push: replaceMock,
  }),
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => fiberState,
}));

vi.mock("@/lib/fiberIdentityWallet", () => ({
  hasFiberIdentityWallet: hasFiberIdentityWalletMock,
  unlockFiberIdentityWallet: unlockFiberIdentityWalletMock,
}));

vi.mock("@ckb-ccc/connector-react", () => ({
  ccc: {
    useCcc: () => ({ open: vi.fn(), wallet: null }),
    useSigner: () => null,
    fixedPointToString: (value: string | number | bigint) => String(value),
  },
}));

describe("DashboardPage wallet home", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    hasFiberIdentityWalletMock.mockReset();
    unlockFiberIdentityWalletMock.mockReset();
    hasFiberIdentityWalletMock.mockResolvedValue(false);
  });

  it("redirects to onboarding when no local wallet exists", async () => {
    const [{ default: DashboardPage }, { default: LocaleLayout }] =
      await Promise.all([
        import("@/app/[locale]/page"),
        import("@/app/[locale]/layout"),
      ]);
    render(
      <LocaleLayout params={{ locale: "zh" }}>
        <DashboardPage />
      </LocaleLayout>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/zh/onboarding");
    });
  });

  it("shows the unlock panel and starts Fiber when a local wallet exists", async () => {
    hasFiberIdentityWalletMock.mockResolvedValue(true);
    unlockFiberIdentityWalletMock.mockResolvedValue(Uint8Array.from([1, 2, 3]));

    const [{ default: DashboardPage }, { default: LocaleLayout }] =
      await Promise.all([
        import("@/app/[locale]/page"),
        import("@/app/[locale]/layout"),
      ]);
    render(
      <LocaleLayout params={{ locale: "zh" }}>
        <DashboardPage />
      </LocaleLayout>,
    );

    expect(await screen.findByLabelText("仪表盘")).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText("本地钱包密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "解锁并启动节点" }));

    await waitFor(() => {
      expect(fiberState.startFiber).toHaveBeenCalledWith(Uint8Array.from([1, 2, 3]));
    });
  });
});
