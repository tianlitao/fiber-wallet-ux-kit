"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ScannerFallbackUpload from "@/components/ScannerFallbackUpload";
import { getScanCapability, isLikelyInvoice } from "@/lib/qr/scan";
import { useI18n } from "@/lib/i18n/useI18n";

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type InvoiceScannerProps = {
  onDetected: (value: string) => void;
  onClose: () => void;
};

export default function InvoiceScanner({
  onDetected,
  onClose,
}: Readonly<InvoiceScannerProps>) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const capability = useMemo(() => getScanCapability(), []);
  const [error, setError] = useState("");

  useEffect(() => {
    if (capability !== "live") {
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let frameId: number | null = null;

    async function startScanner() {
      const Detector = (
        window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }
      ).BarcodeDetector;

      if (!Detector) {
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });

        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();

        const detector = new Detector({ formats: ["qr_code"] });

        const detectFrame = async () => {
          if (cancelled || !videoRef.current) {
            return;
          }

          if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            frameId = window.requestAnimationFrame(() => {
              void detectFrame();
            });
            return;
          }

          try {
            const matches = await detector.detect(videoRef.current);
            const rawValue = matches[0]?.rawValue?.trim();

            if (rawValue && isLikelyInvoice(rawValue)) {
              onDetected(rawValue);
              onClose();
              return;
            }
          } catch {
            // Keep polling; unsupported frames should not tear down the UI.
          }

          frameId = window.requestAnimationFrame(() => {
            void detectFrame();
          });
        };

        await detectFrame();
      } catch {
        if (!cancelled) {
          setError(t("paymentsPage.scannerPermissionDenied"));
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [capability, onClose, onDetected, t]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">
          {t("paymentsPage.scannerTitle")}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
        >
          {capability === "live"
            ? t("paymentsPage.scannerStop")
            : t("invoicesPage.closeQr")}
        </button>
      </div>

      {capability === "live" ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg border border-white/10 bg-black/30"
        />
      ) : (
        <p className="text-sm text-white/60">
          {t("paymentsPage.scannerUnsupported")}
        </p>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {capability !== "live" || error ? (
        <ScannerFallbackUpload onDetected={onDetected} onError={setError} />
      ) : null}
    </section>
  );
}
