"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { assertValidFiberIdentityMnemonic } from "@/lib/fiberIdentityWallet/crypto";
import { saveOnboardingMnemonic } from "@/lib/onboardingSession";
import { useI18n } from "@/lib/i18n/useI18n";

export default function ImportWalletPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    try {
      const normalized = assertValidFiberIdentityMnemonic(value);
      saveOnboardingMnemonic(normalized);
      router.push(`/${params.locale}/onboarding/encrypt`);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  return (
    <OnboardingShell
      title={t("onboarding.importTitle")}
      description={t("onboarding.importBody")}
    >
      <label className="block text-sm">
        <span className="mb-2 block text-white/60">
          {t("onboarding.importLabel")}
        </span>
        <textarea
          aria-label={t("onboarding.importLabel")}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        />
      </label>
      <p className="text-xs text-white/40">{t("onboarding.pasteHint")}</p>
      {error ? (
        <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      <button
        onClick={handleContinue}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black"
      >
        {t("onboarding.continue")}
      </button>
    </OnboardingShell>
  );
}
