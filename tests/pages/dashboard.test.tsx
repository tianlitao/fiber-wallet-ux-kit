import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fiberState,
  hasFiberIdentityWalletMock,
  generateFiberIdentityMnemonicMock,
  saveFiberIdentityWalletMock,
  unlockFiberIdentityWalletMock,
  deleteFiberIdentityWalletMock,
} = vi.hoisted(() => ({
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
  generateFiberIdentityMnemonicMock: vi.fn(),
  saveFiberIdentityWalletMock: vi.fn(),
  unlockFiberIdentityWalletMock: vi.fn(),
  deleteFiberIdentityWalletMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh",
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => fiberState,
}));

vi.mock("@/lib/fiberIdentityWallet", () => ({
  hasFiberIdentityWallet: hasFiberIdentityWalletMock,
  generateFiberIdentityMnemonic: generateFiberIdentityMnemonicMock,
  saveFiberIdentityWallet: saveFiberIdentityWalletMock,
  unlockFiberIdentityWallet: unlockFiberIdentityWalletMock,
  deleteFiberIdentityWallet: deleteFiberIdentityWalletMock,
}));

vi.mock("@ckb-ccc/connector-react", () => ({
  ccc: {
    useCcc: () => ({ open: vi.fn(), wallet: null }),
    useSigner: () => null,
    fixedPointToString: (value: string | number | bigint) => String(value),
  },
}));

async function renderDashboardWithLocaleLayout() {
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
}

describe("DashboardPage", () => {
  beforeEach(() => {
    fiberState.status = "idle";
    fiberState.error = null;
    fiberState.nodeInfo = null;
    fiberState.defaultPeerConnected = false;
    fiberState.startFiber.mockReset();
    fiberState.stopFiber.mockReset();
    fiberState.refreshNodeInfo.mockReset();
    hasFiberIdentityWalletMock.mockReset();
    generateFiberIdentityMnemonicMock.mockReset();
    saveFiberIdentityWalletMock.mockReset();
    unlockFiberIdentityWalletMock.mockReset();
    deleteFiberIdentityWalletMock.mockReset();
    hasFiberIdentityWalletMock.mockResolvedValue(false);
    generateFiberIdentityMnemonicMock.mockReturnValue(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    );
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("shows create and import actions when no local identity wallet exists", async () => {
    await renderDashboardWithLocaleLayout();

    expect(
      await screen.findByRole("button", { name: "创建钱包" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "导入钱包" }),
    ).toBeInTheDocument();
  });

  it("creates a wallet and returns to the locked state", async () => {
    await renderDashboardWithLocaleLayout();

    fireEvent.click(await screen.findByRole("button", { name: "创建钱包" }));
    expect(
      await screen.findByRole("button", { name: "保存钱包" }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByLabelText("我已安全备份这 12 个单词"));
    fireEvent.change(await screen.findByLabelText("本地钱包密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "保存钱包" }));

    await waitFor(() => {
      expect(saveFiberIdentityWalletMock).toHaveBeenCalledWith(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        "password123",
      );
    });
  });

  it("unlocks a stored wallet and starts Fiber with the derived key", async () => {
    hasFiberIdentityWalletMock.mockResolvedValue(true);
    unlockFiberIdentityWalletMock.mockResolvedValue(Uint8Array.from([1, 2, 3]));

    await renderDashboardWithLocaleLayout();

    fireEvent.change(await screen.findByLabelText("钱包密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "解锁并启动节点" }));

    await waitFor(() => {
      expect(fiberState.startFiber).toHaveBeenCalledWith(
        Uint8Array.from([1, 2, 3]),
      );
    });
  });

  it("deletes a stored wallet and returns to the empty state", async () => {
    hasFiberIdentityWalletMock.mockResolvedValue(true);

    await renderDashboardWithLocaleLayout();

    fireEvent.click(await screen.findByRole("button", { name: "删除本地钱包" }));

    await waitFor(() => {
      expect(deleteFiberIdentityWalletMock).toHaveBeenCalledTimes(1);
    });
  });

  it("copies the complete node pubkey and shows localized feedback", async () => {
    const pubkey =
      "0376333505e0cfc13bf2ffee4e55027606388b24f00acf418f6535d89cd30749da";
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    fiberState.status = "running";
    fiberState.nodeInfo = {
      pubkey,
      version: "0.6.0",
      channel_count: "0x1",
      peers_count: "0x1",
      open_channel_auto_accept_min_ckb_funding_amount: "0x0",
    };

    await renderDashboardWithLocaleLayout();

    fireEvent.click(
      await screen.findByRole("button", { name: "复制节点公钥" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(pubkey);
      expect(screen.getByText("已复制")).toBeInTheDocument();
    });
  });

  it("shows localized feedback when node pubkey copy fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    fiberState.status = "running";
    fiberState.nodeInfo = {
      pubkey:
        "0376333505e0cfc13bf2ffee4e55027606388b24f00acf418f6535d89cd30749da",
      version: "0.6.0",
      channel_count: "0x1",
      peers_count: "0x1",
      open_channel_auto_accept_min_ckb_funding_amount: "0x0",
    };

    await renderDashboardWithLocaleLayout();

    const copyButton = await screen.findByRole("button", {
      name: "复制节点公钥",
    });
    fireEvent.click(copyButton);

    expect(await screen.findByText("复制失败")).toBeInTheDocument();
    expect(copyButton).toBeEnabled();
  });
});
