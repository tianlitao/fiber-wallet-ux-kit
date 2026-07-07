"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/useI18n";

type RailItem = {
  href: string;
  label: string;
  icon: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/zh" || href === "/en") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DesktopIconRail() {
  const pathname = usePathname();
  const { hasProvider, locale, t } = useI18n({ fallback: "en" });
  const base = hasProvider ? `/${locale}` : "";
  const items: RailItem[] = [
    { href: base || "/", label: t("nav.dashboard"), icon: "⌂" },
    { href: `${base}/channels`, label: t("nav.channels"), icon: "↗" },
    { href: `${base}/invoices`, label: t("nav.invoices"), icon: "⌟" },
    { href: `${base}/payments`, label: t("nav.payments"), icon: "○" },
  ];

  return (
    <aside className="hidden md:flex w-[76px] shrink-0 flex-col items-center justify-between border-r border-white/8 bg-[#0a0a0a] px-3 py-4">
      <div className="flex flex-col items-center gap-4">
        <div
          aria-label={t("shell.railBrand")}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#19c7d4] text-xl font-semibold text-black shadow-[0_0_28px_rgba(25,199,212,0.25)]"
        >
          F
        </div>
        <nav className="flex flex-col gap-3">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={item.label}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition-colors ${
                  active
                    ? "bg-[#19c7d4]/16 text-[#8af4ff] ring-1 ring-[#19c7d4]/35"
                    : "text-white/88 hover:bg-white/10"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
