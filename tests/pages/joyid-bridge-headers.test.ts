import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("JoyID bridge headers", () => {
  it("removes COOP and COEP for /joyid-bridge", () => {
    const headersFile = readFileSync(
      resolve(process.cwd(), "public/_headers"),
      "utf8",
    );
    const lines = headersFile.split("\n");
    const bridgeStart = lines.findIndex((line) => line.trim() === "/joyid-bridge");
    const globalStart = lines.findIndex((line) => line.trim() === "/*");

    expect(globalStart).toBeGreaterThanOrEqual(0);
    expect(bridgeStart).toBeGreaterThanOrEqual(0);

    const bridgeBlock = lines
      .slice(bridgeStart, bridgeStart + 4)
      .map((line) => line.trim());

    expect(bridgeBlock[0]).toBe("/joyid-bridge");
    expect(bridgeBlock).toContain("! Cross-Origin-Opener-Policy");
    expect(bridgeBlock).toContain("! Cross-Origin-Embedder-Policy");
  });
});
