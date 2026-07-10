import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readyChannel = {
  channel_id: "0xready",
  state: { state_name: "CHANNEL_READY", state_flags: "0x0" },
  enabled: true,
  local_balance: "0x3b9aca00",
  remote_balance: "0x3b9aca00",
};

const { fiberState, pathnameState } = vi.hoisted(() => ({
  fiberState: {
    fiber: {} as any,
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
    current: "/zh/invoices",
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
    useSigner: () => null,
    fixedPointToString: (value: string | number | bigint) => String(value),
  },
}));

async function renderWithLocaleLayout(
  locale: "zh" | "en",
  pathname: "/invoices" | "/payments",
) {
  const pageImport =
    pathname === "/invoices"
      ? import("@/app/[locale]/invoices/page")
      : import("@/app/[locale]/payments/page");
  const [{ default: Page }, { default: LocaleLayout }] = await Promise.all([
    pageImport,
    import("@/app/[locale]/layout"),
  ]);

  pathnameState.current = `/${locale}${pathname}`;

  await act(async () => {
    render(
      <LocaleLayout params={{ locale }}>
        <Page />
      </LocaleLayout>,
    );
  });
}

describe("Invoices and Payments pages", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    pathnameState.current = "/zh/invoices";
    fiberState.fiber = {};
    fiberState.status = "running";
    fiberState.defaultPeerConnected = true;
  });

  it("renders localized zh invoices headings through the real locale layout", async () => {
    await renderWithLocaleLayout("zh", "/invoices");

    expect(
      await screen.findByRole("heading", { level: 1, name: "发票" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "创建发票" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "最近发票" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查询发票" }));

    expect(
      screen.getByPlaceholderText("例如 0x..."),
    ).toBeInTheDocument();
  });

  it("renders localized zh payments headings through the real locale layout", async () => {
    await renderWithLocaleLayout("zh", "/payments");

    expect(
      await screen.findByRole("heading", { level: 1, name: "支付" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "发送支付" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "最近支付" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查询状态" }));

    expect(
      screen.getByPlaceholderText("例如 0x..."),
    ).toBeInTheDocument();
  });

  it("renders recent invoice timestamps using the selected route locale and supports en content", async () => {
    const toLocaleStringSpy = vi
      .spyOn(Date.prototype, "toLocaleString")
      .mockImplementation(function mockToLocaleString(locales) {
        return `stamp:${String(locales ?? "default")}`;
      });

    window.localStorage.setItem(
      "fiber_recent_invoices",
      JSON.stringify([
        {
          paymentHash: "0xabc",
          status: "Open",
          amount: "100000000",
          description: "English invoice",
          source: "create",
          updatedAt: 1_700_000_000_000,
        },
      ]),
    );

    await renderWithLocaleLayout("en", "/invoices");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Invoices" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("stamp:en")).toBeInTheDocument();

    toLocaleStringSpy.mockRestore();
  });

  it("localizes recent invoice and payment status labels on zh routes", async () => {
    window.localStorage.setItem(
      "fiber_recent_invoices",
      JSON.stringify([
        {
          paymentHash: "0xinvoice",
          status: "Open",
          amount: "100000000",
          description: "测试发票",
          source: "lookup",
          updatedAt: 1_700_000_000_000,
        },
      ]),
    );
    window.localStorage.setItem(
      "fiber_recent_payments",
      JSON.stringify([
        {
          paymentHash: "0xpayment",
          status: "Success",
          fee: "1000",
          mode: "lookup",
          updatedAt: 1_700_000_000_000,
        },
      ]),
    );

    await renderWithLocaleLayout("zh", "/invoices");

    expect(
      await screen.findByRole("heading", { level: 1, name: "发票" }),
    ).toBeInTheDocument();
    expect(screen.getByText("待支付")).toBeInTheDocument();
    expect(screen.queryByText("Open")).not.toBeInTheDocument();

    cleanup();

    await renderWithLocaleLayout("zh", "/payments");

    expect(
      await screen.findByRole("heading", { level: 1, name: "支付" }),
    ).toBeInTheDocument();
    expect(screen.getByText("成功")).toBeInTheDocument();
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
  });

  it("refreshes open recent invoices from Fiber status lookups", async () => {
    fiberState.fiber = {
      getInvoice: vi.fn().mockResolvedValue({
        status: "Paid",
        invoice: {
          currency: "Fibt",
          amount: "180000000",
          data: {
            timestamp: "0x1",
            payment_hash: "0xpaidinvoice",
            attrs: [{ Description: "测试发票" }],
          },
        },
      }),
    };
    window.localStorage.setItem(
      "fiber_recent_invoices",
      JSON.stringify([
        {
          paymentHash: "0xpaidinvoice",
          status: "Open",
          amount: "180000000",
          invoice: "fibt1paidinvoice",
          invoiceAddress: "fibt1paidinvoice",
          description: "测试发票",
          source: "create",
          updatedAt: 1_700_000_000_000,
        },
      ]),
    );

    await renderWithLocaleLayout("zh", "/invoices");

    await waitFor(() => {
      expect(screen.getByText("已支付")).toBeInTheDocument();
    });
    expect(screen.queryByText("待支付")).not.toBeInTheDocument();
    expect(fiberState.fiber.getInvoice).toHaveBeenCalledWith({
      payment_hash: "0xpaidinvoice",
    });
    expect(screen.getAllByText("创建").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/fibt1paidinvoice/)).toBeInTheDocument();
  });

  it("renders the non-running payments fallback through the real locale layout", async () => {
    fiberState.status = "idle";
    fiberState.fiber = null as any;

    await renderWithLocaleLayout("zh", "/payments");

    expect(
      await screen.findByRole("heading", { level: 1, name: "支付" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("请先在仪表盘中启动 Fiber 节点。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "发送支付" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "发送支付" }).at(-1),
    ).toBeDisabled();
  });

  it("renders the default-peer-required fallback when the default peer is disconnected", async () => {
    fiberState.defaultPeerConnected = false;

    await renderWithLocaleLayout("zh", "/payments");

    expect(
      await screen.findByText("请先等待与 fiber.nervosscan.com 建立连接后再使用本页。"),
    ).toBeInTheDocument();
  });

  it("checks invoice readiness and clears the result when the request changes", async () => {
    const sendPayment = vi.fn().mockResolvedValue({ status: "Created" });
    fiberState.fiber = {
      listChannels: vi.fn().mockResolvedValue({ channels: [readyChannel] }),
      sendPayment,
    };

    await renderWithLocaleLayout("en", "/payments");

    const invoiceInput = screen.getByLabelText("Invoice String");
    fireEvent.change(invoiceInput, {
      target: { value: "fibt1invoice" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Check payment readiness" }),
    );

    expect(await screen.findByText("Ready to pay")).toBeInTheDocument();
    expect(sendPayment).toHaveBeenCalledWith({
      invoice: "fibt1invoice",
      allow_self_payment: true,
      dry_run: true,
    });

    fireEvent.change(invoiceInput, {
      target: { value: "fibt1changed" },
    });

    expect(screen.queryByText("Ready to pay")).not.toBeInTheDocument();
  });

  it("runs a dry run before sending the real invoice payment", async () => {
    const sendPayment = vi
      .fn()
      .mockResolvedValueOnce({ status: "Created" })
      .mockResolvedValueOnce({
        payment_hash: "0xpaid",
        status: "Success",
        created_at: "0x1",
        last_updated_at: "0x1",
        fee: "0x0",
      });
    fiberState.fiber = {
      listChannels: vi.fn().mockResolvedValue({ channels: [readyChannel] }),
      sendPayment,
    };

    await renderWithLocaleLayout("en", "/payments");

    fireEvent.change(screen.getByLabelText("Invoice String"), {
      target: { value: "fibt1invoice" },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Send Payment" }).at(-1)!,
    );

    await waitFor(() => expect(sendPayment).toHaveBeenCalledTimes(2));
    expect(sendPayment.mock.calls[0][0]).toMatchObject({ dry_run: true });
    expect(sendPayment.mock.calls[1][0]).toEqual({
      invoice: "fibt1invoice",
      allow_self_payment: true,
    });
  });

  it("blocks a real payment when the dry run cannot find a route", async () => {
    const sendPayment = vi
      .fn()
      .mockRejectedValue(new Error("failed to build route: no path found"));
    fiberState.fiber = {
      listChannels: vi.fn().mockResolvedValue({ channels: [readyChannel] }),
      sendPayment,
    };

    await renderWithLocaleLayout("en", "/payments");

    fireEvent.change(screen.getByLabelText("Invoice String"), {
      target: { value: "fibt1blocked" },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Send Payment" }).at(-1)!,
    );

    expect(
      await screen.findByText(
        "No route is available. Wait for routing data to sync or try another channel.",
      ),
    ).toBeInTheDocument();
    expect(sendPayment).toHaveBeenCalledTimes(1);
    expect(sendPayment).toHaveBeenCalledWith(
      expect.objectContaining({ dry_run: true }),
    );
  });
});
