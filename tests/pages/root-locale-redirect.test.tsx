import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("root locale redirect page", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("redirects zh browsers to /zh", async () => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "zh-CN",
    });

    const { default: RootRedirectPage } = await import("@/app/page");
    render(<RootRedirectPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/zh");
    });
  });

  it("redirects non-zh browsers to /en", async () => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "en-US",
    });

    const { default: RootRedirectPage } = await import("@/app/page");
    render(<RootRedirectPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/en");
    });
  });

  it("shows a loading message while redirecting", async () => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "en-US",
    });

    const { default: RootRedirectPage } = await import("@/app/page");
    render(<RootRedirectPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
