/* eslint-disable*/
"use client";

import React, { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { useI18n } from "@/lib/i18n/useI18n";
import { truncateAddress, formatBalance } from "@/utils/stringUtils";

const ConnectWallet: React.FC = () => {
  const { open, wallet } = ccc.useCcc();
  const [balance, setBalance] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const signer = ccc.useSigner();
  const { t } = useI18n({ fallback: "en" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!signer) {
      setBalance("");
      setAddress("");
      return;
    }

    (async () => {
      const addr = await signer.getRecommendedAddress();
      setAddress(addr);
    })();

    (async () => {
      const capacity = await signer.getBalance();
      setBalance(ccc.fixedPointToString(capacity));
    })();
  }, [signer]);

  if (wallet) {
    return (
      <button
        onClick={open}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
      >
        <img src={wallet.icon} alt="" className="w-5 h-5" />
        <div className="text-left">
          <div className="text-xs font-medium">{formatBalance(balance)} CKB</div>
          <div className="text-[10px] text-white/50">{truncateAddress(address, 8, 6)}</div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={open}
      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
    >
      {t("wallet.connect")}
    </button>
  );
};

export default ConnectWallet;
