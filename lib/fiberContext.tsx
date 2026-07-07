"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Fiber as FiberType, NodeInfoResult } from "@nervosnetwork/fiber-js";
import {
  DEFAULT_PEER_ADDRESS,
  DEFAULT_PEER_PUBKEY,
  TESTNET_CONFIG,
} from "./fiberConfig";

type FiberStatus = "idle" | "starting" | "running" | "error" | "stopped";

interface FiberContextValue {
  fiber: FiberType | null;
  status: FiberStatus;
  error: string | null;
  nodeInfo: NodeInfoResult | null;
  defaultPeerConnected: boolean;
  startFiber: (fiberKey: Uint8Array) => Promise<void>;
  stopFiber: () => Promise<void>;
  refreshNodeInfo: () => Promise<void>;
}

const FiberContext = createContext<FiberContextValue>({
  fiber: null,
  status: "idle",
  error: null,
  nodeInfo: null,
  defaultPeerConnected: false,
  startFiber: async (fiberKey: Uint8Array) => {
    void fiberKey;
  },
  stopFiber: async () => {},
  refreshNodeInfo: async () => {},
});

export function useFiber() {
  return useContext(FiberContext);
}

export function FiberProvider({ children }: { children: React.ReactNode }) {
  const [fiber, setFiber] = useState<FiberType | null>(null);
  const [status, setStatus] = useState<FiberStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [nodeInfo, setNodeInfo] = useState<NodeInfoResult | null>(null);
  const [defaultPeerConnected, setDefaultPeerConnected] = useState(false);
  const fiberRef = useRef<FiberType | null>(null);

  const refreshNodeInfo = useCallback(async () => {
    if (!fiberRef.current) return;
    try {
      const info = await fiberRef.current.nodeInfo();
      setNodeInfo(info);
    } catch (e) {
      console.error("Failed to refresh node info:", e);
    }
  }, []);

  const refreshDefaultPeerStatus = useCallback(async () => {
    if (!fiberRef.current) {
      setDefaultPeerConnected(false);
      return;
    }

    try {
      const peers = await fiberRef.current.listPeers();
      const connected = (peers.peers || []).some((peer) =>
        peer.pubkey === DEFAULT_PEER_PUBKEY || peer.address === DEFAULT_PEER_ADDRESS,
      );
      setDefaultPeerConnected(connected);
    } catch (e) {
      console.error("Failed to refresh default peer status:", e);
      setDefaultPeerConnected(false);
    }
  }, []);

  const startFiber = useCallback(
    async (fiberKey: Uint8Array) => {
      if (fiberRef.current) return;
      setStatus("starting");
      setError(null);

      try {
        const { Fiber } = await import("@nervosnetwork/fiber-js");
        const instance = new Fiber();
        await instance.start(
          TESTNET_CONFIG,
          fiberKey,
          undefined,
          undefined,
          "info",
          "/wasm",
        );
        fiberRef.current = instance;
        setFiber(instance);
        setStatus("running");
        setNodeInfo(await instance.nodeInfo());
        await instance.connectPeer({ address: DEFAULT_PEER_ADDRESS }).catch(() => undefined);
        await refreshDefaultPeerStatus();
      } catch (e: any) {
        console.error("Failed to start Fiber:", e);
        setError(e?.message || String(e));
        setStatus("error");
      }
    },
    [refreshDefaultPeerStatus],
  );

  const stopFiber = useCallback(async () => {
    if (!fiberRef.current) return;
    try {
      await fiberRef.current.stop();
    } catch (e) {
      console.error("Error stopping Fiber:", e);
    }
    fiberRef.current = null;
    setFiber(null);
    setNodeInfo(null);
    setDefaultPeerConnected(false);
    setStatus("stopped");
  }, []);

  useEffect(() => {
    if (status !== "running" || !fiberRef.current) {
      setDefaultPeerConnected(false);
      return;
    }

    refreshDefaultPeerStatus();
    const interval = window.setInterval(() => {
      refreshDefaultPeerStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [status, refreshDefaultPeerStatus]);

  useEffect(() => {
    return () => {
      if (fiberRef.current) {
        fiberRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <FiberContext.Provider
      value={{
        fiber,
        status,
        error,
        nodeInfo,
        defaultPeerConnected,
        startFiber,
        stopFiber,
        refreshNodeInfo,
      }}
    >
      {children}
    </FiberContext.Provider>
  );
}
