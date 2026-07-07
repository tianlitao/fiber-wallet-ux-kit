import { defaultLocale, isSupportedLocale, type Locale } from "@/lib/i18n/config";

export function detectLocaleFromHeader(header: string | null): Locale {
  if (!header) {
    return defaultLocale;
  }

  let bestLocale = defaultLocale;
  let bestQuality = 0;

  for (const entry of header.split(",")) {
    const [language, ...parameters] = entry.trim().split(";");
    const baseLanguage = language.toLowerCase().split("-")[0];
    const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const quality = qualityParameter ? Number.parseFloat(qualityParameter.trim().slice(2)) : 1;

    if (!isSupportedLocale(baseLanguage) || Number.isNaN(quality)) {
      continue;
    }

    if (quality > bestQuality) {
      bestLocale = baseLanguage;
      bestQuality = quality;
    }
  }

  return bestLocale;
}

export function hasLocalePrefix(pathname: string): boolean {
  const [firstSegment] = pathname.split("/").filter(Boolean);

  return firstSegment ? isSupportedLocale(firstSegment) : false;
}

export function addLocaleToPath(pathname: string, locale: Locale): string {
  if (pathname === "/") {
    return `/${locale}`;
  }

  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return `/${locale}${normalizedPath}`;
}

export function replaceLocaleInPath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length > 0 && isSupportedLocale(segments[0])) {
    segments[0] = locale;
    return `/${segments.join("/")}`;
  }

  return addLocaleToPath(pathname, locale);
}
