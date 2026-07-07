"use client";

import type { Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { useOptionalI18nContext } from "./provider";

type TranslationValue = string | number | bigint | boolean | null | undefined;
type TranslationValues = Record<string, TranslationValue>;

function translateMessage(messages: Messages, key: string) {
  const value = key
    .split(".")
    .reduce<unknown>((currentValue, segment) => {
      if (
        typeof currentValue !== "object" ||
        currentValue === null ||
        !(segment in currentValue)
      ) {
        throw new Error(`Missing translation key: ${key}`);
      }

      return (currentValue as Record<string, unknown>)[segment];
    }, messages);

  if (typeof value !== "string") {
    throw new Error(`Missing translation key: ${key}`);
  }

  return value;
}

function interpolateMessage(message: string, values?: TranslationValues) {
  if (!values) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (placeholder, key) => {
    if (!(key in values)) {
      return placeholder;
    }

    const value = values[key];

    return value == null ? "" : String(value);
  });
}

type UseI18nOptions = {
  fallback?: Locale;
};

export function useI18n(options?: UseI18nOptions) {
  const optionalContext = useOptionalI18nContext();

  if (optionalContext === null && !options?.fallback) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  const locale = optionalContext?.locale ?? options?.fallback ?? "en";
  const messages = optionalContext?.messages ?? en;

  function t(key: string, values?: TranslationValues) {
    return interpolateMessage(translateMessage(messages, key), values);
  }

  return {
    hasProvider: optionalContext !== null,
    locale,
    messages,
    t,
  };
}
