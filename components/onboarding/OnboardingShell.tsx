"use client";

import React from "react";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function OnboardingShell({
  title,
  description,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center gap-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm leading-6 text-white/60">{description}</p>
          ) : null}
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </main>
  );
}
