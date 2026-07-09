"use client";

import { DappRequestType } from "@joyid/common";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM,
  buildJoyIdPopupAuthUrl,
  buildJoyIdPopupSignCkbRawTxUrl,
  readJoyIdAuthRedirectRequest,
  readJoyIdSignRedirectRequest,
  removeJoyIdAuthRedirectRequest,
  removeJoyIdSignRedirectRequest,
  storeJoyIdAuthRedirectResponseFromMessage,
  storeJoyIdSignRedirectResponseFromMessage,
} from "@/lib/joyIdRedirect";

type BridgeRequest =
  | {
      requestId: string;
      type: "auth";
      request: Parameters<typeof buildJoyIdPopupAuthUrl>[0] & {
        joyidAppURL: string;
      };
    }
  | {
      requestId: string;
      type: "sign";
      request: Parameters<typeof buildJoyIdPopupSignCkbRawTxUrl>[0];
    };

const activeJoyIdPopups = new Map<string, Window>();

function isPopupOpen(popup: Window | undefined): popup is Window {
  if (!popup) {
    return false;
  }

  try {
    return !popup.closed;
  } catch {
    return false;
  }
}

export default function JoyIdSignBridgePage() {
  const [message, setMessage] = useState("Opening JoyID...");
  const [bridgeRequest, setBridgeRequest] = useState<BridgeRequest | null>(
    null,
  );
  const [canRetry, setCanRetry] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const clearCurrentListener = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const openJoyId = useCallback(
    (bridgeRequest: BridgeRequest) => {
      const { requestId, request, type } = bridgeRequest;
      clearCurrentListener();
      setCanRetry(false);

      let popup = activeJoyIdPopups.get(requestId);
      if (!isPopupOpen(popup)) {
        const joyIdUrl =
          type === "auth"
            ? buildJoyIdPopupAuthUrl(request)
            : buildJoyIdPopupSignCkbRawTxUrl(request);
        popup =
          window.open(
            joyIdUrl,
            `joyid-${type}-${requestId}`,
            "popup,width=480,height=720",
          ) ?? undefined;
      }

      if (!popup) {
        activeJoyIdPopups.delete(requestId);
        setMessage("JoyID window was blocked. Click Continue to open it.");
        setCanRetry(true);
        return;
      }

      activeJoyIdPopups.set(requestId, popup);
      const joyIdOrigin = new URL(request.joyidAppURL).origin;
      setMessage("Waiting for JoyID approval...");

      const cleanup = () => {
        window.clearInterval(popupTimer);
        window.removeEventListener("message", handleMessage);
      };

      const complete = () => {
        cleanup();
        cleanupRef.current = null;
        activeJoyIdPopups.delete(requestId);
        if (type === "auth") {
          removeJoyIdAuthRedirectRequest(requestId);
        } else {
          removeJoyIdSignRedirectRequest(requestId);
        }
        try {
          popup.close();
        } catch {}
        setCanRetry(false);
        setMessage("JoyID response received. You can close this window.");
        window.setTimeout(() => window.close(), 300);
      };

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== joyIdOrigin) {
          return;
        }
        const stored =
          type === "auth"
            ? storeJoyIdAuthRedirectResponseFromMessage(requestId, event.data)
            : storeJoyIdSignRedirectResponseFromMessage(requestId, event.data);
        if (!stored) {
          return;
        }

        complete();
      };

      const popupTimer = window.setInterval(() => {
        let closed = false;
        try {
          closed = popup.closed;
        } catch {}
        if (!closed) {
          return;
        }

        if (type === "auth") {
          storeJoyIdAuthRedirectResponseFromMessage(requestId, {
            type: DappRequestType.Auth,
            error: "JoyID connection window was closed",
          });
        } else {
          storeJoyIdSignRedirectResponseFromMessage(requestId, {
            type: DappRequestType.SignCkbRawTx,
            error: "JoyID signing window was closed",
          });
        }
        complete();
      }, 1000);

      window.addEventListener("message", handleMessage);
      cleanupRef.current = cleanup;
    },
    [clearCurrentListener],
  );

  useEffect(() => {
    const requestId = new URLSearchParams(window.location.search).get(
      JOY_ID_SIGN_REDIRECT_REQUEST_ID_PARAM,
    );
    if (!requestId) {
      setMessage("Missing JoyID request.");
      return;
    }

    const signRequest = readJoyIdSignRedirectRequest(requestId);
    const authRequest = readJoyIdAuthRedirectRequest(requestId);
    if (!signRequest && !authRequest) {
      setMessage("JoyID request expired. Please try again.");
      return;
    }

    const nextBridgeRequest: BridgeRequest = signRequest
      ? {
          requestId,
          type: "sign",
          request: {
            ...signRequest,
            redirectURL: window.location.href,
          },
        }
      : {
          requestId,
          type: "auth",
          request: {
            ...authRequest!,
            redirectURL: window.location.href,
          },
        };

    setBridgeRequest(nextBridgeRequest);
    openJoyId(nextBridgeRequest);

    return clearCurrentListener;
  }, [clearCurrentListener, openJoyId]);

  return (
    <main className="min-h-screen bg-[#111111] text-white flex items-center justify-center px-6">
      <div className="max-w-sm rounded-lg border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="text-lg font-semibold mb-2">JoyID</h1>
        <p className="text-sm text-white/60">{message}</p>
        {bridgeRequest && canRetry && (
          <button
            className="mt-5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#111111]"
            onClick={() => openJoyId(bridgeRequest)}
            type="button"
          >
            Continue
          </button>
        )}
      </div>
    </main>
  );
}
