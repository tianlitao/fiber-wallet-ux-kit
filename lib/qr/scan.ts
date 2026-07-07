import jsQR from "jsqr";

export type ScanCapability = "live" | "upload" | "unsupported";

export function getScanCapability(): ScanCapability {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  const hasLiveScanner =
    window.isSecureContext &&
    "BarcodeDetector" in window &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  if (hasLiveScanner) {
    return "live";
  }

  if ("FileReader" in window) {
    return "upload";
  }

  return "unsupported";
}

export function isLikelyInvoice(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.startsWith("lnfib") ||
    normalized.startsWith("fiber:") ||
    normalized.startsWith("ckt1") ||
    normalized.startsWith("ckb1")
  );
}

export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return null;
  }

  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(bitmap, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = jsQR(imageData.data, imageData.width, imageData.height);

    return decoded?.data?.trim() ?? null;
  } finally {
    bitmap.close();
  }
}
