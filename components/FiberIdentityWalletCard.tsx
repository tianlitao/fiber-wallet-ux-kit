"use client";

import React from "react";
import type { NodeInfoResult } from "@nervosnetwork/fiber-js";
import { hexToNumber, shannonsToDisplay } from "@/lib/fiberConfig";
import { useI18n } from "@/lib/i18n/useI18n";
import { truncateAddress } from "@/utils/stringUtils";

type FiberStatus = "idle" | "starting" | "running" | "error" | "stopped";

type Props = {
  status: FiberStatus;
  error: string | null;
  nodeInfo: NodeInfoResult | null;
  stopFiber: () => Promise<void>;
  refreshNodeInfo: () => Promise<void>;
};

export default function FiberIdentityWalletCard({
  status,
  error,
  nodeInfo,
  stopFiber,
  refreshNodeInfo,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="mb-6 rounded-[1.75rem] border border-white/10 bg-[#121213] p-6 md:p-7">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("dashboard.fiberNode")}</h2>
        <div className="flex gap-2">
          <button
            onClick={refreshNodeInfo}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
          >
            {t("dashboard.refresh")}
          </button>
          <button
            onClick={stopFiber}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            {t("dashboard.stop")}
          </button>
        </div>
      </div>

      {status === "starting" ? (
        <div className="text-cyan-300 text-sm">{t("dashboard.startingNode")}</div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {t("dashboard.errorPrefix")} {error}
        </div>
      ) : null}

      {status === "running" && nodeInfo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard
            label={t("dashboard.nodePubkey")}
            value={truncateAddress(nodeInfo.pubkey, 12, 8)}
          />
          <InfoCard label={t("dashboard.version")} value={nodeInfo.version} />
          <InfoCard
            label={t("dashboard.channels")}
            value={hexToNumber(nodeInfo.channel_count).toString()}
          />
          <InfoCard
            label={t("dashboard.connectedPeers")}
            value={hexToNumber(nodeInfo.peers_count).toString()}
          />
          <InfoCard
            label={t("dashboard.minCkbFunding")}
            value={`${shannonsToDisplay(
              nodeInfo.open_channel_auto_accept_min_ckb_funding_amount,
            )} CKB`}
          />
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="mb-1 text-xs text-white/70">{label}</div>
      <div className="text-sm font-medium break-all">{value}</div>
    </div>
  );
}
