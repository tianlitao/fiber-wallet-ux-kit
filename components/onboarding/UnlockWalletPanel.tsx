"use client";

import React, { useState } from "react";
import { unlockFiberIdentityWallet } from "@/lib/fiberIdentityWallet";
import { useI18n } from "@/lib/i18n/useI18n";

export default function UnlockWalletPanel({
  onUnlock,
}: {
  onUnlock: (fiberKey: Uint8Array) => Promise<void>;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = async () => {
    try {
      const fiberKey = await unlockFiberIdentityWallet(password);
      await onUnlock(fiberKey);
      setPassword("");
      setError("");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-6 mb-6">
      <div className="mb-4 space-y-2">
        <h2 className="text-lg font-semibold">{t("onboarding.unlockTitle")}</h2>
        <p className="text-sm text-white/60">{t("onboarding.unlockBody")}</p>
      </div>
      <label className="block text-sm">
        <span className="mb-2 block text-white/60">{t("onboarding.password")}</span>
        <input
          aria-label={t("onboarding.password")}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        />
      </label>
      {error ? (
        <div className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      <button
        onClick={handleUnlock}
        className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black"
      >
        {t("onboarding.unlockButton")}
      </button>
    </div>
  );
}
