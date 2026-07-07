import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  routerPushMock,
  hasFiberIdentityWalletMock,
  saveFiberIdentityWalletMock,
  generateFiberIdentityMnemonicMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  hasFiberIdentityWalletMock: vi.fn(),
  saveFiberIdentityWalletMock: vi.fn(),
  generateFiberIdentityMnemonicMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerPushMock,
  }),
  useParams: () => ({ locale: "zh" }),
  usePathname: () => "/zh/onboarding",
}));

vi.mock("@/lib/fiberIdentityWallet", () => ({
  hasFiberIdentityWallet: hasFiberIdentityWalletMock,
  saveFiberIdentityWallet: saveFiberIdentityWalletMock,
  generateFiberIdentityMnemonic: generateFiberIdentityMnemonicMock,
}));

describe("Onboarding flow", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    routerPushMock.mockReset();
    hasFiberIdentityWalletMock.mockReset();
    saveFiberIdentityWalletMock.mockReset();
    generateFiberIdentityMnemonicMock.mockReset();
    hasFiberIdentityWalletMock.mockResolvedValue(false);
    generateFiberIdentityMnemonicMock.mockReturnValue(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    );
  });

  it("renders create and import actions on the onboarding welcome route", async () => {
    const [{ default: OnboardingPage }, { default: LocaleLayout }] =
      await Promise.all([
        import("@/app/[locale]/onboarding/page"),
        import("@/app/[locale]/layout"),
      ]);
    render(
      <LocaleLayout params={{ locale: "zh" }}>
        <OnboardingPage />
      </LocaleLayout>,
    );

    expect(
      screen.getByRole("button", { name: "创建钱包" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "导入钱包" }),
    ).toBeInTheDocument();
  });

  it("stores a generated mnemonic in session state before routing to backup", async () => {
    const [{ default: CreatePage }, { default: LocaleLayout }] =
      await Promise.all([
        import("@/app/[locale]/onboarding/create/page"),
        import("@/app/[locale]/layout"),
      ]);
    render(
      <LocaleLayout params={{ locale: "zh" }}>
        <CreatePage />
      </LocaleLayout>,
    );

    fireEvent.click(screen.getByRole("button", { name: "继续" }));

    expect(
      window.sessionStorage.getItem("fiber_onboarding_mnemonic"),
    ).toContain("abandon");
    expect(routerPushMock).toHaveBeenCalledWith("/zh/onboarding/backup");
  });

  it("persists the wallet only on the encrypt step", async () => {
    window.sessionStorage.setItem(
      "fiber_onboarding_mnemonic",
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    );

    const [{ default: EncryptPage }, { default: LocaleLayout }] =
      await Promise.all([
        import("@/app/[locale]/onboarding/encrypt/page"),
        import("@/app/[locale]/layout"),
      ]);
    render(
      <LocaleLayout params={{ locale: "zh" }}>
        <EncryptPage />
      </LocaleLayout>,
    );

    fireEvent.change(screen.getByLabelText("本地钱包密码"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存钱包" }));

    await waitFor(() => {
      expect(saveFiberIdentityWalletMock).toHaveBeenCalledWith(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        "password123",
      );
    });
  });
});
