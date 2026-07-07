"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/lib/i18n/useI18n";

type InvoiceQrModalProps = {
  open: boolean;
  invoice: string;
  onClose: () => void;
};

export default function InvoiceQrModal({
  open,
  invoice,
  onClose,
}: Readonly<InvoiceQrModalProps>) {
  const { t } = useI18n({ fallback: "en" });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("invoicesPage.qrTitle")}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4">
          <QRCodeSVG
            value={invoice}
            size={320}
            includeMargin
            className="h-auto max-w-full rounded-xl bg-white p-4"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            {t("invoicesPage.closeQr")}
          </button>
        </div>
      </div>
    </div>
  );
}
