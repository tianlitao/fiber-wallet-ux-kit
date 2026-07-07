import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh/channels",
}));

vi.mock("@/lib/i18n/useI18n", () => ({
  useI18n: () => ({
    locale: "zh",
    hasProvider: true,
    t: (key: string) => {
      const map: Record<string, string> = {
        "nav.dashboard": "仪表盘",
        "nav.channels": "通道",
        "nav.invoices": "发票",
        "nav.payments": "支付",
        "app.testnet": "测试网",
        "nav.defaultPeer": "默认节点",
        "nav.connected": "已连接",
        "nav.connecting": "连接中",
        "nav.offline": "离线",
        "nav.statusIdle": "空闲",
        "nav.statusStarting": "启动中",
        "nav.statusRunning": "运行中",
        "nav.statusStopped": "已停止",
        "nav.statusError": "错误",
        "shell.fabOpenChannel": "打开通道",
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => ({
    status: "running",
    defaultPeerConnected: true,
  }),
}));

describe("WalletShell", () => {
  it("renders icon-only desktop navigation with accessible labels and a mobile FAB", async () => {
    const { default: WalletShell } = await import("@/components/shell/WalletShell");

    render(
      <WalletShell
        fab={{
          mobileLabel: "打开通道",
          onClick: vi.fn(),
        }}
      >
        <div>content</div>
      </WalletShell>,
    );

    expect(screen.getByLabelText("仪表盘")).toBeInTheDocument();
    expect(screen.getByLabelText("通道")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("发票")).toBeInTheDocument();
    expect(screen.getByLabelText("支付")).toBeInTheDocument();
    const desktopRail = screen.getByLabelText("仪表盘").closest("aside");
    expect(desktopRail).not.toBeNull();
    expect(within(desktopRail as HTMLElement).queryByText("仪表盘")).not.toBeInTheDocument();
    expect(within(desktopRail as HTMLElement).queryByText("通道")).not.toBeInTheDocument();
    expect(within(desktopRail as HTMLElement).queryByText("发票")).not.toBeInTheDocument();
    expect(within(desktopRail as HTMLElement).queryByText("支付")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开通道" })).toBeInTheDocument();
  });
});
