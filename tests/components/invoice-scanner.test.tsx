import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InvoiceScanner from "@/components/InvoiceScanner";
import { zh } from "@/lib/i18n/messages/zh";
import { I18nProvider } from "@/lib/i18n/provider";

describe("InvoiceScanner", () => {
  beforeEach(() => {
    cleanup();
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    vi.unstubAllGlobals();
  });

  it("shows upload fallback when live scanning is unavailable", () => {
    render(
      <I18nProvider locale="zh" messages={zh}>
        <InvoiceScanner onDetected={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByText("当前浏览器不支持实时摄像头扫码。")).toBeInTheDocument();
    expect(screen.getByText("改为上传二维码图片")).toBeInTheDocument();
    expect(screen.getByLabelText("选择二维码图片")).toBeInTheDocument();
  });
});
