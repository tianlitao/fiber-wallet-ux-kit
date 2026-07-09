"use client";

import React, { useEffect, useState } from "react";
import { storeJoyIdSignRedirectResponseFromUrl } from "@/lib/joyIdRedirect";

export default function JoyIdCallbackPage() {
  const [message, setMessage] = useState("Finishing JoyID request...");

  useEffect(() => {
    const stored = storeJoyIdSignRedirectResponseFromUrl();
    setMessage(
      stored
        ? "JoyID response received. You can close this window."
        : "No JoyID response was found.",
    );

    if (stored) {
      window.setTimeout(() => window.close(), 300);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#111111] text-white flex items-center justify-center px-6">
      <div className="max-w-sm rounded-lg border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="text-lg font-semibold mb-2">JoyID</h1>
        <p className="text-sm text-white/60">{message}</p>
      </div>
    </main>
  );
}
