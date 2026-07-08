import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Cloudflare Pages static headers", () => {
  it("defines cross-origin isolation headers for all routes", () => {
    const headersPath = join(process.cwd(), "public", "_headers");
    const content = readFileSync(headersPath, "utf8");

    expect(content).toContain("/*");
    expect(content).toContain(
      "Cross-Origin-Opener-Policy: same-origin",
    );
    expect(content).toContain(
      "Cross-Origin-Embedder-Policy: require-corp",
    );
    expect(content).not.toContain("/joyid-bridge");
    expect(content).not.toContain("! Cross-Origin-Opener-Policy");
    expect(content).not.toContain("! Cross-Origin-Embedder-Policy");
  });
});

describe("Next.js dev headers", () => {
  it("defines cross-origin isolation headers for local development", async () => {
    const { default: nextConfig } = await import("../../next.config.mjs");
    const headerRules = await nextConfig.headers();
    const allRouteRule = headerRules.find((rule) => rule.source === "/:path*");

    expect(allRouteRule?.headers).toEqual(
      expect.arrayContaining([
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin",
        },
        {
          key: "Cross-Origin-Embedder-Policy",
          value: "require-corp",
        },
      ]),
    );
  });
});
