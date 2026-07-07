"use client";

import React from "react";
import { ccc } from "@ckb-ccc/connector-react";
import ConnectWallet from "@/components/ConnectWallet";
import FiberIdentityWalletCard from "@/components/FiberIdentityWalletCard";
import Navigation from "@/components/Navigation";
import { useFiber } from "@/lib/fiberContext";
import { useI18n } from "@/lib/i18n/useI18n";

export default function DashboardPage() {
  const { status, error, nodeInfo, startFiber, stopFiber, refreshNodeInfo } =
    useFiber();
  const { t } = useI18n();
  const signer = ccc.useSigner();

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <ConnectWallet />
        </div>

        <FiberIdentityWalletCard
          status={status}
          error={error}
          nodeInfo={nodeInfo}
          startFiber={startFiber}
          stopFiber={stopFiber}
          refreshNodeInfo={refreshNodeInfo}
        />

        {!signer && status === "running" ? (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-6">
            <p className="text-blue-400 text-sm">{t("dashboard.walletHint")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
