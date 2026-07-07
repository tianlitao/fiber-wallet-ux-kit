"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { generateFiberIdentityMnemonic } from "@/lib/fiberIdentityWallet";
import { saveOnboardingMnemonic } from "@/lib/onboardingSession";
import { useI18n } from "@/lib/i18n/useI18n";

export default function CreateWalletPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const { t } = useI18n();

  const handleContinue = () => {
    saveOnboardingMnemonic(generateFiberIdentityMnemonic());
    router.push(`/${params.locale}/onboarding/backup`);
  };

  return (
    <OnboardingShell
      title={t("onboarding.welcomeTitle")}
      description={t("onboarding.welcomeBody")}
    >
      <button
        onClick={handleContinue}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black"
      >
        {t("onboarding.continue")}
      </button>
    </OnboardingShell>
  );
}
