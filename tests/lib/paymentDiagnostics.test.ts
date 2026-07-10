import { describe, expect, it } from "vitest";
import { diagnosePaymentError } from "@/lib/paymentInfrastructure/diagnostics";

describe("payment diagnostics", () => {
  it.each([
    ["failed to build route: no path found", "route_not_found", true],
    [
      "outbound liquidity is insufficient for this payment",
      "insufficient_outbound_capacity",
      true,
    ],
    ["invoice currency does not match asset", "asset_mismatch", true],
    ["fee exceeds max fee amount", "fee_limit", true],
    ["payment timeout", "timeout", true],
    ["invalid invoice", "invalid_request", true],
    ["unexpected worker crash", "unknown", false],
  ] as const)(
    "classifies %s",
    (message, code, recoverable) => {
      expect(diagnosePaymentError(new Error(message))).toEqual({
        code,
        severity: "error",
        recoverable,
        messageKey: `paymentsPage.diagnostics.${code}`,
        technicalDetail: message,
      });
    },
  );

  it("reads RPC-style error objects and preserves their original message", () => {
    const error = {
      code: -32000,
      message:
        "Send payment error: Failed to build route, PathFind error: no path found",
    };

    expect(diagnosePaymentError(error)).toMatchObject({
      code: "route_not_found",
      technicalDetail: error.message,
    });
  });

  it("classifies outbound capacity before the broader route failure", () => {
    expect(
      diagnosePaymentError(
        new Error(
          "Failed to build route: max outbound liquidity 0 is insufficient, required amount: 180000000",
        ),
      ),
    ).toMatchObject({
      code: "insufficient_outbound_capacity",
      recoverable: true,
    });
  });

  it("stringifies non-message errors without discarding the detail", () => {
    expect(diagnosePaymentError("worker unavailable")).toMatchObject({
      code: "unknown",
      technicalDetail: "worker unavailable",
    });
  });
});
