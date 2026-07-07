"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/lib/i18n/useI18n";

type InvoiceQrCardProps = {
  invoice: string;
  invoiceAddress?: string;
  paymentHash?: string;
  onShowLarge: () => void;
};

export default function InvoiceQrCard({
  invoice,
  invoiceAddress,
  paymentHash,
  onShowLarge,
}: Readonly<InvoiceQrCardProps>) {
  const { t } = useI18n({ fallback: "en" });

  async function copyText(value: string | undefined) {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(value);
  }

  return (
    <>
      <section className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">
            {t("invoicesPage.qrTitle")}
          </h3>
          <p className="mt-1 text-sm text-white/60">
            {t("invoicesPage.qrSubtitle")}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <QRCodeSVG
            value={invoice}
            size={176}
            includeMargin
            className="rounded-xl bg-white p-3"
          />

          <div className="flex w-full flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(invoice)}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              {t("invoicesPage.copyInvoice")}
            </button>
            <button
              type="button"
              onClick={() => copyText(invoiceAddress)}
              disabled={!invoiceAddress}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("invoicesPage.copyInvoiceAddress")}
            </button>
            <button
              type="button"
              onClick={() => copyText(paymentHash)}
              disabled={!paymentHash}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("invoicesPage.copyPaymentHash")}
            </button>
            <button
              type="button"
              onClick={onShowLarge}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {t("invoicesPage.showLargeQr")}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
