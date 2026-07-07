import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fiberState, pathnameState } = vi.hoisted(() => ({
  fiberState: {
    fiber: {
      newInvoice: vi.fn(),
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

async function renderWithLocaleLayout(locale: "zh" | "en") {
  const [{ default: InvoicesPage }, { default: LocaleLayout }] =
    await Promise.all([
      import("@/app/[locale]/invoices/page"),
      import("@/app/[locale]/layout"),
    ]);

  pathnameState.current = `/${locale}/invoices`;

  await act(async () => {
    render(
      <LocaleLayout params={{ locale }}>
        <InvoicesPage />
      </LocaleLayout>,
    );
  });
}

describe("Mobile invoices page", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    pathnameState.current = "/zh/invoices";
    fiberState.status = "running";
    fiberState.defaultPeerConnected = true;
    fiberState.fiber.newInvoice.mockReset();
  });

  it("shows the receive QR card after creating an invoice through the localized page", async () => {
    fiberState.fiber.newInvoice.mockResolvedValue({
      invoice_address: "ckt1qexampleinvoiceaddress",
      invoice: {
        currency: "Fibt",
        amount: "0x5f5e100",
        data: {
          timestamp: "0x1",
          payment_hash: "0xabc123",
          attrs: [],
        },
      },
    });

    await renderWithLocaleLayout("zh");

    fireEvent.change(screen.getByPlaceholderText("例如 1"), {
      target: { value: " 1.5 " },
    });
    fireEvent.change(screen.getByPlaceholderText("这张发票是做什么的？"), {
      target: { value: "测试收款" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建发票" }));

    expect(fiberState.fiber.newInvoice).toHaveBeenCalledTimes(1);
    expect(fiberState.fiber.newInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "0x8f0d180",
        description: "测试收款",
        currency: "Fibt",
      }),
    );
    expect(
      await screen.findByRole("heading", { level: 3, name: "收款二维码" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "放大二维码" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ckt1qexampleinvoiceaddress"),
    ).toBeInTheDocument();
  });
});
