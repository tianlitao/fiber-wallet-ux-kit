"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFiber } from "@/lib/fiberContext";
import { DEFAULT_PEER_HOST } from "@/lib/fiberConfig";
import { useI18n } from "@/lib/i18n/useI18n";

type TabItem = {
  href: string;
  label: string;
  exact?: boolean;
};

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isActivePath(pathname: string, tab: TabItem) {
  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(tab.href);

  if (tab.exact) {
    return currentPath === targetPath;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { hasProvider, locale, t } = useI18n({ fallback: "en" });
  const { status, defaultPeerConnected } = useFiber();
  const basePath = hasProvider ? `/${locale}` : "";
  const landmarkLabel = locale === "zh" ? "移动导航" : "Mobile navigation";
  const tabs: TabItem[] = [
    { href: basePath || "/", label: t("mobileNav.dashboard"), exact: true },
    { href: `${basePath}/channels` || "/channels", label: t("mobileNav.channels") },
    { href: `${basePath}/invoices` || "/invoices", label: t("mobileNav.invoices") },
    { href: `${basePath}/payments` || "/payments", label: t("mobileNav.payments") },
  ];

  return (
    <nav
      aria-label={landmarkLabel}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#111111]/95 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-[11px] text-white/60">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              defaultPeerConnected
                ? "bg-green-500"
                : status === "running"
                  ? "bg-yellow-500"
                  : "bg-gray-500"
            }`}
          />
          <span className="truncate">{DEFAULT_PEER_HOST}</span>
        </div>
        <span className="shrink-0">
          {defaultPeerConnected
            ? t("nav.connected")
            : status === "running"
              ? t("nav.connecting")
              : t("nav.offline")}
        </span>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2">
        {tabs.map((tab) => {
          const isActive = isActivePath(pathname, tab);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 items-center justify-center rounded-xl px-2 text-center text-xs font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
