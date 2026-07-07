"use client";

import React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function resolveLocalePath(language: string | undefined) {
  return language?.toLowerCase().startsWith("zh") ? "/zh" : "/en";
}

export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(resolveLocalePath(navigator.language));
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
      <div className="text-center">
        <div className="text-lg font-semibold">Fiber Wallet UX Kit</div>
        <div className="mt-2 text-sm text-white/60">Loading...</div>
      </div>
    </main>
  );
}
