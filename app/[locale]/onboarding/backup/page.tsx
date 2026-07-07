"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import SeedWordsGrid from "@/components/onboarding/SeedWordsGrid";
import {
  hasConfirmedOnboardingBackup,
  loadOnboardingMnemonic,
  markOnboardingBackupConfirmed,
} from "@/lib/onboardingSession";
import { useI18n } from "@/lib/i18n/useI18n";

export default function BackupWalletPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const { t } = useI18n();
  const [mnemonic, setMnemonic] = useState("");
  const [checks, setChecks] = useState([false, false, false]);

  useEffect(() => {
    const value = loadOnboardingMnemonic();
    if (!value) {
      router.replace(`/${params.locale}/onboarding`);
      return;
    }
    setMnemonic(value);
    if (hasConfirmedOnboardingBackup()) {
      setChecks([true, true, true]);
    }
  }, [params.locale, router]);

  const allChecked = checks.every(Boolean);

  return (
    <OnboardingShell
      title={t("onboarding.backupTitle")}
      description={t("onboarding.backupBody")}
    >
      {mnemonic ? <SeedWordsGrid mnemonic={mnemonic} /> : null}
      {[
        t("onboarding.backupConfirmOne"),
        t("onboarding.backupConfirmTwo"),
        t("onboarding.backupConfirmThree"),
      ].map((label, index) => (
        <label
          key={label}
          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
        >
          <input
            type="checkbox"
            checked={checks[index]}
            onChange={(event) => {
              const next = [...checks];
              next[index] = event.target.checked;
              setChecks(next);
            }}
          />
          <span>{label}</span>
        </label>
      ))}
      <button
        disabled={!allChecked}
        onClick={() => {
          markOnboardingBackupConfirmed();
          router.push(`/${params.locale}/onboarding/encrypt`);
        }}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
      >
        {t("onboarding.continue")}
      </button>
    </OnboardingShell>
  );
}
