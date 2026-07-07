import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InvoiceQrCard from "@/components/InvoiceQrCard";
import { zh } from "@/lib/i18n/messages/zh";
import { I18nProvider } from "@/lib/i18n/provider";

describe("InvoiceQrCard", () => {
  it("renders zh invoice QR copy and invokes onShowLarge", () => {
    const onShowLarge = vi.fn();

    render(
      <I18nProvider locale="zh" messages={zh}>
        <InvoiceQrCard
          invoice="lnfib1234567890"
          invoiceAddress="ckt1qexample"
          paymentHash="0xabc123"
          onShowLarge={onShowLarge}
        />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "收款二维码" }),
    ).toBeInTheDocument();
    expect(screen.getByText("向付款方展示此二维码")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "复制发票" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "复制发票地址" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "复制支付哈希" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "放大二维码" }));

    expect(onShowLarge).toHaveBeenCalledTimes(1);
  });

  it("disables copy actions when invoice address or payment hash are absent", () => {
    render(
      <I18nProvider locale="zh" messages={zh}>
        <InvoiceQrCard invoice="lnfib1234567890" onShowLarge={vi.fn()} />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("button", { name: "复制发票地址" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "复制支付哈希" }),
    ).toBeDisabled();
  });
});
