"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileTabBar from "@/components/MobileTabBar";
import { useFiber } from "@/lib/fiberContext";
import { DEFAULT_PEER_HOST } from "@/lib/fiberConfig";
import { replaceLocaleInPath } from "@/lib/i18n/routing";
import { useI18n } from "@/lib/i18n/useI18n";

export default function Navigation() {
  const pathname = usePathname();
  const { hasProvider, locale, t } = useI18n({ fallback: "en" });
  const { status, defaultPeerConnected } = useFiber();
  const homeHref = hasProvider ? `/${locale}` : "/";

  const navItems = hasProvider
    ? [
        { href: `/${locale}`, label: t("nav.dashboard") },
        { href: `/${locale}/channels`, label: t("nav.channels") },
        { href: `/${locale}/invoices`, label: t("nav.invoices") },
        { href: `/${locale}/payments`, label: t("nav.payments") },
      ]
    : [
        { href: "/", label: t("nav.dashboard") },
        { href: "/channels", label: t("nav.channels") },
        { href: "/invoices", label: t("nav.invoices") },
        { href: "/payments", label: t("nav.payments") },
      ];

  const statusLabelMap: Record<string, string> = {
    idle: t("nav.statusIdle"),
    starting: t("nav.statusStarting"),
    running: t("nav.statusRunning"),
    stopped: t("nav.statusStopped"),
    error: t("nav.statusError"),
  };

  const statusColor =
    status === "running"
      ? "bg-green-500"
      : status === "starting"
        ? "bg-yellow-500 animate-pulse"
        : status === "error"
          ? "bg-red-500"
          : "bg-gray-500";

  return (
    <>
      <nav className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="text-lg font-bold text-white">
              Fiber Wallet UX Kit
            </Link>
            <div className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
              {hasProvider ? (
                <Link
                  href={replaceLocaleInPath(pathname, "zh")}
                  className={locale === "zh" ? "text-white" : "text-white/50"}
                >
                  {t("nav.languageChinese")}
                </Link>
              ) : (
                <span className="text-white/50">{t("nav.languageChinese")}</span>
              )}
              <span className="text-white/20">/</span>
              {hasProvider ? (
                <Link
                  href={replaceLocaleInPath(pathname, "en")}
                  className={locale === "en" ? "text-white" : "text-white/50"}
                >
                  {t("nav.languageEnglish")}
                </Link>
              ) : (
                <span className="text-white">{t("nav.languageEnglish")}</span>
              )}
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 md:flex">
              <span className={`w-2 h-2 rounded-full ${defaultPeerConnected ? "bg-green-500" : status === "running" ? "bg-yellow-500" : "bg-gray-500"}`} />
              <div className="leading-tight">
                <div className="text-[10px] text-white/40">
                  {t("nav.defaultPeer")}
                </div>
                <div className="text-[11px] text-white/70">
                  {defaultPeerConnected
                    ? t("nav.connected")
                    : status === "running"
                      ? t("nav.connecting")
                      : t("nav.offline")}
                </div>
              </div>
              <div className="text-[10px] text-white/35">
                {DEFAULT_PEER_HOST}
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs text-white/60 sm:flex">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span>{statusLabelMap[status] ?? status}</span>
            </div>
            <span className="hidden rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400 sm:inline-flex">
              {t("app.testnet")}
            </span>
          </div>
        </div>
      </nav>
      <MobileTabBar />
    </>
  );
}
