import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutProvider } from "@/app/layoutProvider";
import { I18nProvider } from "@/lib/i18n/provider";
import { getMessages } from "@/lib/i18n/getMessages";
import {
  isSupportedLocale,
  locales,
  type Locale,
} from "@/lib/i18n/config";
import LocaleDocumentLanguage from "./LocaleDocumentLanguage";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: {
    locale: string;
  };
};

function getLocaleContext(locale: string): {
  locale: Locale;
  messages: ReturnType<typeof getMessages>;
} {
  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return {
    locale,
    messages: getMessages(locale),
  };
}

export function generateMetadata({
  params,
}: Readonly<Pick<LocaleLayoutProps, "params">>): Metadata {
  const { messages } = getLocaleContext(params.locale);

  return {
    title: messages.app.title,
    description: messages.app.description,
  };
}

export default function LocaleLayout({
  children,
  params,
}: Readonly<LocaleLayoutProps>) {
  const { locale, messages } = getLocaleContext(params.locale);

  return (
    <LayoutProvider>
      <I18nProvider locale={locale} messages={messages}>
        <LocaleDocumentLanguage locale={locale} />
        {children}
      </I18nProvider>
    </LayoutProvider>
  );
}
