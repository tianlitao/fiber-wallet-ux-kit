"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { useI18n } from "@/lib/i18n/useI18n";

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const { t } = useI18n();
  const base = `/${params.locale}/onboarding`;

  return (
    <OnboardingShell
      title={t("onboarding.welcomeTitle")}
      description={t("onboarding.welcomeBody")}
    >
      <button
        onClick={() => router.push(`${base}/create`)}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black"
      >
        {t("onboarding.createWallet")}
      </button>
      <button
        onClick={() => router.push(`${base}/import`)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium"
      >
        {t("onboarding.importWallet")}
      </button>
    </OnboardingShell>
  );
}
