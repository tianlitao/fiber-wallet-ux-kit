import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh",
}));

vi.mock("@/lib/i18n/useI18n", () => ({
  useI18n: () => ({
    locale: "zh",
    hasProvider: true,
    t: (key: string) =>
      ({
        "nav.dashboard": "仪表盘",
        "nav.channels": "通道",
        "nav.invoices": "发票",
        "nav.payments": "支付",
        "nav.languageChinese": "中文",
        "nav.languageEnglish": "English",
        "nav.defaultPeer": "默认节点",
        "nav.connected": "已连接",
        "nav.connecting": "连接中",
        "nav.offline": "离线",
        "nav.statusIdle": "空闲",
        "nav.statusStarting": "启动中",
        "nav.statusRunning": "运行中",
        "nav.statusStopped": "已停止",
        "nav.statusError": "错误",
        "app.testnet": "测试网",
      }[key] ?? key),
  }),
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => ({
    status: "idle",
    defaultPeerConnected: false,
  }),
}));

describe("DesktopIconRail", () => {
  it("exposes icon-only links through accessible labels", async () => {
    const { default: DesktopIconRail } = await import("@/components/shell/DesktopIconRail");
    render(<DesktopIconRail />);

    expect(screen.getByLabelText("仪表盘")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("通道")).toBeInTheDocument();
    expect(screen.getByLabelText("发票")).toBeInTheDocument();
    expect(screen.getByLabelText("支付")).toBeInTheDocument();
  });
});

describe("TopUtilityBar", () => {
  it("does not append the default peer host when the peer is disconnected", async () => {
    const { default: TopUtilityBar } = await import("@/components/shell/TopUtilityBar");

    render(<TopUtilityBar />);

    expect(screen.getByText("空闲")).toBeInTheDocument();
    expect(screen.queryByText(/fiber\.nervosscan\.com/)).not.toBeInTheDocument();
  });
});
