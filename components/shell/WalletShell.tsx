"use client";

import React from "react";
import DesktopIconRail from "./DesktopIconRail";
import TopUtilityBar from "./TopUtilityBar";
import MobileTabBar from "@/components/MobileTabBar";
import MobileFab from "./MobileFab";

type FabConfig = {
  mobileLabel: string;
  onClick: () => void;
};

export default function WalletShell({
  children,
  walletSlot,
  fab,
}: {
  children: React.ReactNode;
  walletSlot?: React.ReactNode;
  fab?: FabConfig;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex min-h-screen">
        <DesktopIconRail />
        <div className="flex min-h-screen flex-1 flex-col">
          <div className="px-4 py-4 md:px-6 md:py-5">
            <TopUtilityBar walletSlot={walletSlot} />
          </div>
          <main className="flex-1 px-4 pb-28 md:px-8 md:pb-10">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
      <MobileTabBar />
      {fab ? <MobileFab label={fab.mobileLabel} onClick={fab.onClick} /> : null}
    </div>
  );
}
