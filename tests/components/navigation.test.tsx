import React from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConnectWallet from "@/components/ConnectWallet";
import Navigation from "@/components/Navigation";
import { zh } from "@/lib/i18n/messages/zh";
import { I18nProvider } from "@/lib/i18n/provider";
import { useI18n } from "@/lib/i18n/useI18n";

const { openWalletMock, pathnameState } = vi.hoisted(() => ({
  openWalletMock: vi.fn(),
  pathnameState: {
    current: "/zh/channels",
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.current,
}));

vi.mock("@/lib/fiberContext", () => ({
  useFiber: () => ({
    status: "running",
    defaultPeerConnected: true,
  }),
}));

vi.mock("@ckb-ccc/connector-react", () => ({
  ccc: {
    useCcc: () => ({
      open: openWalletMock,
      wallet: null,
    }),
    useSigner: () => undefined,
    fixedPointToString: (value: string | number | bigint) => String(value),
  },
}));

function FallbackI18nProbe() {
  const { hasProvider, locale, t } = useI18n({ fallback: "en" });

  return (
    <>
      <span data-testid="fallback-provider">{String(hasProvider)}</span>
      <span data-testid="fallback-locale">{locale}</span>
      <span data-testid="fallback-label">{t("nav.dashboard")}</span>
    </>
  );
}

function StrictI18nProbe() {
  useI18n();

  return null;
}

describe("Navigation", () => {
  beforeEach(() => {
    pathnameState.current = "/zh/channels";
    openWalletMock.mockReset();
  });

  it("renders translated labels and a language switcher", () => {
    render(
      <I18nProvider locale="zh" messages={zh}>
        <Navigation />
      </I18nProvider>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "移动导航" });
    const desktopLinks = screen.getAllByRole("link", { name: "仪表盘" });
    const mobileLinks = within(mobileNav).getAllByRole("link");

    expect(desktopLinks).toHaveLength(2);
    expect(mobileLinks).toHaveLength(4);
    expect(screen.getByText("中文")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("测试网")).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: "仪表盘" })).toHaveAttribute(
      "href",
      "/zh",
    );
    expect(within(mobileNav).getByRole("link", { name: "通道" })).toHaveAttribute(
      "href",
      "/zh/channels",
    );
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/en/channels",
    );
  });

  it("falls back to English labels without generating locale-prefixed legacy links", () => {
    pathnameState.current = "/channels";

    render(<Navigation />);

    const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });

    expect(screen.getAllByRole("link", { name: "Dashboard" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Channels" })).toHaveLength(2);
    expect(screen.getByText("中文")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Testnet")).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(mobileNav).getByRole("link", { name: "Channels" })).toHaveAttribute(
      "href",
      "/channels",
    );
    expect(screen.queryByRole("link", { name: "中文" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "English" }),
    ).not.toBeInTheDocument();
  });
});

describe("ConnectWallet", () => {
  it("falls back to the English connect label without an I18nProvider", () => {
    render(<ConnectWallet />);

    expect(
      screen.getByRole("button", { name: "Connect Wallet" }),
    ).toBeInTheDocument();
  });
});

describe("useI18n", () => {
  it("still throws by default outside the provider", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      expect(() => render(<StrictI18nProbe />)).toThrow(
        "useI18n must be used within an I18nProvider",
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("supports explicit English fallback outside the provider", () => {
    render(<FallbackI18nProbe />);

    expect(screen.getByTestId("fallback-provider")).toHaveTextContent("false");
    expect(screen.getByTestId("fallback-locale")).toHaveTextContent("en");
    expect(screen.getByTestId("fallback-label")).toHaveTextContent(
      "Dashboard",
    );
  });
});
