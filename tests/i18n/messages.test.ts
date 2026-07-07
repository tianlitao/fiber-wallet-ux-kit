import { describe, expect, it } from "vitest";
import { defaultLocale, isSupportedLocale, locales } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import { getMessages } from "@/lib/i18n/getMessages";

function collectKeys(input: unknown, prefix = ""): string[] {
  if (typeof input !== "object" || input === null) {
    return [];
  }

  return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      return [path];
    }

    return collectKeys(value, path);
  });
}

describe("i18n message dictionaries", () => {
  it("exposes the supported locales and default locale", () => {
    expect(locales).toEqual(["en", "zh"]);
    expect(defaultLocale).toBe("en");
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("zh")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });

  it("keeps English and Chinese dictionaries in sync", () => {
    expect(collectKeys(zh).sort()).toEqual(collectKeys(en).sort());
  });

  it("returns the matching dictionary for each locale", () => {
    expect(getMessages("en")).toBe(en);
    expect(getMessages("zh")).toBe(zh);
  });
});
