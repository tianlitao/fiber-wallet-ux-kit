"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { saveFiberIdentityWallet } from "@/lib/fiberIdentityWallet";
import {
  clearOnboardingSession,
  hasConfirmedOnboardingBackup,
  loadOnboardingMnemonic,
} from "@/lib/onboardingSession";
import { useI18n } from "@/lib/i18n/useI18n";

export default function EncryptWalletPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const { t } = useI18n();
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = loadOnboardingMnemonic();
    if (!stored) {
      router.replace(`/${params.locale}/onboarding`);
      return;
    }
    setMnemonic(stored);
  }, [params.locale, router]);

  const handleSave = async () => {
    if (!mnemonic) return;
    if (hasConfirmedOnboardingBackup() && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await saveFiberIdentityWallet(mnemonic, password);
      clearOnboardingSession();
      router.replace(`/${params.locale}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  return (
    <OnboardingShell
      title={t("onboarding.encryptTitle")}
      description={t("onboarding.encryptBody")}
    >
      <label className="block text-sm">
        <span className="mb-2 block text-white/60">
          {t("onboarding.password")}
        </span>
        <input
          aria-label={t("onboarding.password")}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block text-white/60">
          {t("onboarding.confirmPassword")}
        </span>
        <input
          aria-label={t("onboarding.confirmPassword")}
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        />
      </label>
      {error ? (
        <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      <button
        onClick={handleSave}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black"
      >
        {t("onboarding.saveWallet")}
      </button>
    </OnboardingShell>
  );
}
