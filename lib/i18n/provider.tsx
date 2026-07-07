"use client";

import React from "react";
import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages/en";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
};

export function I18nProvider({
  children,
  locale,
  messages,
}: Readonly<I18nProviderProps>) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const context = useOptionalI18nContext();

  if (context === null) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}

export function useOptionalI18nContext() {
  return useContext(I18nContext);
}
