"use client";

import { useCallback, useRef, useState } from "react";
import { checkPaymentReadiness } from "./readiness";
import type {
  CheckPaymentReadinessInput,
  PaymentClient,
} from "./readiness";
import type {
  PaymentNodeStatus,
  PaymentReadinessResult,
  PaymentRequest,
} from "./types";

export interface UsePaymentReadinessOptions {
  fiber: PaymentClient | null;
  nodeStatus: PaymentNodeStatus;
  peerConnected: boolean;
  channels: CheckPaymentReadinessInput["channels"];
}

export function usePaymentReadiness(options: UsePaymentReadinessOptions) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<PaymentReadinessResult | null>(null);
  const requestIdRef = useRef(0);

  const check = useCallback(
    async (request: PaymentRequest) => {
      const requestId = ++requestIdRef.current;
      setChecking(true);

      const nextResult = await checkPaymentReadiness({
        fiber: options.fiber,
        nodeStatus: options.nodeStatus,
        peerConnected: options.peerConnected,
        channels: options.channels,
        request,
      });

      if (requestId === requestIdRef.current) {
        setResult(nextResult);
        setChecking(false);
      }

      return nextResult;
    },
    [
      options.channels,
      options.fiber,
      options.nodeStatus,
      options.peerConnected,
    ],
  );

  const invalidate = useCallback(() => {
    requestIdRef.current += 1;
    setChecking(false);
    setResult(null);
  }, []);

  return {
    check,
    checking,
    invalidate,
    result,
  };
}
