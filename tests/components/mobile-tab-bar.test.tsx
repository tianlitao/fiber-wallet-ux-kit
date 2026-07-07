import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MobileTabBar from "@/components/MobileTabBar";
import { zh } from "@/lib/i18n/messages/zh";
import { I18nProvider } from "@/lib/i18n/provider";

const { fiberState } = vi.hoisted(() => ({
  fiberState: {
    status: "running",
    defaultPeerConnected: false,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh/payments",
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => fiberState,
}));

describe("MobileTabBar", () => {
  it("renders localized locale-aware tabs and marks the active route", () => {
    render(
      <I18nProvider locale="zh" messages={zh}>
        <MobileTabBar />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "移动导航" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "仪表盘" })).toHaveAttribute(
      "href",
      "/zh",
    );
    expect(screen.getByRole("link", { name: "通道" })).toHaveAttribute(
      "href",
      "/zh/channels",
    );
    expect(screen.getByRole("link", { name: "发票" })).toHaveAttribute(
      "href",
      "/zh/invoices",
    );
    expect(screen.getByRole("link", { name: "支付" })).toHaveAttribute(
      "href",
      "/zh/payments",
    );
    expect(screen.getByRole("link", { name: "支付" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
