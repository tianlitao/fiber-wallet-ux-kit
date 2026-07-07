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
  });
});
