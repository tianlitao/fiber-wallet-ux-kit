import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

async function loadNextConfig(phase = PHASE_PRODUCTION_BUILD) {
  const { default: nextConfig } = await import("../../next.config.mjs");

  return typeof nextConfig === "function"
    ? nextConfig(phase, { defaultConfig: {} })
    : nextConfig;
}

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
    expect(content).toContain("/joyid-sign-bridge");
    expect(content).toContain(
      "Cross-Origin-Opener-Policy: same-origin-allow-popups",
    );
    expect(content).toContain("! Cross-Origin-Embedder-Policy");
  });
});

describe("Next.js dev headers", () => {
  it("defines cross-origin isolation headers for local development", async () => {
    const nextConfig = await loadNextConfig(PHASE_DEVELOPMENT_SERVER);
    expect(nextConfig.headers).toBeDefined();
    const headerRules = await nextConfig.headers!();
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

  it("allows the JoyID signing bridge to retain wallet popup openers in development", async () => {
    const nextConfig = await loadNextConfig(PHASE_DEVELOPMENT_SERVER);
    expect(nextConfig.headers).toBeDefined();
    const headerRules = await nextConfig.headers!();
    const bridgeRule = headerRules.find(
      (rule) => rule.source === "/joyid-sign-bridge",
    );

    expect(bridgeRule?.headers).toEqual(
      expect.arrayContaining([
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin-allow-popups",
        },
      ]),
    );
  });

  it("keeps static export for production builds but disables it for dev routing", async () => {
    const devConfig = await loadNextConfig(PHASE_DEVELOPMENT_SERVER);
    const productionConfig = await loadNextConfig(PHASE_PRODUCTION_BUILD);

    expect(devConfig.output).toBeUndefined();
    expect(productionConfig.output).toBe("export");
  });
});
