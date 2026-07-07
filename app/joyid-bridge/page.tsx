"use client";

import React from "react";
import { ccc } from "@ckb-ccc/core";
import { authWithPopup } from "@joyid/common";
import { signRawTransaction } from "@joyid/ckb";
import * as joyIdBridge from "@/lib/joyid/bridge";
import {
  clearJoyIdSignPending,
  saveJoyIdRedirectConnection,
  saveJoyIdRedirectSignResult,
} from "@/lib/joyid/redirect";

let activeConnectRequestKey: string | null = null;
let activeConnectPromise: Promise<void> | null = null;
let activeSignRequestKey: string | null = null;
let activeSignPromise: Promise<void> | null = null;

export default function JoyIdBridgePage() {
  const [message, setMessage] = React.useState("Preparing JoyID bridge...");

  React.useEffect(() => {
    const request = joyIdBridge.loadJoyIdBridgeRequest(window.sessionStorage);
    if (!request) {
      setMessage("No JoyID bridge request was found.");
      return;
    }

    if (request.type !== "connect" && request.type !== "sign-ckb-raw-tx") {
      joyIdBridge.clearJoyIdBridgeRequest(window.sessionStorage);
      setMessage("Unsupported JoyID bridge request.");
      return;
    }

    if (request.type === "connect") {
      const requestKey = `connect:${request.returnUrl}:${request.createdAt}`;

      if (activeConnectRequestKey === requestKey && activeConnectPromise) {
        return;
      }

      activeConnectRequestKey = requestKey;
      activeConnectPromise = (async () => {
        try {
        const result = await authWithPopup(request.payload.config);
        saveJoyIdRedirectConnection(window.localStorage, {
          address: result.address,
          publicKey: ccc.hexFrom(result.pubkey),
          keyType: result.keyType,
        });
        joyIdBridge.clearJoyIdBridgeRequest(window.sessionStorage);
        joyIdBridge.returnFromJoyIdBridge(request.returnUrl);
      } catch (error) {
        joyIdBridge.clearJoyIdBridgeRequest(window.sessionStorage);
        console.error("JoyID bridge connect failed:", error);
        setMessage(
          "JoyID connect failed. Return to the previous page and try again.",
          );
        } finally {
          activeConnectRequestKey = null;
          activeConnectPromise = null;
        }
      })();
      return;
    }

    const signRequestKey = `sign:${request.requestKey}`;
    if (activeSignRequestKey === signRequestKey && activeSignPromise) {
      return;
    }

    activeSignRequestKey = signRequestKey;
    activeSignPromise = (async () => {
      try {
        const signedTx = await signRawTransaction(
          request.payload.tx as any,
          request.payload.signerAddress as string,
          {
            ...(request.payload.config as Record<string, unknown>),
            witnessIndexes: request.payload.witnessIndexes as number[],
          },
        );
        saveJoyIdRedirectSignResult(window.sessionStorage, {
          requestKey: request.requestKey,
          tx: signedTx,
        });
        clearJoyIdSignPending(window.sessionStorage);
        joyIdBridge.clearJoyIdBridgeRequest(window.sessionStorage);
        joyIdBridge.returnFromJoyIdBridge(request.returnUrl);
      } catch (error) {
        clearJoyIdSignPending(window.sessionStorage);
        joyIdBridge.clearJoyIdBridgeRequest(window.sessionStorage);
        console.error("JoyID bridge signing failed:", error);
        setMessage(
          "JoyID signing failed. Return to the previous page and try again.",
        );
      } finally {
        activeSignRequestKey = null;
        activeSignPromise = null;
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-[#111111] text-white flex items-center justify-center p-6">
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-white/70">
        {message}
      </div>
    </main>
  );
}
