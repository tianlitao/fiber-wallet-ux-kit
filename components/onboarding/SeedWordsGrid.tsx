"use client";

import React from "react";

export default function SeedWordsGrid({ mnemonic }: { mnemonic: string }) {
  const words = mnemonic.trim().split(/\s+/);

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
      {words.map((word, index) => (
        <div
          key={`${word}-${index}`}
          className="rounded-xl bg-black/20 px-3 py-2 text-sm"
        >
          <span className="mr-2 text-white/40">{index + 1}.</span>
          <span>{word}</span>
        </div>
      ))}
    </div>
  );
}
