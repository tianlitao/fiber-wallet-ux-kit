import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LocaleLayout, { generateStaticParams } from "@/app/[locale]/layout";
import RootLayout from "@/app/layout";
import { locales } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/messages/en";
import { I18nProvider } from "@/lib/i18n/provider";
import { useI18n } from "@/lib/i18n/useI18n";

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/font/local", () => ({
  default: () => ({
    variable: "mock-font",
  }),
}));

vi.mock("@/app/layoutProvider", () => ({
  LayoutProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function Probe() {
  const { locale, t } = useI18n();

  return (
    <>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t("dashboard.title")}</span>
    </>
  );
}

function OutsideProviderProbe() {
  useI18n();

  return null;
}

describe("I18nProvider", () => {
  beforeEach(() => {
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("provides the locale and translations to consumers", () => {
    render(
      <I18nProvider locale="en" messages={en}>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("translated")).toHaveTextContent("Dashboard");
  });

  it("throws when useI18n is used outside the provider", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      expect(() => render(<OutsideProviderProbe />)).toThrow(
        "useI18n must be used within an I18nProvider",
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

describe("locale layout", () => {
  it("generates static params for all supported locales", () => {
    expect(generateStaticParams()).toEqual(
      locales.map((locale) => ({ locale })),
    );
  });

  it("triggers notFound for unsupported locales", () => {
    expect(() =>
      LocaleLayout({
        children: <div>content</div>,
        params: {
          locale: "fr",
        },
      }),
    ).toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("updates document.documentElement.lang from the locale layout", async () => {
    document.documentElement.lang = "en";

    render(
      <LocaleLayout params={{ locale: "zh" }}>
        <div>content</div>
      </LocaleLayout>,
    );

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("zh");
    });
  });
});

describe("root layout", () => {
  it("uses a static english document shell", () => {
    const tree = RootLayout({
      children: <div>content</div>,
    });

    expect(tree.props.lang).toBe("en");
  });
});
