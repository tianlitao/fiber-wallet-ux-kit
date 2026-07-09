import { describe, expect, it } from "vitest";
import { TESTNET_CONFIG } from "@/lib/fiberConfig";

describe("Fiber testnet config", () => {
  it("uses the testnet ckb_auth cell dep expected by fiber-js 0.8.1", () => {
    expect(TESTNET_CONFIG).toContain(
      "0x5a5288769cecde6451cb5d301416c297a6da43dc3ac2f3253542b4082478b19b",
    );
    expect(TESTNET_CONFIG).not.toContain(
      "0x12c569a258dd9c5bd99f632bb8314b1263b90921ba31496467580d6b79dd14a7",
    );
  });
});
