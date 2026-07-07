"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ccc } from "@ckb-ccc/connector-react";
import ConnectWallet from "@/components/ConnectWallet";
import FiberIdentityWalletCard from "@/components/FiberIdentityWalletCard";
import UnlockWalletPanel from "@/components/onboarding/UnlockWalletPanel";
import WalletShell from "@/components/shell/WalletShell";
import { hasFiberIdentityWallet } from "@/lib/fiberIdentityWallet";
import { useFiber } from "@/lib/fiberContext";
import { useI18n } from "@/lib/i18n/useI18n";

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const { status, error, nodeInfo, startFiber, stopFiber, refreshNodeInfo } =
    useFiber();
  const { t } = useI18n();
  const signer = ccc.useSigner();
  const [walletExists, setWalletExists] = useState<boolean | null>(null);

  useEffect(() => {
    void hasFiberIdentityWallet().then((exists) => {
      setWalletExists(exists);
      if (!exists) {
        router.replace(`/${params.locale}/onboarding`);
      }
    });
  }, [params.locale, router]);

  return (
    <WalletShell walletSlot={<ConnectWallet />}>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
      </div>

      {walletExists && status !== "running" ? (
        <UnlockWalletPanel onUnlock={startFiber} />
      ) : null}

      {status === "running" ? (
        <FiberIdentityWalletCard
          status={status}
          error={error}
          nodeInfo={nodeInfo}
          stopFiber={stopFiber}
          refreshNodeInfo={refreshNodeInfo}
        />
      ) : null}

      {!signer && status === "running" ? (
        <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-500/10 p-6">
          <p className="text-blue-300 text-sm">{t("dashboard.walletHint")}</p>
        </div>
      ) : null}
    </WalletShell>
  );
}
