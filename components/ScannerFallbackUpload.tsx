"use client";

import React from "react";
import { decodeQrFromImageFile, isLikelyInvoice } from "@/lib/qr/scan";
import { useI18n } from "@/lib/i18n/useI18n";

type ScannerFallbackUploadProps = {
  onDetected: (value: string) => void;
  onError: (message: string) => void;
};

export default function ScannerFallbackUpload({
  onDetected,
  onError,
}: Readonly<ScannerFallbackUploadProps>) {
  const { t } = useI18n();

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const decoded = await decodeQrFromImageFile(file);

      if (decoded && isLikelyInvoice(decoded)) {
        onDetected(decoded);
        return;
      }
    } catch {
      // Surface the shared localized error below.
    }

    onError(t("paymentsPage.scannerUploadError"));
  }

  return (
    <label className="block cursor-pointer rounded-lg border border-dashed border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-white/80">
      <span className="block mb-1">{t("paymentsPage.scannerUploadFallback")}</span>
      <span className="block text-xs text-white/50">
        {t("paymentsPage.scannerUploadLabel")}
      </span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={t("paymentsPage.scannerUploadLabel")}
        onChange={handleChange}
      />
    </label>
  );
}
