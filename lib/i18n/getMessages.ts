import type { Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { zh } from "./messages/zh";

const messagesByLocale: Record<Locale, Messages> = {
  en,
  zh,
};

export function getMessages(locale: Locale) {
  return messagesByLocale[locale];
}
