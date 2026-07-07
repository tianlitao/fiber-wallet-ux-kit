"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFiber } from "@/lib/fiberContext";
import { DEFAULT_PEER_HOST } from "@/lib/fiberConfig";
import { replaceLocaleInPath } from "@/lib/i18n/routing";
import { useI18n } from "@/lib/i18n/useI18n";
import { getShellStatusMeaning } from "./statusMeaning";

export default function TopUtilityBar({
  walletSlot,
}: {
  walletSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasProvider, locale, t } = useI18n({ fallback: "en" });
  const { status, defaultPeerConnected } = useFiber();
  const statusMeaning = getShellStatusMeaning(status, defaultPeerConnected);
  const desktopStatusLabel =
    statusMeaning.tone === "connected"
      ? `${t(statusMeaning.desktopLabelKey)} · ${DEFAULT_PEER_HOST}`
      : t(statusMeaning.desktopLabelKey);

  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#111111] px-4 py-3">
      <div className="hidden md:flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10" />
        <div className="rounded-2xl bg-black/30 px-4 py-2 text-xs text-white/60">{desktopStatusLabel}</div>
      </div>
      <div className="mx-auto hidden md:block h-4 w-28 rounded-full bg-white/10" />
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
          {hasProvider ? (
            <div className="flex items-center gap-2">
              <Link
                href={replaceLocaleInPath(pathname, "zh")}
                className={locale === "zh" ? "text-white" : "text-white/50"}
              >
                {t("nav.languageChinese")}
              </Link>
              <span className="text-white/20">/</span>
              <Link
                href={replaceLocaleInPath(pathname, "en")}
                className={locale === "en" ? "text-white" : "text-white/50"}
              >
                {t("nav.languageEnglish")}
              </Link>
            </div>
          ) : null}
        </div>
        {walletSlot}
      </div>
    </header>
  );
}
