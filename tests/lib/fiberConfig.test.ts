import { describe, expect, it } from "vitest";
import {
  ckbToShannons,
  shannonsToDisplay,
  TESTNET_CONFIG,
} from "@/lib/fiberConfig";

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

describe("CKB amount helpers", () => {
  it.each([
    ["0", "0x0"],
    ["1", "0x5f5e100"],
    ["1.00000001", "0x5f5e101"],
    [" 600.5 ", "0xdfb424880"],
  ])("parses %s exactly", (input, expected) => {
    expect(ckbToShannons(input)).toBe(expected);
  });

  it.each(["", "-1", "+1", "1e2", ".5", "1.", "1.000000001", "abc"])(
    "rejects invalid amount %s",
    (input) => {
      expect(() => ckbToShannons(input)).toThrow();
    },
  );

  it("formats large values without Number precision loss", () => {
    expect(shannonsToDisplay("900719925474099300000000")).toBe(
      "9007199254740993.0000",
    );
  });
});
