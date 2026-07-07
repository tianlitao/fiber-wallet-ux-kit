import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";

describe("mobile payment i18n messages", () => {
  it("defines the mobile navigation labels", () => {
    expect(en.mobileNav.dashboard).toBe("Dashboard");
    expect(zh.mobileNav.dashboard).toBe("仪表盘");
    expect(en.mobileNav.channels).toBe("Channels");
    expect(zh.mobileNav.channels).toBe("通道");
    expect(en.mobileNav.invoices).toBe("Invoices");
    expect(zh.mobileNav.invoices).toBe("发票");
    expect(en.mobileNav.payments).toBe("Payments");
    expect(zh.mobileNav.payments).toBe("支付");
  });

  it("defines the invoice QR labels", () => {
    expect(en.invoicesPage.qrTitle).toBe("Invoice QR");
    expect(zh.invoicesPage.qrTitle).toBe("收款二维码");
    expect(en.invoicesPage.qrSubtitle).toBe("Show this code to the payer");
    expect(zh.invoicesPage.qrSubtitle).toBe("向付款方展示此二维码");
    expect(en.invoicesPage.showLargeQr).toBe("Show larger QR");
    expect(zh.invoicesPage.showLargeQr).toBe("放大二维码");
    expect(en.invoicesPage.closeQr).toBe("Close QR");
    expect(zh.invoicesPage.closeQr).toBe("关闭二维码");
    expect(en.invoicesPage.copyInvoice).toBe("Copy invoice");
    expect(zh.invoicesPage.copyInvoice).toBe("复制发票");
    expect(en.invoicesPage.copyInvoiceAddress).toBe("Copy invoice address");
    expect(zh.invoicesPage.copyInvoiceAddress).toBe("复制发票地址");
    expect(en.invoicesPage.copyPaymentHash).toBe("Copy payment hash");
    expect(zh.invoicesPage.copyPaymentHash).toBe("复制支付哈希");
    expect(en.invoicesPage.qrGenerationFailed).toBe(
      "QR code could not be generated. You can still copy the invoice.",
    );
    expect(zh.invoicesPage.qrGenerationFailed).toBe(
      "二维码生成失败，你仍然可以复制发票内容。",
    );
  });

  it("defines the payment scanner labels", () => {
    expect(en.paymentsPage.scannerTitle).toBe("Scan invoice QR");
    expect(zh.paymentsPage.scannerTitle).toBe("扫描发票二维码");
    expect(en.paymentsPage.scanInvoice).toBe("Scan Invoice");
    expect(zh.paymentsPage.scanInvoice).toBe("扫码支付");
    expect(en.paymentsPage.scannerStart).toBe("Start camera");
    expect(zh.paymentsPage.scannerStart).toBe("开启摄像头");
    expect(en.paymentsPage.scannerStop).toBe("Stop camera");
    expect(zh.paymentsPage.scannerStop).toBe("停止扫码");
    expect(en.paymentsPage.scannerPermissionDenied).toBe("Camera permission was denied.");
    expect(zh.paymentsPage.scannerPermissionDenied).toBe("未获得摄像头权限。");
    expect(en.paymentsPage.scannerUnsupported).toBe(
      "Live camera scanning is not supported on this browser.",
    );
    expect(zh.paymentsPage.scannerUnsupported).toBe(
      "当前浏览器不支持实时摄像头扫码。",
    );
    expect(en.paymentsPage.scannerUploadFallback).toBe("Upload a QR image instead");
    expect(zh.paymentsPage.scannerUploadFallback).toBe("改为上传二维码图片");
    expect(en.paymentsPage.scannerUploadLabel).toBe("Choose a QR image");
    expect(zh.paymentsPage.scannerUploadLabel).toBe("选择二维码图片");
    expect(en.paymentsPage.scannerUploadError).toBe(
      "No valid invoice QR code was found in this image.",
    );
    expect(zh.paymentsPage.scannerUploadError).toBe(
      "未能从图片中识别出有效的发票二维码。",
    );
    expect(en.paymentsPage.scannerReady).toBe("Invoice scanned. Review and pay.");
    expect(zh.paymentsPage.scannerReady).toBe("发票已识别，请确认后支付。");
  });
});
