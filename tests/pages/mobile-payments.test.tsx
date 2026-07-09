import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fiberState, pathnameState } = vi.hoisted(() => ({
  fiberState: {
    fiber: {},
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
    current: "/zh/payments",
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.current,
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => fiberState,
}));

vi.mock("@/components/InvoiceScanner", () => ({
  default: ({ onDetected }: { onDetected: (value: string) => void }) => (
    <button type="button" onClick={() => onDetected("fiber-invoice-from-scan")}>
      mock-scan
    </button>
  ),
}));

vi.mock("@ckb-ccc/connector-react", () => ({
  ccc: {
    useCcc: () => ({
      open: vi.fn(),
      wallet: null,
    }),
    useSigner: () => null,
    fixedPointToString: (value: string | number | bigint) => String(value),
  },
}));

async function renderPaymentsPage() {
  const [{ default: PaymentsPage }, { default: LocaleLayout }] =
    await Promise.all([
      import("@/app/[locale]/payments/page"),
      import("@/app/[locale]/layout"),
    ]);

  pathnameState.current = "/zh/payments";

  await act(async () => {
    render(
      <LocaleLayout params={{ locale: "zh" }}>
        <PaymentsPage />
      </LocaleLayout>,
    );
  });
}

describe("Mobile payments page", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    pathnameState.current = "/zh/payments";
    fiberState.status = "running";
    fiberState.defaultPeerConnected = true;
    fiberState.fiber = {};
  });

  it("prefills the invoice field from the scanner flow", async () => {
    await renderPaymentsPage();

    fireEvent.click(screen.getByRole("button", { name: "扫码支付" }));
    fireEvent.click(screen.getByRole("button", { name: "mock-scan" }));

    expect(screen.getByDisplayValue("fiber-invoice-from-scan")).toBeInTheDocument();
  });

  it("shows a friendly retry hint when payment route is not ready", async () => {
    fiberState.fiber = {
      sendPayment: vi.fn().mockRejectedValue(
        new Error("Send payment error: Failed to build route, PathFind error: no path found"),
      ),
    };

    await renderPaymentsPage();

    fireEvent.change(screen.getByPlaceholderText("粘贴 Fiber 发票..."), {
      target: { value: "fibt1route-not-ready" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "发送支付" }).at(-1)!);

    await waitFor(() => {
      expect(
        screen.getByText("暂时还没有找到可用支付路径。通道和路由可能还在同步，请稍等一会儿再试。"),
      ).toBeInTheDocument();
    });
  });

  it("shows a friendly retry hint when outbound liquidity is temporarily insufficient", async () => {
    fiberState.fiber = {
      sendPayment: vi.fn().mockRejectedValue({
        code: -32000,
        message:
          "Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 180000000",
      }),
    };

    await renderPaymentsPage();

    fireEvent.change(screen.getByPlaceholderText("粘贴 Fiber 发票..."), {
      target: { value: "fibt1liquidity-not-ready" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "发送支付" }).at(-1)!);

    await waitFor(() => {
      expect(
        screen.getByText("暂时还没有找到可用支付路径。通道和路由可能还在同步，请稍等一会儿再试。"),
      ).toBeInTheDocument();
    });
  });
});
