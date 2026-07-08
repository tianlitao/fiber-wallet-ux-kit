import React from "react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 text-white">
      <div className="max-w-md text-center">
        <div className="text-sm font-medium uppercase text-white/40">
          Fiber Wallet UX Kit
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          This route is not available in the wallet UX kit.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/en"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Open English app
          </Link>
          <Link
            href="/zh"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            打开中文应用
          </Link>
        </div>
      </div>
    </main>
  );
}
