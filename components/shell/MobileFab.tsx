"use client";

import React from "react";

export default function MobileFab({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#19c7d4] text-4xl leading-none text-black shadow-[0_18px_48px_rgba(25,199,212,0.35)] md:hidden"
    >
      <span aria-hidden="true">+</span>
    </button>
  );
}
